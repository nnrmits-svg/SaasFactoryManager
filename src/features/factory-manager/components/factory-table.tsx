'use client';

import Link from 'next/link';
import type { FactoryProject, FactorySession } from '@/features/factory-manager/services/factory-sessions-action';

// Colores de badge por tipo de proyecto (spec PROJECT-TYPES §6.1)
const TYPE_BADGE: Record<string, string> = {
  saas_full: '🟢', web_app_simple: '🟢', internal_tool: '🟠', mobile_app: '🟠',
  api_only: '🔵', cli_tool: '🔵', library: '🟣',
  landing_static: '🟡', marketing_site: '🟡', prototype: '🔴', other: '⚪',
};

function formatMinutes(minutes: number): string {
  if (minutes <= 0) return '0h';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString();
}

// Color de la sesión VIVA según su estado. Las sesiones no-vivas se pintan
// grises aparte (no entran acá).
function liveDot(status: string): string {
  switch (status) {
    case 'stale': return '🟡';
    case 'conflict': return '🔴';
    default: return '🟢'; // editing / synced
  }
}

function timeAgo(iso: string | null): string {
  if (!iso) return 'nunca';
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

const IPV4_RE = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;

// Las filas viejas (v1.2.0) reportaban la IP como machine_name. Mostramos un
// label legible y dejamos la IP en el tooltip. Además limpiamos el sufijo .local.
function cleanMachineName(name: string): { label: string; title?: string } {
  if (IPV4_RE.test(name)) return { label: 'máquina sin nombre', title: name };
  return { label: name.replace(/\.local$/, '') };
}

function WorkingNow({ sessions }: { sessions: FactorySession[] }) {
  if (sessions.length === 0) {
    return <span className="text-gray-600">⚪ sin sesión</span>;
  }
  // El service ya ordena live primero, luego last_activity_at desc → top es la
  // sesión viva si existe, sino la última que trabajó.
  const top = sessions[0];
  const machine = cleanMachineName(top.machine_name);
  const liveCount = sessions.filter((s) => s.is_live).length;

  if (top.is_live) {
    return (
      <span className="text-gray-200">
        {liveDot(top.status)} {top.worker_name ?? '—'} @ <span title={machine.title}>{machine.label}</span>
        {liveCount > 1 && <span className="text-gray-500 text-xs"> +{liveCount - 1}</span>}
      </span>
    );
  }

  // Ninguna sesión viva: mostramos apagada para conservar "quién trabajó por última vez".
  return (
    <span className="text-gray-500">
      ⚪ {top.worker_name ?? '—'} @ <span title={machine.title}>{machine.label}</span>
      <span className="text-gray-600 text-xs"> · visto hace {timeAgo(top.last_activity_at)}</span>
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
              <th className="px-4 py-3 font-medium">Versión</th>
              <th className="px-4 py-3 font-medium">Trabajando ahora</th>
              <th className="px-4 py-3 font-medium text-right whitespace-nowrap">Actividad</th>
              <th className="px-4 py-3 font-medium text-right">👥</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                <td className="px-4 py-3">
                  <div className="text-white font-medium">{p.name}</div>
                  <div className="text-[11px] text-gray-500">creado {formatDate(p.created_at)}</div>
                </td>
                <td className="px-4 py-3 text-gray-300 text-xs">{TYPE_BADGE[p.project_type] ?? '⚪'} {p.project_type}</td>
                <td className="px-4 py-3 text-gray-300">{p.owner_name ?? '—'}</td>
                <td className="px-4 py-3">
                  {p.sf_version
                    ? <span className="px-2 py-0.5 text-xs bg-fluya-purple/10 text-fluya-purple border border-fluya-purple/20 rounded-lg whitespace-nowrap">{p.sf_version}</span>
                    : <span className="text-gray-600 text-xs">—</span>}
                </td>
                <td className="px-4 py-3"><WorkingNow sessions={p.sessions} /></td>
                <td className="px-4 py-3 text-right text-xs text-gray-300 whitespace-nowrap">
                  <span title="Commits">⎇ {p.commit_count}</span>
                  <span className="text-gray-600"> · </span>
                  <span title="Horas trabajadas">⏱ {formatMinutes(p.total_work_minutes)}</span>
                </td>
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
