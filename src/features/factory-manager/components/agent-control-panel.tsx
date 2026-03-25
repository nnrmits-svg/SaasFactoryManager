'use client';

import { useAgentStatus } from '../hooks/use-agent-status';
import type { AgentCommandType } from '../types';

interface Props {
  projectPath: string;
  skillId?: string;
}

const COMMAND_LABELS: Record<AgentCommandType, string> = {
  scan: 'Escanear',
  sync: 'Sincronizar',
  'apply-skill': 'Aplicar Skill',
  'push-projects': 'Subir a Cloud',
};

const STATUS_COLORS = {
  pending: 'text-yellow-400',
  running: 'text-blue-400',
  done: 'text-green-400',
  error: 'text-red-400',
};

function formatHeartbeat(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `hace ${diff}s`;
  if (diff < 3600) return `hace ${Math.floor(diff / 60)}m`;
  return `hace ${Math.floor(diff / 3600)}h`;
}

export function AgentControlPanel({ projectPath, skillId }: Props) {
  const agent = useAgentStatus();
  const isRunning = agent.activeCommand?.status === 'pending' || agent.activeCommand?.status === 'running';

  function sendCommand(command: AgentCommandType) {
    const payload: Record<string, unknown> = {};
    if (command === 'sync') payload.providerId = undefined; // all providers
    if (command === 'apply-skill') {
      if (!skillId) return;
      payload.skillId = skillId;
      payload.projectPath = projectPath;
    }
    agent.sendCommand(command, payload, agent.activeInstance?.id);
  }

  return (
    <div className={`p-4 rounded-2xl border transition-all duration-300 ${
      agent.isAgentOnline
        ? 'bg-blue-500/5 border-blue-500/20'
        : 'bg-white/5 border-white/10'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
            agent.loading ? 'bg-gray-600 animate-pulse' :
            agent.isAgentOnline ? 'bg-blue-400 animate-pulse' :
            'bg-gray-600'
          }`} />
          <div>
            <p className="text-sm font-medium text-white">
              {agent.isAgentOnline
                ? `Agent · ${agent.activeInstance!.machineName}`
                : 'SF Agent Desktop'}
            </p>
            <p className="text-xs text-gray-500">
              {agent.loading
                ? 'Verificando...'
                : agent.isAgentOnline
                  ? `v${agent.activeInstance!.agentVersion} · ${formatHeartbeat(agent.activeInstance!.lastHeartbeat)}`
                  : 'Sin agente detectado — instala SF Agent en tu Mac'}
            </p>
          </div>
        </div>

        {/* Command status badge */}
        {agent.activeCommand && (
          <span className={`text-xs font-mono px-2 py-0.5 rounded-lg bg-white/5 ${STATUS_COLORS[agent.activeCommand.status]}`}>
            {agent.activeCommand.status === 'running' ? (
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse inline-block" />
                {COMMAND_LABELS[agent.activeCommand.command]}
              </span>
            ) : agent.activeCommand.status === 'done' ? (
              `✓ ${COMMAND_LABELS[agent.activeCommand.command]}`
            ) : agent.activeCommand.status === 'error' ? (
              `✗ ${COMMAND_LABELS[agent.activeCommand.command]}`
            ) : (
              `⏳ ${COMMAND_LABELS[agent.activeCommand.command]}`
            )}
          </span>
        )}
      </div>

      {/* Command result */}
      {agent.activeCommand?.status === 'done' && agent.activeCommand.result && (
        <div className="mb-3 p-2 rounded-lg bg-green-500/10 border border-green-500/20">
          <p className="text-xs text-green-400 font-mono">
            {JSON.stringify(agent.activeCommand.result, null, 0)
              .replace(/[{}"]/g, '')
              .replace(/,/g, ' · ')
              .slice(0, 120)}
          </p>
        </div>
      )}
      {agent.activeCommand?.status === 'error' && (
        <div className="mb-3 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
          <p className="text-xs text-red-400">
            {String(agent.activeCommand.result?.error ?? 'Error desconocido')}
          </p>
        </div>
      )}

      {/* Action buttons */}
      {agent.isAgentOnline && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={isRunning}
            onClick={() => sendCommand('scan')}
            className="px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 rounded-xl disabled:opacity-40 transition-all"
          >
            Escanear
          </button>
          <button
            type="button"
            disabled={isRunning}
            onClick={() => sendCommand('push-projects')}
            className="px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 rounded-xl disabled:opacity-40 transition-all"
          >
            Subir a Cloud
          </button>
          <button
            type="button"
            disabled={isRunning}
            onClick={() => sendCommand('sync')}
            className="px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 rounded-xl disabled:opacity-40 transition-all"
          >
            Sync iCloud
          </button>
          {skillId && (
            <button
              type="button"
              disabled={isRunning}
              onClick={() => sendCommand('apply-skill')}
              className="px-3 py-1.5 text-xs bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded-xl disabled:opacity-40 transition-all"
            >
              Aplicar {skillId}
            </button>
          )}
        </div>
      )}

      {agent.error && (
        <p className="mt-2 text-xs text-red-400">{agent.error}</p>
      )}
    </div>
  );
}
