'use server';

import { createClient } from '@/lib/supabase/server';

export interface ProjectSkillRow {
  id: string;
  projectId: string;
  skillName: string;
  /** ISO timestamp from `project_skills.installed_at`. Null for legacy rows
   *  that the SF Agent picked up via `pushInitialProjectSkills` without a
   *  recorded install time. */
  installedAt: string | null;
  /** Free-form label written by the SF Agent (e.g. "agent", "manual"). */
  installedBy: string | null;
  /** Hash of the local .claude/skills/<name>/ directory. Null when the skill
   *  is registered but missing from disk. */
  localHash: string | null;
  /** Hash of the same skill in `skills_catalog` at last Agent push. Null for
   *  custom skills not present in the catalog. */
  registryHash: string | null;
}

/**
 * Skills installed for a single project. Verifies project ownership server-side
 * (defense in depth — RLS on `project_skills` should already filter, but the
 * explicit ownership check guards against a misconfigured policy and short-
 * circuits the second query when the user doesn't own the project).
 */
export async function getProjectSkillsByProject(
  projectId: string,
): Promise<ProjectSkillRow[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!project) return [];

  const { data, error } = await supabase
    .from('project_skills')
    .select('id, project_id, skill_name, installed_at, installed_by, local_hash, registry_hash')
    .eq('project_id', projectId)
    .order('installed_at', { ascending: false, nullsFirst: false })
    .order('skill_name', { ascending: true });

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id as string,
    projectId: row.project_id as string,
    skillName: row.skill_name as string,
    installedAt: (row.installed_at as string | null) ?? null,
    installedBy: (row.installed_by as string | null) ?? null,
    localHash: (row.local_hash as string | null) ?? null,
    registryHash: (row.registry_hash as string | null) ?? null,
  }));
}

/**
 * Skills installed across every project owned by the current user, grouped by
 * `projectId`. Used by `<PortfolioGrid>` so the dashboard renders badges with
 * a single batched query instead of one query per project.
 *
 * Inner-join to `projects` so we explicitly scope by `user_id` rather than
 * trusting RLS alone.
 */
export async function getAllProjectSkills(): Promise<Record<string, ProjectSkillRow[]>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return {};

  const { data, error } = await supabase
    .from('project_skills')
    .select('id, project_id, skill_name, installed_at, installed_by, local_hash, registry_hash, projects!inner(user_id)')
    .eq('projects.user_id', user.id);

  if (error || !data) return {};

  const grouped: Record<string, ProjectSkillRow[]> = {};
  for (const row of data as Array<{
    id: string;
    project_id: string;
    skill_name: string;
    installed_at: string | null;
    installed_by: string | null;
    local_hash: string | null;
    registry_hash: string | null;
  }>) {
    const skill: ProjectSkillRow = {
      id: row.id,
      projectId: row.project_id,
      skillName: row.skill_name,
      installedAt: row.installed_at ?? null,
      installedBy: row.installed_by ?? null,
      localHash: row.local_hash ?? null,
      registryHash: row.registry_hash ?? null,
    };
    if (!grouped[skill.projectId]) grouped[skill.projectId] = [];
    grouped[skill.projectId].push(skill);
  }
  return grouped;
}
