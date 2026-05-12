// Server actions para invitar usuarios y cambiar roles. Solo founder.
// Usa Supabase admin (service_role) para crear usuarios (auth.admin.invite),
// loguea cada accion en audit_logs.

'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { requireRole, type UserRole } from './permissions';
import { logAudit } from './audit';
import { checkRateLimit, RATE_LIMITS } from './rate-limit';

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY no configurada');
  }
  return createClient(url, key);
}

export async function inviteUserAction(formData: FormData): Promise<{
  ok: boolean;
  error?: string;
  email?: string;
}> {
  await requireRole(['founder']);

  const okRate = await checkRateLimit({ action: 'invite_user', ...RATE_LIMITS.invite_user });
  if (!okRate) {
    return { ok: false, error: 'Demasiadas invitaciones en poco tiempo. Esperá un rato.' };
  }

  const email = (formData.get('email') as string | null)?.trim().toLowerCase();
  const role = formData.get('role') as UserRole | null;

  if (!email || !email.includes('@')) {
    return { ok: false, error: 'Email invalido' };
  }
  if (!role || !['operator', 'client'].includes(role)) {
    return { ok: false, error: 'Rol invalido (solo operator o client desde aca)' };
  }

  try {
    const admin = getAdminClient();

    // Invita por email usando Supabase auth.admin
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/auth/callback`,
    });

    if (error) {
      // Si ya existe el usuario, igual asignamos el rol
      if (error.message.toLowerCase().includes('already')) {
        const { data: existing } = await admin
          .from('profiles')
          .select('id')
          .eq('email', email)
          .maybeSingle();

        if (existing) {
          const { error: updateErr } = await admin
            .from('profiles')
            .update({ role })
            .eq('id', existing.id);

          if (updateErr) return { ok: false, error: updateErr.message };

          await logAudit({
            action: 'role_change',
            resource: 'profile',
            resourceId: existing.id,
            details: { email, new_role: role, method: 'existing_user_reassign' },
          });

          revalidatePath('/settings');
          return { ok: true, email };
        }
      }
      return { ok: false, error: error.message };
    }

    // Crear el profile con rol asignado
    if (data?.user) {
      await admin.from('profiles').upsert({
        id: data.user.id,
        email: data.user.email ?? email,
        role,
      }, { onConflict: 'id' });

      await logAudit({
        action: 'invite',
        resource: 'profile',
        resourceId: data.user.id,
        details: { email, role },
      });
    }

    revalidatePath('/settings');
    return { ok: true, email };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error invitando usuario';
    return { ok: false, error: msg };
  }
}

/**
 * Update own profile (full_name). Cualquier usuario puede actualizar el suyo.
 */
export async function updateProfileAction(formData: FormData): Promise<{
  ok: boolean;
  error?: string;
}> {
  const fullName = (formData.get('full_name') as string | null)?.trim() || null;

  try {
    const { createClient: createServerClient } = await import('@/lib/supabase/server');
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: 'No autenticado' };

    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName })
      .eq('id', user.id);

    if (error) return { ok: false, error: error.message };

    revalidatePath('/me');
    revalidatePath('/settings');
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error';
    return { ok: false, error: msg };
  }
}

export async function changeRoleAction(formData: FormData): Promise<{
  ok: boolean;
  error?: string;
}> {
  await requireRole(['founder']);

  const okRate = await checkRateLimit({ action: 'role_change', ...RATE_LIMITS.role_change });
  if (!okRate) {
    return { ok: false, error: 'Demasiados cambios de rol en poco tiempo. Esperá un rato.' };
  }

  const userId = formData.get('user_id') as string | null;
  const newRole = formData.get('new_role') as UserRole | null;

  if (!userId || !newRole) {
    return { ok: false, error: 'Faltan datos' };
  }
  if (!['founder', 'operator', 'client'].includes(newRole)) {
    return { ok: false, error: 'Rol invalido' };
  }

  try {
    const admin = getAdminClient();
    const { error } = await admin
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId);

    if (error) return { ok: false, error: error.message };

    await logAudit({
      action: 'role_change',
      resource: 'profile',
      resourceId: userId,
      details: { new_role: newRole },
    });

    revalidatePath('/settings');
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error';
    return { ok: false, error: msg };
  }
}
