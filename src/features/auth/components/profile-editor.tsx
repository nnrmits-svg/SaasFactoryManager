'use client';

import { useState, useTransition } from 'react';
import { updateProfileAction } from '@/features/auth/services/user-actions';
import type { UserRole } from '@/features/auth/services/permissions';

interface Props {
  initialFullName: string | null;
  email: string;
  role: UserRole;
}

const ROLE_LABEL: Record<UserRole, string> = {
  founder: '👑 Founder',
  operator: '🔧 Operador',
  client: '👤 Cliente',
};

export function ProfileEditor({ initialFullName, email, role }: Props) {
  const [fullName, setFullName] = useState(initialFullName ?? '');
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function onSubmit(formData: FormData) {
    setMsg(null);
    startTransition(async () => {
      const result = await updateProfileAction(formData);
      if (result.ok) setMsg({ ok: true, text: 'Perfil actualizado' });
      else setMsg({ ok: false, text: result.error ?? 'Error' });
    });
  }

  return (
    <form
      action={onSubmit}
      className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4"
    >
      <div>
        <label className="block text-xs text-gray-400 mb-1">Email</label>
        <input
          value={email}
          disabled
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-gray-500"
        />
      </div>

      <div>
        <label className="block text-xs text-gray-400 mb-1">Rol</label>
        <input
          value={ROLE_LABEL[role]}
          disabled
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-gray-500"
        />
        <p className="mt-1 text-xs text-gray-600">
          Los roles los maneja el founder desde /settings.
        </p>
      </div>

      <div>
        <label htmlFor="full_name" className="block text-xs text-gray-400 mb-1">
          Nombre completo
        </label>
        <input
          id="full_name"
          name="full_name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Como querés que te llamemos"
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-fluya-purple"
        />
      </div>

      <div className="flex items-center justify-between">
        <button
          type="submit"
          disabled={pending}
          className="px-4 py-2 bg-gradient-to-r from-fluya-purple to-fluya-blue text-white rounded-xl text-sm font-medium disabled:opacity-50 transition-all"
        >
          {pending ? 'Guardando...' : 'Guardar cambios'}
        </button>
        {msg && (
          <p className={`text-sm ${msg.ok ? 'text-fluya-green' : 'text-red-400'}`}>
            {msg.text}
          </p>
        )}
      </div>
    </form>
  );
}
