'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import type { Project } from '@/features/factory-manager/types';

interface Props {
  projects: Project[];
}

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
            <StatusBadge status={project.status} />
          </div>

          {project.sfVersion && (
            <p className="text-xs text-fluya-purple/60 font-mono mb-3">SF {project.sfVersion}</p>
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
