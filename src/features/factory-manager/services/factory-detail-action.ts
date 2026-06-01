// Server action: detalle de un proyecto para la ventana [▸] del Factory.
// Resumen + Contributors (view project_contributors) + Historia (activity_log). Leader-only.

'use server';

import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/features/auth/services/permissions';

export interface ProjectSummary {
  id: string;
  name: string;
  project_type: string;
  lifecycle_status: string;
  status: string;
  owner_name: string | null;
  sf_version: string | null;
  has_database: boolean;
  has_auth: boolean;
  is_multi_tenant: boolean;
  deploys_to: string[];
}

export interface ContributorRow {
  user_id: string;
  full_name: string | null;
  email: string;
  current_role: string;
  roles_played: string[];
  total_activities: number;
  total_commits: number;
  last_summary: string | null;
  last_intervention: string | null;
  is_currently_assigned: boolean;
}

export interface ActivityRow {
  id: string;
  event_type: string;
  occurred_at: string;
  user_name: string | null;
}

export interface FactoryProjectDetail {
  summary: ProjectSummary;
  contributors: ContributorRow[];
  activity: ActivityRow[];
}

export async function getFactoryProjectDetail(id: string): Promise<FactoryProjectDetail | null> {
  await requireRole(['leader']);
  const supabase = await createClient();

  const { data: project } = await supabase
    .from('projects')
    .select('id, name, project_type, lifecycle_status, status, owner_user_id, sf_version, has_database, has_auth, is_multi_tenant, deploys_to')
    .eq('id', id)
    .maybeSingle();

  if (!project) return null;

  const [ownerRes, contribRes, activityRes, profilesRes] = await Promise.all([
    supabase.from('profiles').select('full_name, email').eq('id', project.owner_user_id as string).maybeSingle(),
    supabase.from('project_contributors').select('*').eq('project_id', id),
    supabase.from('project_activity_log').select('id, event_type, occurred_at, user_id').eq('project_id', id).order('occurred_at', { ascending: false }).limit(30),
    supabase.from('profiles').select('id, full_name, email'),
  ]);

  const profMap = new Map<string, { full_name: string | null; email: string }>(
    (profilesRes.data ?? []).map((p) => [p.id as string, { full_name: p.full_name as string | null, email: p.email as string }])
  );

  const contributors: ContributorRow[] = (contribRes.data ?? []).map((c) => ({
    user_id: c.user_id as string,
    full_name: (c.full_name as string | null) ?? null,
    email: c.email as string,
    current_role: (c.current_role as string) ?? '',
    roles_played: (c.roles_played as string[]) ?? [],
    total_activities: Number(c.total_activities ?? 0),
    total_commits: Number(c.total_commits ?? 0),
    last_summary: (c.last_summary as string | null) ?? null,
    last_intervention: (c.last_intervention as string | null) ?? null,
    is_currently_assigned: Boolean(c.is_currently_assigned),
  }));

  const activity: ActivityRow[] = (activityRes.data ?? []).map((a) => {
    const u = profMap.get(a.user_id as string);
    return {
      id: a.id as string,
      event_type: a.event_type as string,
      occurred_at: a.occurred_at as string,
      user_name: u?.full_name ?? u?.email ?? null,
    };
  });

  const owner = ownerRes.data;

  return {
    summary: {
      id: project.id as string,
      name: project.name as string,
      project_type: (project.project_type as string) ?? 'saas_full',
      lifecycle_status: (project.lifecycle_status as string) ?? 'active',
      status: (project.status as string) ?? 'active',
      owner_name: owner?.full_name ?? owner?.email ?? null,
      sf_version: (project.sf_version as string | null) ?? null,
      has_database: Boolean(project.has_database),
      has_auth: Boolean(project.has_auth),
      is_multi_tenant: Boolean(project.is_multi_tenant),
      deploys_to: (project.deploys_to as string[]) ?? [],
    },
    contributors,
    activity,
  };
}
