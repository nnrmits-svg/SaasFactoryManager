'use client';

import { useState, useTransition } from 'react';
import {
  setUserStatusAction,
  resendInviteAction,
  sendPasswordResetAction,
  deleteUserAction,
  changeRoleAction,
} from '@/features/auth/services/user-actions';
import type { UserRole } from '@/features/auth/services/permissions';
import type { UserStatus } from '@/features/auth/types';

interface Props {
  userId: string;
  email: string;
  fullName: string | null;
  currentRole: UserRole;
  status: UserStatus;
  isSelf: boolean;
}

const ROLE_OPTIONS: Array<{ value: UserRole; label: string }> = [
  { value: 'founder', label: 'Founder' },
  { value: 'operator', label: 'Operator' },
  { value: 'client', label: 'Client' },
];

const STATUS_BADGES: Record<UserStatus, { label: string; cls: string }> = {
  active: { label: 'Activo', cls: 'bg-fluya-green/10 text-fluya-green border-fluya-green/30' },
  suspended: { label: 'Suspendido', cls: 'bg-red-500/10 text-red-400 border-red-500/30' },
  pending: { label: 'Pendiente', cls: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' },
};

export function UserRowActions({ userId, email, fullName, currentRole, status, isSelf }: Props) {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function flash(ok: boolean, text: string) {
    setMsg({ ok, text });
    setTimeout(() => setMsg(null), 4000);
  }

  function onRoleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newRole = e.target.value as UserRole;
    if (newRole === currentRole) return;
    if (!confirm(`Cambiar rol a "${newRole}"?`)) {
      e.target.value = currentRole;
      return;
    }
    const fd = new FormData();
    fd.set('user_id', userId);
    fd.set('new_role', newRole);
    startTransition(async () => {
      const r = await changeRoleAction(fd);
      flash(r.ok, r.ok ? 'Rol actualizado' : (r.error ?? 'Error'));
      if (!r.ok) e.target.value = currentRole;
    });
  }

  function onToggleStatus() {
    const newStatus = status === 'suspended' ? 'active' : 'suspended';
    const verb = newStatus === 'suspended' ? 'suspender' : 'reactivar';
    if (!confirm(`¿${verb.charAt(0).toUpperCase() + verb.slice(1)} a ${email}?`)) return;
    const fd = new FormData();
    fd.set('user_id', userId);
    fd.set('status', newStatus);
    startTransition(async () => {
      const r = await setUserStatusAction(fd);
      flash(r.ok, r.ok ? `Usuario ${newStatus === 'suspended' ? 'suspendido' : 'reactivado'}` : (r.error ?? 'Error'));
    });
  }

  function onResendInvite() {
    if (!confirm(`Reenviar invitación a ${email}?`)) return;
    const fd = new FormData();
    fd.set('user_id', userId);
    startTransition(async () => {
      const r = await resendInviteAction(fd);
      flash(r.ok, r.ok ? 'Invitación reenviada' : (r.error ?? 'Error'));
    });
  }

  function onResetPassword() {
    if (!confirm(`Mandar email de reset de contraseña a ${email}?`)) return;
    const fd = new FormData();
    fd.set('user_id', userId);
    startTransition(async () => {
      const r = await sendPasswordResetAction(fd);
      flash(r.ok, r.ok ? `Email enviado a ${r.email}` : (r.error ?? 'Error'));
    });
  }

  function onDelete() {
    if (!confirm(`⚠️ BORRAR al usuario ${email} permanentemente? Esto no se puede deshacer.`)) return;
    if (!confirm(`Confirma una vez más — vas a perder acceso a todos los datos creados por ${email}`)) return;
    const fd = new FormData();
    fd.set('user_id', userId);
    startTransition(async () => {
      const r = await deleteUserAction(fd);
      flash(r.ok, r.ok ? 'Usuario borrado' : (r.error ?? 'Error'));
    });
  }

  return (
    <div className="flex flex-col gap-2 items-end min-w-fit">
      <div className="flex items-center gap-2">
        <span className={`px-2 py-0.5 rounded-full text-[10px] border ${STATUS_BADGES[status].cls}`}>
          {STATUS_BADGES[status].label}
        </span>

        {!isSelf && (
          <select
            defaultValue={currentRole}
            onChange={onRoleChange}
            disabled={pending}
            className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-xs text-white disabled:opacity-50 focus:outline-none focus:border-fluya-purple"
          >
            {ROLE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        )}
      </div>

      {!isSelf && (
        <div className="flex flex-wrap items-center gap-1 text-xs">
          {status === 'pending' && (
            <button
              onClick={onResendInvite}
              disabled={pending}
              className="px-2 py-1 text-fluya-blue hover:text-white hover:bg-fluya-blue/10 rounded transition-colors disabled:opacity-50"
              title="Reenviar email de invitación"
            >
              📧 Reenviar invite
            </button>
          )}
          {status !== 'pending' && (
            <button
              onClick={onResetPassword}
              disabled={pending}
              className="px-2 py-1 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors disabled:opacity-50"
              title="Mandar email de reset de contraseña"
            >
              🔑 Reset password
            </button>
          )}
          <button
            onClick={onToggleStatus}
            disabled={pending}
            className={`px-2 py-1 rounded transition-colors disabled:opacity-50 ${
              status === 'suspended'
                ? 'text-fluya-green hover:text-white hover:bg-fluya-green/10'
                : 'text-yellow-400 hover:text-white hover:bg-yellow-500/10'
            }`}
          >
            {status === 'suspended' ? '✅ Reactivar' : '⏸ Suspender'}
          </button>
          <button
            onClick={onDelete}
            disabled={pending}
            className="px-2 py-1 text-red-400 hover:text-white hover:bg-red-500/10 rounded transition-colors disabled:opacity-50"
          >
            🗑️ Borrar
          </button>
        </div>
      )}

      {isSelf && (
        <p className="text-xs text-gray-600 italic">— eres vos, edición en /me —</p>
      )}

      {msg && (
        <p className={`text-xs ${msg.ok ? 'text-fluya-green' : 'text-red-400'}`}>
          {msg.text}
        </p>
      )}
    </div>
  );
}
