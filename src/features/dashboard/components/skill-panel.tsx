'use client';

import { useState, useEffect, useRef } from 'react';
import {
  getApplicableSkills,
  getProjectSkills,
  type SkillInfo,
} from '@/features/factory-manager/services/skill-catalog-action';
import { useAgentStatus } from '@/features/factory-manager/hooks/use-agent-status';
import Link from 'next/link';

interface Props {
  projectName: string;
  projectPath: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  ui: 'UI / Design',
  auth: 'Autenticacion',
  backend: 'Backend',
  frontend: 'Frontend',
  feature: 'Features',
  ai: 'Inteligencia Artificial',
};

const CATEGORY_COLORS: Record<string, string> = {
  ui: 'text-pink-400',
  auth: 'text-yellow-400',
  backend: 'text-blue-400',
  frontend: 'text-cyan-400',
  feature: 'text-fluya-green',
  ai: 'text-fluya-purple',
};

export function SkillPanel({ projectName, projectPath }: Props) {
  const [skills, setSkills] = useState<SkillInfo[]>([]);
  const [installedSkills, setInstalledSkills] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [installing, setInstalling] = useState<string | null>(null);
  const [installMsg, setInstallMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Agent integration
  const agent = useAgentStatus();
  const agentInstallRef = useRef<string | null>(null);

  useEffect(() => {
    async function load() {
      const [allSkills, projSkills] = await Promise.all([
        getApplicableSkills(),
        getProjectSkills(projectPath),
      ]);
      setSkills(allSkills);
      setInstalledSkills(projSkills);
      setIsLoading(false);
    }
    load();
  }, [projectPath]);

  // Watch agent command completion
  useEffect(() => {
    const skillName = agentInstallRef.current;
    if (!skillName) return;

    if (agent.activeCommand?.status === 'done') {
      setInstalling(null);
      setInstalledSkills((prev) => [...prev, skillName]);
      setInstallMsg({ ok: true, text: `"${skillName}" instalado via Agent` });
      agentInstallRef.current = null;
    } else if (agent.activeCommand?.status === 'error') {
      setInstalling(null);
      setInstallMsg({ ok: false, text: String(agent.activeCommand.result?.error ?? 'Error del agente') });
      agentInstallRef.current = null;
    }
  }, [agent.activeCommand?.status, agent.activeCommand?.result]);

  async function handleInstall(skillName: string) {
    setInstallMsg(null);

    if (!agent.isAgentOnline) {
      setInstallMsg({
        ok: false,
        text: 'El Agent del developer está offline; no se puede instalar el skill ahora.',
      });
      return;
    }

    setInstalling(skillName);
    agentInstallRef.current = skillName;
    agent.sendCommand('apply-skill', { skillId: skillName, projectPath }, agent.activeInstance?.id);
  }

  if (isLoading) {
    return (
      <div className="mb-8 p-5 bg-white/5 border border-white/10 rounded-2xl">
        <p className="text-sm text-gray-500">Cargando skills...</p>
      </div>
    );
  }

  const grouped = skills.reduce<Record<string, SkillInfo[]>>((acc, skill) => {
    const cat = skill.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(skill);
    return acc;
  }, {});

  const installedCount = skills.filter((s) => installedSkills.includes(s.name)).length;

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Skills</h2>
          <p className="text-xs text-gray-500">
            {installedCount}/{skills.length} instalados &bull;{' '}
            <Link href="/skills" className="text-fluya-purple hover:underline">
              Ver Registry
            </Link>
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {Object.entries(grouped).map(([category, categorySkills]) => (
          <div key={category}>
            <p className={`text-xs font-medium uppercase tracking-wider mb-2 ${CATEGORY_COLORS[category] ?? 'text-gray-400'}`}>
              {CATEGORY_LABELS[category] ?? category}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {categorySkills.map((skill) => {
                const isInstalled = installedSkills.includes(skill.name);
                const isInstalling = installing === skill.name;

                return (
                  <div
                    key={skill.name}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-300 ${
                      isInstalled
                        ? 'bg-fluya-green/5 border-fluya-green/20'
                        : 'bg-white/5 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        {isInstalled && (
                          <span className="w-1.5 h-1.5 rounded-full bg-fluya-green shrink-0" />
                        )}
                        <p className="text-sm font-medium text-white">{skill.label}</p>
                      </div>
                      <p className="text-xs text-gray-500 truncate">{skill.description}</p>
                    </div>
                    <div className="ml-2 shrink-0">
                      {isInstalled ? (
                        <span className="px-2 py-1 text-[10px] bg-fluya-green/10 text-fluya-green rounded-lg">
                          Instalado
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleInstall(skill.name)}
                          disabled={isInstalling || !agent.isAgentOnline}
                          title={!agent.isAgentOnline ? 'Agent del developer offline' : undefined}
                          className="px-2 py-1 text-[10px] bg-fluya-purple/10 text-fluya-purple border border-fluya-purple/20 rounded-lg hover:bg-fluya-purple/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        >
                          {isInstalling ? '...' : 'Instalar'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {installMsg && (
        <p className={`mt-3 text-xs ${installMsg.ok ? 'text-fluya-green' : 'text-red-400'}`}>
          {installMsg.text}
        </p>
      )}
    </div>
  );
}
