'use client';

import Link from 'next/link';
import type { ProjectDetail } from '@/features/factory-manager/services/project-detail-action';
import { openInIDE } from '@/features/factory-manager/services/open-action';
import { syncProjectGitData } from '@/features/factory-manager/services/git-sync-action';
import { useState } from 'react';
import { useTracking } from '@/features/factory-manager/hooks/use-tracking';
import { AgentControlPanel } from '@/features/factory-manager/components/agent-control-panel';
import { SkillPanel } from './skill-panel';
import { filesystemPath } from '@/features/factory-manager/types';

interface Props {
  detail: ProjectDetail;
}

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const month = MONTHS[d.getMonth()];
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  return `${day} ${month} ${year}, ${hours}:${mins}`;
}

function formatHours(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining > 0 ? `${hours}h ${remaining}m` : `${hours}h`;
}

export function ProjectDetailView({ detail }: Props) {
  const { project, commits, sessions } = detail;
  const [isSyncing, setIsSyncing] = useState(false);
  const fsPath = filesystemPath(project);
  // useTracking expects a non-empty string; pass empty when unavailable so it
  // short-circuits without firing /api/tracking against a placeholder.
  const tracking = useTracking(fsPath ?? '', project.id);

  async function handleSync() {
    if (!fsPath) return;
    setIsSyncing(true);
    try {
      await syncProjectGitData(fsPath);
      window.location.reload();
    } finally {
      setIsSyncing(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-6">
      {/* Header */}
      <div className="mb-8">
        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-white transition-colors mb-4 inline-block">
          &larr; Portfolio
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">{project.name}</h1>
            {fsPath ? (
              <p className="text-gray-500 text-sm mt-1 font-mono">{fsPath}</p>
            ) : (
              <p className="text-yellow-400/80 text-sm mt-1">
                Esperando que el agente cree el proyecto en disco...
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => fsPath && openInIDE(fsPath)}
              disabled={!fsPath}
              className="px-4 py-2 bg-fluya-purple/20 text-fluya-purple border border-fluya-purple/30 rounded-xl hover:bg-fluya-purple/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300"
            >
              Abrir en IDE
            </button>
            <button
              type="button"
              onClick={handleSync}
              disabled={isSyncing || !fsPath}
              className="px-4 py-2 bg-white/5 text-gray-300 border border-white/10 rounded-xl hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300"
            >
              {isSyncing ? 'Sync...' : 'Re-sync'}
            </button>
          </div>
        </div>
      </div>

      {/* Auto-Commit Tracking */}
      {fsPath && (
      <div className={`mb-6 p-4 rounded-2xl border transition-all duration-300 ${
        tracking.isTracking
          ? 'bg-fluya-green/5 border-fluya-green/30'
          : 'bg-white/5 border-white/10'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${
              tracking.isTracking ? 'bg-fluya-green animate-pulse' : 'bg-gray-600'
            }`} />
            <div>
              <p className="text-sm font-medium text-white">
                {tracking.isTracking ? 'Tracking activo' : 'Auto-Commit Tracking'}
              </p>
              <p className="text-xs text-gray-500">
                {tracking.isTracking
                  ? `${tracking.commitCount} auto-commit(s) desde que inicio`
                  : 'Detecta cambios y commitea automaticamente cada 30s'
                }
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={tracking.isLoading}
            onClick={tracking.isTracking ? tracking.stopTracking : tracking.startTracking}
            className={`px-4 py-2 text-sm font-medium rounded-xl transition-all duration-300 ${
              tracking.isTracking
                ? 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20'
                : 'bg-fluya-green/10 text-fluya-green border border-fluya-green/30 hover:bg-fluya-green/20'
            } disabled:opacity-40`}
          >
            {tracking.isLoading
              ? '...'
              : tracking.isTracking ? 'Stop' : 'Start Tracking'
            }
          </button>
        </div>
        {tracking.error && (
          <p className="mt-2 text-xs text-red-400">{tracking.error}</p>
        )}
      </div>
      )}

      {/* Agent Control */}
      {fsPath && (
        <div className="mb-6">
          <AgentControlPanel projectPath={fsPath} />
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Version SF', value: project.sfVersion ?? '-' },
          { label: 'Commits', value: (project.commitCount ?? 0).toString() },
          { label: 'Tiempo Total', value: formatHours(project.totalWorkMinutes ?? 0) },
          { label: 'Sesiones', value: sessions.length.toString() },
        ].map((stat) => (
          <div key={stat.label} className="p-4 bg-white/5 border border-white/10 rounded-2xl">
            <p className="text-xs text-gray-500 uppercase tracking-wider">{stat.label}</p>
            <p className="text-xl font-bold text-white mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Skills */}
      {fsPath && (
        <SkillPanel projectName={project.name} projectPath={fsPath} />
      )}

      {/* Work Sessions */}
      {sessions.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Sesiones de Trabajo</h2>
          <div className="space-y-2">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl"
              >
                <div>
                  <p className="text-sm text-white">{formatDate(session.startedAt)}</p>
                  <p className="text-xs text-gray-500">{session.commitCount} commits en esta sesion</p>
                </div>
                <p className="text-sm font-mono text-fluya-green">{formatHours(session.durationMinutes)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Commits Timeline */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">
          Commits ({project.commitCount ?? commits.length})
          {(project.commitCount ?? 0) > commits.length && (
            <span className="text-xs text-gray-500 font-normal ml-2">
              mostrando los {commits.length} mas recientes
            </span>
          )}
        </h2>
        {commits.length === 0 ? (
          <p className="text-gray-500 text-sm">No hay commits sincronizados. Usa &quot;Re-sync&quot; para cargar.</p>
        ) : (
          <div className="space-y-1">
            {commits.map((commit) => (
              <div
                key={commit.id}
                className="flex items-start gap-3 p-3 hover:bg-white/5 rounded-xl transition-colors"
              >
                <div className="mt-1.5 w-2 h-2 rounded-full bg-fluya-purple shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white truncate">{commit.message}</p>
                  <p className="text-xs text-gray-500">
                    <span className="font-mono text-gray-600">{commit.hash.slice(0, 7)}</span>
                    {' '}&bull;{' '}{commit.author}{' '}&bull;{' '}{formatDate(commit.committedAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
