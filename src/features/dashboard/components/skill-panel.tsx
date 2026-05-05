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

function installedByLabel(by: string | null): string {
  if (!by) return 'Origen del install desconocido';
  if (/^agent/i.test(by)) return 'Instalado por SF Agent';
  if (/manual/i.test(by)) return 'Instalado manualmente';
  return `Instalado por: ${by}`;
}

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
          {skills.map((skill) => (
            <div
              key={skill.id}
              className="flex items-center justify-between p-3 bg-fluya-green/5 border border-fluya-green/20 rounded-xl"
              title={installedByLabel(skill.installedBy)}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-fluya-green shrink-0" />
                  <p className="text-sm font-medium text-white font-mono truncate">
                    {skill.skillName}
                  </p>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{formatRelative(skill.installedAt)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
