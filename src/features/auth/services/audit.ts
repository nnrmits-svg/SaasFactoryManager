// Audit log helper. Persiste acciones criticas (cambios de rol, invitaciones,
// deletes, etc.) en audit_logs. RLS: solo founders ven los logs, cualquiera
// autenticado puede insertar (la accion ya esta autorizada por otras policies).

import 'server-only';
import { after } from 'next/server';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUserRole } from './permissions';

export interface AuditEntry {
  action: string;          // 'invite', 'role_change', 'delete', 'login', etc.
  resource: string;        // 'profile', 'project', 'auth', 'skill', etc.
  resourceId?: string;
  details?: Record<string, unknown>;
}

/**
 * Loguea una accion en audit_logs. Se ejecuta via after() para no bloquear
 * la respuesta. Errores se silencian (best-effort logging).
 */
export async function logAudit(entry: AuditEntry): Promise<void> {
  after(_logAuditNow(entry));
}

async function _logAuditNow(entry: AuditEntry): Promise<void> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const role = await getCurrentUserRole();
    const headersList = await headers();
    const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim();
    const ua = headersList.get('user-agent');

    const { error } = await supabase.from('audit_logs').insert({
      user_id: user.id,
      user_email: user.email,
      user_role: role,
      action: entry.action,
      resource: entry.resource,
      resource_id: entry.resourceId,
      details: entry.details ?? {},
      ip_address: ip || null,
      user_agent: ua,
    });

    if (error) {
      console.error('[audit] insert failed:', error.message);
    }
  } catch (err) {
    console.error('[audit] error:', err);
  }
}
