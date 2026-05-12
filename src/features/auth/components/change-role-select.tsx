'use client';

import { useTransition } from 'react';
import { changeRoleAction } from '@/features/auth/services/user-actions';
import type { UserRole } from '@/features/auth/services/permissions';

interface Props {
  userId: string;
  currentRole: UserRole;
}

export function ChangeRoleSelect({ userId, currentRole }: Props) {
  const [pending, startTransition] = useTransition();

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newRole = e.target.value as UserRole;
    if (newRole === currentRole) return;

    const ok = confirm(
      `Cambiar rol de este usuario a "${newRole}"? Esta accion queda registrada en audit logs.`
    );
    if (!ok) {
      e.target.value = currentRole;
      return;
    }

    const fd = new FormData();
    fd.set('user_id', userId);
    fd.set('new_role', newRole);
    startTransition(async () => {
      const result = await changeRoleAction(fd);
      if (!result.ok) {
        alert(`Error: ${result.error}`);
        e.target.value = currentRole;
      }
    });
  }

  return (
    <select
      defaultValue={currentRole}
      onChange={onChange}
      disabled={pending}
      className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-xs text-white disabled:opacity-50 focus:outline-none focus:border-fluya-purple"
    >
      <option value="founder">founder</option>
      <option value="operator">operator</option>
      <option value="client">client</option>
    </select>
  );
}
