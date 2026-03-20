'use server';

import { createClient } from '@/lib/supabase/server';
import type { Project, CommitInfo, WorkSession } from '../types';

export interface ProjectDetail {
  project: Project;
  commits: CommitInfo[];
  sessions: WorkSession[];
}

export async function getProjectDetail(name: string): Promise<ProjectDetail | null> {
  const supabase = await createClient();

  const { data: project, error } = await supabase
    .from('projects')
    .select('*')
    .eq('name', name)
    .single();

  if (error || !project) return null;

  const [commitsResult, sessionsResult] = await Promise.all([
    supabase
      .from('commits')
      .select('*')
      .eq('project_id', project.id)
      .order('committed_at', { ascending: false })
      .limit(100),
    supabase
      .from('work_sessions')
      .select('*')
      .eq('project_id', project.id)
      .order('started_at', { ascending: false }),
  ]);

  const commits: CommitInfo[] = (commitsResult.data ?? []).map((c) => ({
    id: c.id,
    projectId: c.project_id,
    hash: c.hash,
    message: c.message,
    author: c.author ?? '',
    committedAt: c.committed_at,
  }));

  const sessions: WorkSession[] = (sessionsResult.data ?? []).map((s) => ({
    id: s.id,
    projectId: s.project_id,
    startedAt: s.started_at,
    endedAt: s.ended_at,
    durationMinutes: s.duration_minutes,
    commitCount: s.commit_count,
  }));

  const totalWorkMinutes = sessions.reduce((sum, s) => sum + s.durationMinutes, 0);

  return {
    project: {
      id: project.id,
      name: project.name,
      path: project.path,
      sfVersion: project.sf_version,
      designSystem: project.design_system ?? 'fluya',
      status: project.status ?? 'active',
      description: project.description ?? null,
      repoUrl: project.repo_url ?? null,
      createdAt: project.created_at,
      updatedAt: project.updated_at,
      totalWorkMinutes,
      lastCommit: commits[0] ?? null,
      commitCount: commits.length,
    },
    commits,
    sessions,
  };
}
