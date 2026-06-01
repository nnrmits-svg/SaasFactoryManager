// Server action: Factory "Trabajando ahora" — proyectos + sesiones activas que
// el SF Agent v2 escribe en project_active_sessions. Leader-only (Sprint A).

'use server';

import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/features/auth/services/permissions';

export interface FactorySession {
  machine_name: string;
  status: string; // editing | synced | stale | conflict
  worker_name: string | null;
  last_activity_at: string | null;
}

export interface FactoryProject {
  id: string;
  name: string;
  project_type: string;
  lifecycle_status: string;
  status: string;
  owner_name: string | null;
  sessions: FactorySession[];
  contributor_count: number;
}

export async function listFactoryProjects(): Promise<FactoryProject[]> {
  await requireRole(['leader']);
  const supabase = await createClient();

  const [projectsRes, profilesRes, sessionsRes, agentsRes, contribsRes] = await Promise.all([
    supabase.from('projects').select('id, name, project_type, lifecycle_status, status, owner_user_id').order('name', { ascending: true }),
    supabase.from('profiles').select('id, full_name, email'),
    supabase.from('project_active_sessions').select('project_id, status, last_activity_at, user_id, agent_instance_id'),
    supabase.from('agent_instances').select('id, machine_name'),
    supabase.from('project_contributors').select('project_id, user_id'),
  ]);

  type Prof = { id: string; full_name: string | null; email: string };
  const profileMap = new Map<string, Prof>((profilesRes.data ?? []).map((p) => [p.id as string, p as Prof]));
  const agentMap = new Map<string, string>((agentsRes.data ?? []).map((a) => [a.id as string, a.machine_name as string]));

  const contribCount = new Map<string, number>();
  for (const c of contribsRes.data ?? []) {
    contribCount.set(c.project_id as string, (contribCount.get(c.project_id as string) ?? 0) + 1);
  }

  const sessionsByProject = new Map<string, FactorySession[]>();
  for (const s of sessionsRes.data ?? []) {
    const pid = s.project_id as string;
    const worker = profileMap.get(s.user_id as string);
    const arr = sessionsByProject.get(pid) ?? [];
    arr.push({
      machine_name: agentMap.get(s.agent_instance_id as string) ?? '(agente)',
      status: s.status as string,
      worker_name: worker?.full_name ?? worker?.email ?? null,
      last_activity_at: (s.last_activity_at as string | null) ?? null,
    });
    sessionsByProject.set(pid, arr);
  }

  return (projectsRes.data ?? []).map((p) => {
    const owner = profileMap.get(p.owner_user_id as string);
    return {
      id: p.id as string,
      name: p.name as string,
      project_type: (p.project_type as string) ?? 'saas_full',
      lifecycle_status: (p.lifecycle_status as string) ?? 'active',
      status: (p.status as string) ?? 'active',
      owner_name: owner?.full_name ?? owner?.email ?? null,
      sessions: sessionsByProject.get(p.id as string) ?? [],
      contributor_count: contribCount.get(p.id as string) ?? 0,
    };
  });
}
