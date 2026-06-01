'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { FactoryProjectDetail } from '@/features/factory-manager/services/factory-detail-action';

type Tab = 'resumen' | 'contributors' | 'historia' | 'config';

function fmt(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function ProjectDetailCard({ detail }: { detail: FactoryProjectDetail }) {
  const { summary, contributors, activity } = detail;
  const [tab, setTab] = useState<Tab>('resumen');

  return (
    <div className="space-y-6">
      <Link href="/leader/proyectos" className="text-sm text-gray-400 hover:text-white transition-colors">← Volver al Factory</Link>

      <div>
        <h1 className="text-2xl font-semibold text-white">{summary.name}</h1>
        <p className="text-sm text-gray-400 mt-1">
          {summary.project_type} · {summary.lifecycle_status} · owner {summary.owner_name ?? '—'}
        </p>
      </div>

      <div className="flex gap-1 border-b border-white/10 flex-wrap">
        {([['resumen', 'Resumen'], ['contributors', `Contributors (${contributors.length})`], ['historia', 'Historia'], ['config', 'Configuración']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm transition-colors border-b-2 -mb-px ${tab === key ? 'border-fluya-purple text-white' : 'border-transparent text-gray-500 hover:text-white'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'resumen' && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 grid grid-cols-2 gap-3 text-sm">
          <Field label="Tipo" value={summary.project_type} />
          <Field label="Lifecycle" value={summary.lifecycle_status} />
          <Field label="Estado" value={summary.status} />
          <Field label="SF version" value={summary.sf_version ?? '—'} />
          <Field label="Base de datos" value={summary.has_database ? 'sí' : 'no'} />
          <Field label="Auth" value={summary.has_auth ? 'sí' : 'no'} />
          <Field label="Multi-tenant" value={summary.is_multi_tenant ? 'sí' : 'no'} />
          <Field label="Deploys a" value={summary.deploys_to.join(', ') || '—'} />
        </div>
      )}

      {tab === 'contributors' && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          {contributors.length === 0 ? (
            <p className="text-sm text-gray-600 italic">— sin contributors registrados todavía —</p>
          ) : (
            <ul className="space-y-3">
              {contributors.map((c) => (
                <li key={c.user_id} className="py-2 px-3 bg-white/5 rounded-xl">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-white">
                      {c.full_name || c.email}
                      <span className="text-xs text-gray-500"> · {c.current_role}{c.is_currently_assigned ? ' · ● activo' : ''}</span>
                    </span>
                    <span className="text-xs text-gray-500">{c.total_commits} commits · {c.total_activities} acciones · {fmt(c.last_intervention)}</span>
                  </div>
                  {c.last_summary && <p className="text-xs text-gray-400 mt-1 italic">&ldquo;{c.last_summary}&rdquo;</p>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === 'historia' && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          {activity.length === 0 ? (
            <p className="text-sm text-gray-600 italic">— sin actividad registrada (el SF Agent la reporta cuando trabajás) —</p>
          ) : (
            <ul className="space-y-2">
              {activity.map((a) => (
                <li key={a.id} className="flex items-center justify-between py-2 px-3 bg-white/5 rounded-xl text-sm">
                  <span className="text-white">{a.event_type} <span className="text-xs text-gray-500">· {a.user_name ?? '—'}</span></span>
                  <span className="text-xs text-gray-500">{fmt(a.occurred_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === 'config' && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
          <p className="text-sm text-gray-400">Owner: {summary.owner_name ?? '—'}</p>
          <div className="flex gap-2">
            {(['Transferir', 'Cambiar tipo', 'Archivar'] as const).map((label) => (
              <button key={label} disabled title="Disponible próximamente" className="px-3 py-1.5 text-xs rounded-lg border border-white/10 text-gray-500 cursor-not-allowed opacity-60">{label}</button>
            ))}
          </div>
          <p className="text-xs text-gray-600 italic">Deployments: sin deployments registrados (el Agent los reporta tras `vercel link` — Sprint D).</p>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-white">{value}</p>
    </div>
  );
}
