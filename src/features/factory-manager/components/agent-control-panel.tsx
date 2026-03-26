'use client';

import { useState } from 'react';
import { useAgentStatus } from '../hooks/use-agent-status';
import type { AgentCommandType } from '../types';

interface Props {
  projectPath: string;
}

const AVAILABLE_SKILLS = [
  { id: 'add-login', label: 'Auth (Login/Signup)' },
  { id: 'add-security', label: 'Seguridad Enterprise' },
  { id: 'add-payments', label: 'Pagos (Polar)' },
  { id: 'add-emails', label: 'Emails (Resend)' },
  { id: 'add-mobile', label: 'PWA + Push' },
  { id: 'website-3d', label: 'Landing Cinematica' },
  { id: 'ai', label: 'AI Engine' },
];

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

export function AgentControlPanel({ projectPath }: Props) {
  const agent = useAgentStatus();
  const isRunning = agent.activeCommand?.status === 'pending' || agent.activeCommand?.status === 'running';
  const [selectedSkill, setSelectedSkill] = useState('');
  const [showSkillPicker, setShowSkillPicker] = useState(false);

  function sendCommand(command: AgentCommandType) {
    const payload: Record<string, unknown> = {};
    if (command === 'apply-skill') {
      if (!selectedSkill) return;
      payload.skillId = selectedSkill;
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
              `\u2713 ${COMMAND_LABELS[agent.activeCommand.command]}`
            ) : agent.activeCommand.status === 'error' ? (
              `\u2717 ${COMMAND_LABELS[agent.activeCommand.command]}`
            ) : (
              `\u23F3 ${COMMAND_LABELS[agent.activeCommand.command]}`
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
              .replace(/,/g, ' \u00B7 ')
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
        <div className="space-y-2">
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
            <button
              type="button"
              disabled={isRunning}
              onClick={() => setShowSkillPicker(!showSkillPicker)}
              className={`px-3 py-1.5 text-xs border rounded-xl disabled:opacity-40 transition-all ${
                showSkillPicker
                  ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                  : 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border-blue-500/20'
              }`}
            >
              Aplicar Skill
            </button>
          </div>

          {/* Skill picker */}
          {showSkillPicker && (
            <div className="flex items-center gap-2 p-2 bg-white/5 rounded-xl border border-white/10">
              <select
                value={selectedSkill}
                onChange={(e) => setSelectedSkill(e.target.value)}
                className="flex-1 bg-transparent border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white appearance-none focus:outline-none focus:border-blue-500/50"
              >
                <option value="" className="bg-gray-900">Seleccionar skill...</option>
                {AVAILABLE_SKILLS.map((skill) => (
                  <option key={skill.id} value={skill.id} className="bg-gray-900">
                    {skill.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={isRunning || !selectedSkill}
                onClick={() => sendCommand('apply-skill')}
                className="px-3 py-1.5 text-xs bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/20 rounded-lg disabled:opacity-40 transition-all whitespace-nowrap"
              >
                {isRunning ? '...' : 'Aplicar'}
              </button>
            </div>
          )}
        </div>
      )}

      {agent.error && (
        <p className="mt-2 text-xs text-red-400">{agent.error}</p>
      )}
    </div>
  );
}
