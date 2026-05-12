'use client';

import { useState, useTransition } from 'react';
import { createClient } from '@/lib/supabase/client';

export function ChangePasswordForm() {
  const [newPwd, setNewPwd] = useState('');
  const [confirm, setConfirm] = useState('');
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    if (newPwd.length < 8) {
      setMsg({ ok: false, text: 'Mínimo 8 caracteres' });
      return;
    }
    if (newPwd !== confirm) {
      setMsg({ ok: false, text: 'Las contraseñas no coinciden' });
      return;
    }

    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: newPwd });
      if (error) {
        setMsg({ ok: false, text: error.message });
      } else {
        setMsg({ ok: true, text: 'Contraseña actualizada' });
        setNewPwd('');
        setConfirm('');
      }
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3"
    >
      <h3 className="text-base font-medium text-white">Cambiar contraseña</h3>
      <div>
        <input
          type="password"
          placeholder="Nueva contraseña (mín 8)"
          value={newPwd}
          onChange={(e) => setNewPwd(e.target.value)}
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-fluya-purple"
        />
      </div>
      <div>
        <input
          type="password"
          placeholder="Repetir nueva contraseña"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-fluya-purple"
        />
      </div>
      <div className="flex items-center justify-between">
        <button
          type="submit"
          disabled={pending || !newPwd || !confirm}
          className="px-4 py-2 bg-white/5 text-white border border-white/10 rounded-xl text-sm font-medium hover:bg-white/10 disabled:opacity-50 transition-all"
        >
          {pending ? 'Cambiando...' : 'Cambiar contraseña'}
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
