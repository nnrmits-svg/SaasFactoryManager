'use client';

import { useState, useEffect } from 'react';
import { deleteArchivedProjects, getPortfolioProjects } from '@/features/factory-manager/services/git-sync-action';
import { getAgentInstances } from '@/features/factory-manager/services/agent-command-action';
import type { AgentInstance } from '@/features/factory-manager/types';

function formatHeartbeat(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `hace ${diff}s`;
  if (diff < 3600) return `hace ${Math.floor(diff / 60)}m`;
  return `hace ${Math.floor(diff / 3600)}h`;
}

export function SettingsPage() {
  const [archivedCount, setArchivedCount] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteResult, setDeleteResult] = useState<string | null>(null);

  const [agents, setAgents] = useState<AgentInstance[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(true);

  useEffect(() => {
    loadArchivedCount();
    loadAgents();
  }, []);

  async function loadArchivedCount() {
    const projects = await getPortfolioProjects();
    setArchivedCount(projects.filter((p) => p.status === 'archived').length);
  }

  async function loadAgents() {
    setLoadingAgents(true);
    const instances = await getAgentInstances();
    setAgents(instances);
    setLoadingAgents(false);
  }

  async function handleDeleteArchived() {
    setIsDeleting(true);
    setDeleteResult(null);
    try {
      const result = await deleteArchivedProjects();
      setDeleteResult(`${result.deleted} proyecto(s) eliminado(s)`);
      setArchivedCount(0);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-6">
      <h1 className="text-2xl font-bold text-white mb-1">Settings</h1>
      <p className="text-gray-400 mb-8">Configuracion global del Factory Manager.</p>

      {/* Agentes Conectados */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Agentes Conectados</h2>
          <button
            type="button"
            onClick={loadAgents}
            className="text-xs text-gray-500 hover:text-white transition-colors"
          >
            Actualizar
          </button>
        </div>
        {loadingAgents ? (
          <p className="text-gray-500 text-sm">Verificando agentes...</p>
        ) : agents.length === 0 ? (
          <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
            <p className="text-sm text-gray-400">Sin agentes detectados.</p>
            <p className="text-xs text-gray-600 mt-1">
              Instala SF Agent en tu Mac para conectar tu maquina local.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {agents.map((agent) => (
              <div
                key={agent.id}
                className={`p-4 rounded-2xl border transition-all ${
                  agent.status === 'active'
                    ? 'bg-blue-500/5 border-blue-500/20'
                    : 'bg-white/5 border-white/10'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                      agent.status === 'active' ? 'bg-blue-400 animate-pulse' : 'bg-gray-600'
                    }`} />
                    <div>
                      <p className="text-sm font-medium text-white">{agent.machineName}</p>
                      <p className="text-xs text-gray-500">
                        {agent.osType} · v{agent.agentVersion} · {formatHeartbeat(agent.lastHeartbeat)}
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-lg border ${
                    agent.status === 'active'
                      ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                      : 'bg-white/5 text-gray-500 border-white/10'
                  }`}>
                    {agent.status === 'active' ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Limpieza de Datos */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-4">Limpieza de Datos</h2>
        <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-300">Proyectos archivados</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {archivedCount > 0
                  ? `${archivedCount} proyecto(s) marcados como archivados. Borrarlos limpia commits y sesiones asociadas.`
                  : 'No hay proyectos archivados.'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleDeleteArchived}
              disabled={isDeleting || archivedCount === 0}
              className="px-4 py-2 text-sm bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl hover:bg-red-500/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300"
            >
              {isDeleting ? 'Borrando...' : 'Borrar Archivados'}
            </button>
          </div>
          {deleteResult && (
            <p className="mt-2 text-sm text-fluya-green">{deleteResult}</p>
          )}
        </div>
      </section>
    </div>
  );
}
