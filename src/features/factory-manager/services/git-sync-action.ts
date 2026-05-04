'use server';

import { createClient } from '@/lib/supabase/server';
import { GitService } from './git-service';
import { ScannerService } from './scanner-service';
import type { Project } from '../types';

export interface GitSyncResult {
  success: boolean;
  projectId?: string;
  commitsAdded: number;
  sessionsCalculated: number;
  error?: string;
}

/**
 * Syncs a scanned project into Supabase: upserts the project record,
 * syncs git commits, and recalculates work sessions.
 */
export async function syncProjectGitData(
  projectPath: string,
): Promise<GitSyncResult> {
  try {
    const supabase = await createClient();
    // Try scanner first, fallback to manual detection
    let scanned = await ScannerService.scanSingle(projectPath);
    if (!scanned) {
      scanned = await ScannerService.scanManual(projectPath);
    }

    if (!scanned) {
      return { success: false, commitsAdded: 0, sessionsCalculated: 0, error: 'No es un proyecto valido (sin package.json).' };
    }

    // 1. Upsert project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .upsert(
        {
          name: scanned.name,
          path: scanned.path,
          sf_version: scanned.version,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'name' },
      )
      .select('id')
      .single();

    if (projectError || !project) {
      return { success: false, commitsAdded: 0, sessionsCalculated: 0, error: projectError?.message ?? 'Failed to upsert project.' };
    }

    const projectId = project.id;

    // 2. Read git commits from filesystem
    const rawCommits = GitService.readCommits(projectPath);

    if (rawCommits.length === 0) {
      return { success: true, projectId, commitsAdded: 0, sessionsCalculated: 0 };
    }

    // 3. Upsert commits (ignore duplicates via unique constraint)
    const commitRows = rawCommits.map((c) => ({
      project_id: projectId,
      hash: c.hash,
      message: c.message,
      author: c.author,
      committed_at: c.date,
    }));

    const { data: inserted, error: commitError } = await supabase
      .from('commits')
      .upsert(commitRows, { onConflict: 'project_id,hash', ignoreDuplicates: true })
      .select('committed_at');

    if (commitError) {
      return { success: false, projectId, commitsAdded: 0, sessionsCalculated: 0, error: commitError.message };
    }

    // 4. Recalculate work sessions (delete old, insert fresh)
    const { data: allCommits } = await supabase
      .from('commits')
      .select('committed_at, message')
      .eq('project_id', projectId)
      .order('committed_at', { ascending: true });

    await supabase.from('work_sessions').delete().eq('project_id', projectId);

    const sessions = GitService.calculateSessions(
      projectId,
      (allCommits ?? []).map((c) => ({ committedAt: c.committed_at, message: c.message })),
    );

    if (sessions.length > 0) {
      const sessionRows = sessions.map((s) => ({
        project_id: s.projectId,
        started_at: s.startedAt,
        ended_at: s.endedAt,
        duration_minutes: s.durationMinutes,
        commit_count: s.commitCount,
      }));

      await supabase.from('work_sessions').insert(sessionRows);
    }

    return {
      success: true,
      projectId,
      commitsAdded: inserted?.length ?? 0,
      sessionsCalculated: sessions.length,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error during git sync.';
    return { success: false, commitsAdded: 0, sessionsCalculated: 0, error: message };
  }
}

/**
 * Syncs ALL scanned projects at once. Used by the portfolio dashboard.
 * Also detects projects deleted from disk and archives them.
 */
export async function syncAllProjects(rootDir: string): Promise<{
  synced: number;
  archived: number;
  errors: string[];
}> {
  const result = await ScannerService.scan({ rootDir, maxDepth: 2 });
  let synced = 0;
  const errors: string[] = [];

  // Sync projects that exist on disk
  const scannedNames = new Set(result.projects.map((p) => p.name));

  for (const project of result.projects) {
    const syncResult = await syncProjectGitData(project.path);
    if (syncResult.success) {
      synced++;
    } else {
      errors.push(`${project.name}: ${syncResult.error}`);
    }
  }

  // Archive projects in DB that no longer exist on disk
  const supabase = await createClient();
  const { data: dbProjects } = await supabase
    .from('projects')
    .select('id, name, status')
    .neq('status', 'archived');

  let archived = 0;
  if (dbProjects) {
    for (const dbProject of dbProjects) {
      if (!scannedNames.has(dbProject.name)) {
        await supabase
          .from('projects')
          .update({ status: 'archived', updated_at: new Date().toISOString() })
          .eq('id', dbProject.id);
        archived++;
      }
    }
  }

  return { synced, archived, errors };
}

/**
 * Fetches all projects with aggregated data for the portfolio dashboard.
 */
export async function getPortfolioProjects(): Promise<Project[]> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: projects, error } = await supabase
    .from('projects')
    .select(`
      *,
      commits(hash, message, author, committed_at),
      work_sessions(duration_minutes)
    `)
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });

  if (error || !projects) return [];

  return projects.map((p) => {
    const commits = (p.commits as Array<{ hash: string; message: string; author: string; committed_at: string }>) ?? [];
    const sessions = (p.work_sessions as Array<{ duration_minutes: number }>) ?? [];

    // Sort commits to find the latest
    const sortedCommits = [...commits].sort(
      (a, b) => new Date(b.committed_at).getTime() - new Date(a.committed_at).getTime(),
    );

    const lastCommit = sortedCommits[0]
      ? {
          id: '',
          projectId: p.id,
          hash: sortedCommits[0].hash,
          message: sortedCommits[0].message,
          author: sortedCommits[0].author,
          committedAt: sortedCommits[0].committed_at,
        }
      : null;

    const totalWorkMinutes = sessions.reduce((sum, s) => sum + s.duration_minutes, 0);

    return {
      id: p.id,
      name: p.name,
      path: p.path,
      localPath: (p as Record<string, unknown>).local_path as string | null ?? null,
      sfVersion: p.sf_version,
      designSystem: p.design_system ?? 'fluya',
      status: p.status ?? 'active',
      description: (p as Record<string, unknown>).description as string | null ?? null,
      repoUrl: (p as Record<string, unknown>).repo_url as string | null ?? null,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      totalWorkMinutes,
      lastCommit,
      commitCount: commits.length,
    };
  });
}

/**
 * Deletes all archived projects and their related commits/work_sessions (cascade).
 */
export async function deleteArchivedProjects(): Promise<{ deleted: number }> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('projects')
    .select('id')
    .eq('status', 'archived');

  if (!data || data.length === 0) return { deleted: 0 };

  const ids = data.map((p) => p.id);
  await supabase.from('projects').delete().in('id', ids);

  return { deleted: ids.length };
}

/**
 * Deletes a single project by ID and its related data (cascade).
 */
export async function deleteProject(projectId: string): Promise<{ success: boolean }> {
  const supabase = await createClient();
  const { error } = await supabase.from('projects').delete().eq('id', projectId);
  return { success: !error };
}

/**
 * Manually registers a project by path. Validates it exists and syncs git data.
 */
export async function registerProject(
  projectPath: string,
): Promise<{ success: boolean; error?: string }> {
  if (!projectPath?.trim()) {
    return { success: false, error: 'Path vacio' };
  }

  const scanned = await ScannerService.scanManual(projectPath.trim());
  if (!scanned) {
    return { success: false, error: 'No es un directorio valido o no tiene package.json' };
  }

  const result = await syncProjectGitData(scanned.path);
  if (!result.success) {
    return { success: false, error: result.error };
  }

  return { success: true };
}
