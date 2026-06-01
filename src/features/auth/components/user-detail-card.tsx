'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { UserDetail } from '@/features/auth/services/user-detail-action';
import { ROLE_LABELS } from '@/shared/types/roles';

const STATUS_LABEL: Record<UserDetail['profile']['status'], string> = {
  active: '🟢 Activo',
  suspended: '🟡 Suspendido',
  pending: '🟡 Pendiente',
  deactivated: '🔴 Desactivado',
};

type Tab = 'asignados' | 'historial';

function fmt(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export function UserDetailCard({ detail }: { detail: UserDetail }) {
  const { profile, assignments, audit } = detail;
  const [tab, setTab] = useState<Tab>('asignados');

  return (
    <div className="space-y-6">
      <Link href="/leader/usuarios" className="text-sm text-gray-400 hover:text-white transition-colors">
        ← Volver a usuarios
      </Link>

      {/* Cabecera de perfil */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold text-white">{profile.full_name || profile.email}</h1>
            <p className="text-sm text-gray-400 mt-1">
              {profile.email} · {ROLE_LABELS[profile.role] ?? profile.role} · {STATUS_LABEL[profile.status] ?? profile.status}
            </p>
            <p className="text-xs text-gray-600 mt-2">
              Creado {fmt(profile.created_at)} · Último login {fmt(profile.last_login_at)}
              {profile.hourly_rate_usd != null && ` · $${profile.hourly_rate_usd}/h`}
            </p>
          </div>

          {/* Acciones (deshabilitadas — implementación real pendiente) */}
          <div className="flex flex-wrap gap-2">
            {(['Cambiar rol', 'Suspender', 'Desactivar'] as const).map((label) => (
              <button
                key={label}
                disabled
                title="Disponible próximamente"
                className="px-3 py-1.5 text-xs rounded-lg border border-white/10 text-gray-500 cursor-not-allowed opacity-60"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/10">
        {([['asignados', 'Proyectos asignados'], ['historial', 'Historial']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm transition-colors border-b-2 -mb-px ${
              tab === key
                ? 'border-fluya-purple text-white'
                : 'border-transparent text-gray-500 hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Contenido del tab */}
      {tab === 'asignados' && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          {assignments.length === 0 ? (
            <p className="text-sm text-gray-600 italic">— sin proyectos asignados —</p>
          ) : (
            <ul className="space-y-2">
              {assignments.map((a) => (
                <li key={a.project_id} className="flex items-center justify-between py-2 px-3 bg-white/5 rounded-xl">
                  <span className="text-sm text-white">{a.project_name}</span>
                  <span className="text-xs text-gray-500">{a.role_in_project} · desde {fmt(a.assigned_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === 'historial' && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          {audit.length === 0 ? (
            <p className="text-sm text-gray-600 italic">— sin actividad registrada —</p>
          ) : (
            <ul className="space-y-2">
              {audit.map((row) => (
                <li key={row.id} className="flex items-center justify-between py-2 px-3 bg-white/5 rounded-xl text-sm">
                  <span className="text-white">{row.action}</span>
                  <span className="text-xs text-gray-500">{fmt(row.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
