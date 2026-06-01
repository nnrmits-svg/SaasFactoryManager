'use client';

import Link from 'next/link';
import type { FactoryProject, FactorySession } from '@/features/factory-manager/services/factory-sessions-action';

// Colores de badge por tipo de proyecto (spec PROJECT-TYPES §6.1)
const TYPE_BADGE: Record<string, string> = {
  saas_full: '🟢', web_app_simple: '🟢', internal_tool: '🟠', mobile_app: '🟠',
  api_only: '🔵', cli_tool: '🔵', library: '🟣',
  landing_static: '🟡', marketing_site: '🟡', prototype: '🔴', other: '⚪',
};

function sessionDot(status: string): string {
  switch (status) {
    case 'editing': return '🟢';
    case 'synced': return '🟢';
    case 'stale': return '🟡';
    case 'conflict': return '🔴';
    default: return '⚪';
  }
}

function WorkingNow({ sessions }: { sessions: FactorySession[] }) {
  if (sessions.length === 0) {
    return <span className="text-gray-600">⚪ sin sesión</span>;
  }
  // Mostrar la sesión más relevante (editing primero) + contador si hay más
  const sorted = [...sessions].sort((a, b) => (a.status === 'editing' ? -1 : 0) - (b.status === 'editing' ? -1 : 0));
  const top = sorted[0];
  return (
    <span className="text-gray-200">
      {sessionDot(top.status)} {top.worker_name ?? '—'} @ {top.machine_name}
      {sessions.length > 1 && <span className="text-gray-500 text-xs"> +{sessions.length - 1}</span>}
    </span>
  );
}

function LifecycleSection({ title, projects }: { title: string; projects: FactoryProject[] }) {
  if (projects.length === 0) return null;
  return (
    <div className="space-y-2">
      <h2 className="text-xs uppercase tracking-wide text-gray-500 font-medium">{title} ({projects.length})</h2>
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-xs text-gray-400">
              <th className="px-4 py-3 font-medium">Proyecto</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Owner</th>
              <th className="px-4 py-3 font-medium">Trabajando ahora</th>
              <th className="px-4 py-3 font-medium text-right">👥</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                <td className="px-4 py-3 text-white font-medium">{p.name}</td>
                <td className="px-4 py-3 text-gray-300 text-xs">{TYPE_BADGE[p.project_type] ?? '⚪'} {p.project_type}</td>
                <td className="px-4 py-3 text-gray-300">{p.owner_name ?? '—'}</td>
                <td className="px-4 py-3"><WorkingNow sessions={p.sessions} /></td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/leader/proyectos/${p.id}`}
                    className="px-2 py-1 text-fluya-purple hover:text-white hover:bg-fluya-purple/20 rounded-lg transition-colors text-xs whitespace-nowrap"
                  >
                    👥 {p.contributor_count} ▸
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function FactoryTable({ projects }: { projects: FactoryProject[] }) {
  // Sprint A: separamos por lifecycle. "EN PRODUCCIÓN" = active/paused/completed.
  // PIPELINE (preproject) = anteproyectos (placeholder, Sprint B los llena).
  const produccion = projects.filter((p) => p.lifecycle_status !== 'preproject' && p.lifecycle_status !== 'archived');
  const pipeline = projects.filter((p) => p.lifecycle_status === 'preproject');
  const archived = projects.filter((p) => p.lifecycle_status === 'archived');

  return (
    <div className="space-y-8">
      <LifecycleSection title="En producción" projects={produccion} />
      {pipeline.length > 0
        ? <LifecycleSection title="Pipeline (anteproyectos)" projects={pipeline} />
        : (
          <div className="space-y-2">
            <h2 className="text-xs uppercase tracking-wide text-gray-500 font-medium">Pipeline (anteproyectos)</h2>
            <p className="text-sm text-gray-600 italic px-1">— sin anteproyectos todavía (Sprint B) —</p>
          </div>
        )}
      <LifecycleSection title="Archivados" projects={archived} />
    </div>
  );
}
