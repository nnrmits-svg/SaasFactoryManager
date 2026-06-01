// Permissions helper — roles del Manager: leader / dev / comercial / cliente.
//
// Modelo (Sprint A — renombrado desde founder/operator/client):
//   leader   → acceso total, asigna roles, borra proyectos, cambia pricing
//   dev      → desarrolla proyectos asignados, sincroniza skills, tracking — no destructivo
//   comercial→ vende proyectos, ve sus ventas, crea anteproyectos (Sprint B)
//   cliente  → ve SOLO sus proyectos, lectura + interactuar
//
// El backing store es profiles.role en Supabase. Las funciones SECURITY DEFINER
// (current_user_role, is_leader, is_leader_or_dev) hacen el enforcement
// a nivel BD via RLS. Estos helpers son para checks en el lado del servidor
// (server actions, route handlers, server components).

import { createClient } from '@/lib/supabase/server';

export type UserRole = 'leader' | 'dev' | 'comercial' | 'cliente';

/**
 * Devuelve el rol del usuario actual. null si no hay sesion.
 */
export async function getCurrentUserRole(): Promise<UserRole | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  return (profile?.role as UserRole | undefined) ?? null;
}

/**
 * True si el usuario es leader.
 */
export async function isLeader(): Promise<boolean> {
  return (await getCurrentUserRole()) === 'leader';
}

/**
 * True si el usuario es leader o dev.
 */
export async function isLeaderOrDev(): Promise<boolean> {
  const role = await getCurrentUserRole();
  return role === 'leader' || role === 'dev';
}

/**
 * Throws si el usuario no tiene uno de los roles permitidos.
 * Usar en server actions criticas: await requireRole(['leader']).
 */
export async function requireRole(allowed: UserRole[]): Promise<void> {
  const role = await getCurrentUserRole();
  if (!role || !allowed.includes(role)) {
    throw new Error(
      `Insufficient permissions. Required: ${allowed.join('|')}, got: ${role ?? 'anonymous'}`
    );
  }
}

/**
 * Capacidades de cada rol — fuente de verdad para la UI (que mostrar/ocultar).
 * El enforcement real esta en RLS, esto es solo para UX.
 */
export const ROLE_CAPABILITIES: Record<UserRole, {
  label: string;
  description: string;
  canDeleteProjects: boolean;
  canChangePricing: boolean;
  canInviteUsers: boolean;
  canViewAllProjects: boolean;
  canSyncProjects: boolean;
  canCreateProjects: boolean;
}> = {
  leader: {
    label: 'Líder',
    description: 'Acceso total. Dueno de la fabrica.',
    canDeleteProjects: true,
    canChangePricing: true,
    canInviteUsers: true,
    canViewAllProjects: true,
    canSyncProjects: true,
    canCreateProjects: true,
  },
  dev: {
    label: 'Desarrollador',
    description: 'Desarrolla proyectos asignados. Sincroniza skills, levanta tracking, no destructivo.',
    canDeleteProjects: false,
    canChangePricing: false,
    canInviteUsers: false,
    canViewAllProjects: true,
    canSyncProjects: true,
    canCreateProjects: false,
  },
  comercial: {
    label: 'Comercial',
    description: 'Vende proyectos, aporta info de discovery, crea anteproyectos.',
    canDeleteProjects: false,
    canChangePricing: false,
    canInviteUsers: false,
    canViewAllProjects: false,
    canSyncProjects: false,
    canCreateProjects: false,
  },
  cliente: {
    label: 'Cliente',
    description: 'Ve solo su proyecto. Lectura + interactuar con su producto.',
    canDeleteProjects: false,
    canChangePricing: false,
    canInviteUsers: false,
    canViewAllProjects: false,
    canSyncProjects: false,
    canCreateProjects: false,
  },
};
