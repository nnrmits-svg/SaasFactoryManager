'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  getProjectSkillsByProject,
  type ProjectSkillRow,
} from '@/features/factory-manager/services/project-skills-action';

interface Props {
  projectId: string;
}

function formatRelative(iso: string | null): string {
  if (!iso) return '—';
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 0) return 'recién';
  const min = Math.floor(ms / 60_000);
  if (min < 1) return 'recién';
  if (min < 60) return `Hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `Hace ${h}h`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'Ayer';
  if (d < 7) return `Hace ${d} días`;
  if (d < 30) return `Hace ${Math.floor(d / 7)} sem`;
  if (d < 365) return `Hace ${Math.floor(d / 30)} mes(es)`;
  return `Hace ${Math.floor(d / 365)} año(s)`;
}

function installedByLabel(by: string | null): string | null {
  if (!by) return null;
  // 'seed' is legacy data from a pre-Agent seed run — hide the tooltip so the
  // panel doesn't show a meaningless origin. Real Agent rows write 'agent'.
  if (by === 'seed') return null;
  if (by === 'agent') return 'Instalado por SF Agent';
  if (by === 'manual') return 'Instalado manualmente';
  return `Instalado por: ${by}`;
}

type SyncState = 'synced' | 'divergent' | 'external' | 'missing' | 'pending';

function computeSyncState(local: string | null, registry: string | null): SyncState {
  if (local === null && registry === null) return 'pending';
  if (local === null) return 'missing';
  if (registry === null) return 'external';
  return local === registry ? 'synced' : 'divergent';
}

interface StateStyle {
  tooltip: string;
  dot: string;
  border: string;
  bg: string;
}

const STATE_STYLES: Record<SyncState, StateStyle> = {
  synced: {
    tooltip: 'Sincronizado con catálogo',
    dot: 'bg-fluya-green',
    border: 'border-fluya-green/20',
    bg: 'bg-fluya-green/5',
  },
  divergent: {
    tooltip: 'Difiere del catálogo',
    dot: 'bg-amber-400',
    border: 'border-amber-400/30',
    bg: 'bg-amber-400/5',
  },
  external: {
    tooltip: 'Skill custom',
    dot: 'bg-gray-400',
    border: 'border-gray-400/20',
    bg: 'bg-gray-400/5',
  },
  missing: {
    tooltip: 'Falta el skill',
    dot: 'bg-red-500',
    border: 'border-red-500/30',
    bg: 'bg-red-500/5',
  },
  pending: {
    tooltip: 'Estado pendiente — el Agent aún no pusheó hashes para este skill',
    dot: 'bg-gray-600',
    border: 'border-white/10',
    bg: 'bg-white/[0.02]',
  },
};

/**
 * Lists the skills installed in this project. Reads from `project_skills`
 * (populated by the SF Agent watcher), Vercel-friendly. The applicable-skill
 * catalog and install flow live in `<SkillRegistryDashboard>` — this panel is
 * read-only by design.
 */
export function SkillPanel({ projectId }: Props) {
  const [skills, setSkills] = useState<ProjectSkillRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getProjectSkillsByProject(projectId)
      .then((data) => {
        if (cancelled) return;
        setSkills(data);
        setIsLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  if (isLoading) {
    return (
      <div className="mb-8 p-5 bg-white/5 border border-white/10 rounded-2xl">
        <p className="text-sm text-gray-500">Cargando skills...</p>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Skills instalados</h2>
          <p className="text-xs text-gray-500">
            {skills.length === 0 ? 'Sin skills' : `${skills.length} skill(s)`} &bull;{' '}
            <Link href="/skills" className="text-fluya-purple hover:underline">
              Ver Registry
            </Link>
          </p>
        </div>
      </div>

      {skills.length === 0 ? (
        <div className="p-6 bg-white/5 border border-white/10 rounded-2xl text-center">
          <p className="text-sm text-gray-400">Este proyecto no tiene skills instalados todavía.</p>
          <p className="text-xs text-gray-500 mt-1">
            Aplicalos desde el{' '}
            <Link href="/skills" className="text-fluya-purple hover:underline">
              Skill Registry
            </Link>{' '}
            (requiere SF Agent online).
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {skills.map((skill) => {
            const byLabel = installedByLabel(skill.installedBy);
            const state = computeSyncState(skill.localHash, skill.registryHash);
            const style = STATE_STYLES[state];
            const tooltip = byLabel ? `${style.tooltip} · ${byLabel}` : style.tooltip;
            return (
            <div
              key={skill.id}
              className={`flex items-center justify-between p-3 ${style.bg} border ${style.border} rounded-xl`}
              title={tooltip}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${style.dot} shrink-0`} />
                  <p className="text-sm font-medium text-white font-mono truncate">
                    {skill.skillName}
                  </p>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{formatRelative(skill.installedAt)}</p>
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
