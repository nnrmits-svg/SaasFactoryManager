// Server action: detalle de un usuario para /leader/usuarios/[id]. Leader-only.

'use server';

import { createClient } from '@/lib/supabase/server';
import { requireRole, type UserRole } from './permissions';

export interface UserDetailProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  status: 'active' | 'suspended' | 'pending' | 'deactivated';
  last_login_at: string | null;
  hourly_rate_usd: number | null;
  created_at: string;
  invited_by: string | null;
}

export interface AssignmentRow {
  project_id: string;
  project_name: string;
  role_in_project: string;
  assigned_at: string;
}

export interface AuditRow {
  id: string;
  action: string;
  actor_id: string | null;
  created_at: string;
}

export interface UserDetail {
  profile: UserDetailProfile;
  assignments: AssignmentRow[];
  audit: AuditRow[];
}

export async function getUserDetailAction(id: string): Promise<UserDetail | null> {
  await requireRole(['leader']);
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, status, last_login_at, hourly_rate_usd, created_at, invited_by')
    .eq('id', id)
    .maybeSingle();

  if (!profile) return null;

  // Proyectos asignados (tabla creada en mig 001b; hoy vacía hasta que se asignen)
  const { data: rawAssignments } = await supabase
    .from('project_assignments')
    .select('project_id, role_in_project, assigned_at, project:projects(name)')
    .eq('user_id', id)
    .order('assigned_at', { ascending: false });

  const assignments: AssignmentRow[] = (rawAssignments ?? []).map((a) => {
    const proj = a.project as { name: string } | { name: string }[] | null;
    const name = Array.isArray(proj) ? proj[0]?.name : proj?.name;
    return {
      project_id: a.project_id as string,
      project_name: name ?? '(sin nombre)',
      role_in_project: a.role_in_project as string,
      assigned_at: a.assigned_at as string,
    };
  });

  // Audit log (view user_audit_log sobre audit_logs; mig 002).
  // Nota: la view filtra resource='user' — vacía hasta que las acciones del ABM
  // logueen con ese resource (hoy el código viejo usa resource='profile').
  const { data: rawAudit } = await supabase
    .from('user_audit_log')
    .select('id, action, actor_id, created_at')
    .eq('user_id', id)
    .order('created_at', { ascending: false })
    .limit(20);

  const audit: AuditRow[] = (rawAudit ?? []) as AuditRow[];

  return {
    profile: profile as UserDetailProfile,
    assignments,
    audit,
  };
}
