'use client';

import { useState, useTransition } from 'react';
import { inviteUserAction } from '@/features/auth/services/user-actions';

export function InviteUserForm() {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function onSubmit(formData: FormData) {
    setMsg(null);
    startTransition(async () => {
      const result = await inviteUserAction(formData);
      if (result.ok) {
        setMsg({ ok: true, text: `Invitacion enviada a ${result.email}` });
      } else {
        setMsg({ ok: false, text: result.error ?? 'Error desconocido' });
      }
    });
  }

  return (
    <form action={onSubmit} className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
      <h3 className="text-base font-medium text-white">Invitar usuario</h3>
      <p className="text-xs text-gray-500">
        Mandamos un email con link de invitacion. El usuario crea su clave al primer login.
      </p>
      <div className="flex gap-2">
        <input
          name="email"
          type="email"
          required
          placeholder="email@ejemplo.com"
          className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-fluya-purple"
        />
        <select
          name="role"
          required
          defaultValue="operator"
          className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-fluya-purple"
        >
          <option value="operator">Operador</option>
          <option value="client">Cliente</option>
        </select>
        <button
          type="submit"
          disabled={pending}
          className="px-4 py-2 bg-gradient-to-r from-fluya-purple to-fluya-blue text-white rounded-xl text-sm font-medium disabled:opacity-50 transition-all"
        >
          {pending ? 'Invitando...' : 'Invitar'}
        </button>
      </div>
      {msg && (
        <p className={`text-sm ${msg.ok ? 'text-fluya-green' : 'text-red-400'}`}>
          {msg.text}
        </p>
      )}
    </form>
  );
}
