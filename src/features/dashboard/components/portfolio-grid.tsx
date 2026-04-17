'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import type { Project } from '@/features/factory-manager/types';
import { getProjectSkills } from '@/features/factory-manager/services/skill-catalog-action';

interface Props {
  projects: Project[];
}

/** Badge colors per skill category */
const SKILL_BADGE_COLORS: Record<string, string> = {
  'add-login': 'bg-yellow-500/20 text-yellow-400',
  'add-payments': 'bg-blue-500/20 text-blue-400',
  'add-emails': 'bg-blue-500/20 text-blue-400',
  'add-mobile': 'bg-cyan-500/20 text-cyan-400',
  'add-subscriptions': 'bg-emerald-500/20 text-emerald-400',
  'add-alerts': 'bg-emerald-500/20 text-emerald-400',
  'add-admin': 'bg-emerald-500/20 text-emerald-400',
  'add-security': 'bg-yellow-500/20 text-yellow-400',
  'apply-design-system': 'bg-pink-500/20 text-pink-400',
  'website-3d': 'bg-pink-500/20 text-pink-400',
  'ai': 'bg-purple-500/20 text-purple-400',
  'image-generation': 'bg-purple-500/20 text-purple-400',
  'agent-performance': 'bg-purple-500/20 text-purple-400',
};
const DEFAULT_BADGE = 'bg-gray-500/20 text-gray-400';

/** Paths of projects currently being tracked (auto-commit) */
function useActiveTracking() {
  const [activePaths, setActivePaths] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function fetchActive() {
      try {
        const res = await fetch('/api/tracking');
        const data = await res.json();
        const paths = new Set<string>((data.active ?? []).map((a: { projectPath: string }) => a.projectPath));
        setActivePaths(paths);
      } catch {
        // Silently ignore
      }
    }
    fetchActive();
    const interval = setInterval(fetchActive, 15_000);
    return () => clearInterval(interval);
  }, []);

  return activePaths;
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: 'bg-fluya-green/10 text-fluya-green border-fluya-green/30',
    paused: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    archived: 'bg-white/5 text-gray-400 border-white/10',
  };

  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded-lg border ${styles[status] ?? styles.archived}`}>
      {status}
    </span>
  );
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 30) return `${Math.floor(diffDays / 30)} mes(es)`;
  if (diffDays > 0) return `${diffDays}d`;
  if (diffHours > 0) return `${diffHours}h`;
  return `${diffMins}m`;
}

function formatHours(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining > 0 ? `${hours}h ${remaining}m` : `${hours}h`;
}

export function PortfolioGrid({ projects }: Props) {
  const activePaths = useActiveTracking();
  const [projectSkillsMap, setProjectSkillsMap] = useState<Record<string, string[]>>({});

  // Load installed skills for each project
  useEffect(() => {
    async function loadSkills() {
      const map: Record<string, string[]> = {};
      await Promise.all(
        projects.map(async (p) => {
          const skills = await getProjectSkills(p.path);
          map[p.id] = skills;
        }),
      );
      setProjectSkillsMap(map);
    }
    if (projects.length > 0) loadSkills();
  }, [projects]);

  if (projects.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500">
        <p className="text-lg mb-2">No hay proyectos sincronizados</p>
        <p className="text-sm">Usa el boton &quot;Sincronizar Proyectos&quot; para escanear tu directorio.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {projects.map((project) => {
        const isTracking = activePaths.has(project.path);
        const installedSkills = projectSkillsMap[project.id] ?? [];

        return (
        <Link
          key={project.id}
          href={`/project/${encodeURIComponent(project.name)}`}
          className={`block p-5 border rounded-2xl hover:-translate-y-0.5 transition-all duration-300 group ${
            isTracking
              ? 'bg-fluya-green/5 border-fluya-green/20 hover:border-fluya-green/40'
              : 'bg-white/5 border-white/10 hover:border-fluya-purple/30'
          }`}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2 min-w-0 mr-2">
              {isTracking && (
                <div className="w-2 h-2 rounded-full bg-fluya-green animate-pulse shrink-0" />
              )}
              <h3 className="text-white font-semibold group-hover:text-fluya-purple transition-colors truncate">
                {project.name}
              </h3>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {project.sfVersion && (
                <span className="px-1.5 py-0.5 text-[10px] font-mono bg-fluya-purple/10 text-fluya-purple border border-fluya-purple/20 rounded">
                  SF {project.sfVersion}
                </span>
              )}
              <StatusBadge status={project.status} />
            </div>
          </div>

          {/* Installed Skills badges */}
          {installedSkills.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {installedSkills.map((skill) => (
                <span
                  key={skill}
                  className={`px-1.5 py-0.5 text-[10px] rounded ${SKILL_BADGE_COLORS[skill] ?? DEFAULT_BADGE}`}
                >
                  {skill}
                </span>
              ))}
            </div>
          )}

          {project.lastCommit && (
            <div className="mb-3">
              <p className="text-sm text-gray-300 truncate">{project.lastCommit.message}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {formatTimeAgo(project.lastCommit.committedAt)} por {project.lastCommit.author}
              </p>
            </div>
          )}

          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>{project.commitCount ?? 0} commits</span>
            <span>{formatHours(project.totalWorkMinutes ?? 0)} trabajado</span>
          </div>
        </Link>
        );
      })}
    </div>
  );
}
