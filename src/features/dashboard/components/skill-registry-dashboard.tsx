'use client';

import { useState, useEffect, useRef } from 'react';
import {
  getSkillsCatalog,
  type CatalogSkill,
  type SkillSource,
} from '@/features/factory-manager/services/skills-catalog-action';
import { getPortfolioProjects } from '@/features/factory-manager/services/git-sync-action';
import { getAllProjectSkills } from '@/features/factory-manager/services/project-skills-action';
import { useAgentStatus } from '@/features/factory-manager/hooks/use-agent-status';
import type { Project } from '@/features/factory-manager/types';
import { filesystemPath } from '@/features/factory-manager/types';

const SOURCE_LABELS: Record<SkillSource, string> = {
  official: 'Skills oficiales (.claude/skills/)',
  catalog: 'Skills del catálogo (.claude/skills-catalog/)',
};

const SOURCE_COLORS: Record<SkillSource, string> = {
  official: 'text-fluya-purple',
  catalog: 'text-cyan-400',
};

export function SkillRegistryDashboard() {
  const [skills, setSkills] = useState<CatalogSkill[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [installedMap, setInstalledMap] = useState<Record<string, Set<string>>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);

  const [installing, setInstalling] = useState<{ skill: string; projectId: string } | null>(null);
  const [installResult, setInstallResult] = useState<
    { skill: string; success: boolean; error?: string } | null
  >(null);

  const agent = useAgentStatus();
  const agentInstallRef = useRef<{ skill: string; projectId: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getSkillsCatalog(), getPortfolioProjects(), getAllProjectSkills()])
      .then(([catalog, projs, grouped]) => {
        if (cancelled) return;
        setSkills(catalog);
        setProjects(projs);
        const map: Record<string, Set<string>> = {};
        for (const [pid, rows] of Object.entries(grouped)) {
          map[pid] = new Set(rows.map((r) => r.skillName));
        }
        setInstalledMap(map);
        setIsLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Watch agent command completion
  useEffect(() => {
    const target = agentInstallRef.current;
    if (!target) return;

    if (agent.activeCommand?.status === 'done') {
      setInstalling(null);
      setInstallResult({ skill: target.skill, success: true });
      setInstalledMap((prev) => {
        const next = { ...prev };
        const set = new Set(next[target.projectId] ?? []);
        set.add(target.skill);
        next[target.projectId] = set;
        return next;
      });
      agentInstallRef.current = null;
    } else if (agent.activeCommand?.status === 'error') {
      setInstalling(null);
      setInstallResult({
        skill: target.skill,
        success: false,
        error: String(agent.activeCommand.result?.error ?? 'Error del agente'),
      });
      agentInstallRef.current = null;
    }
  }, [agent.activeCommand?.status, agent.activeCommand?.result]);

  function handleInstall(skillName: string, project: Project) {
    setInstallResult(null);

    if (!agent.isAgentOnline) {
      setInstallResult({
        skill: skillName,
        success: false,
        error: 'El Agent del developer está offline; no se puede instalar el skill ahora.',
      });
      return;
    }

    const fsPath = filesystemPath(project);
    if (!fsPath) {
      setInstallResult({
        skill: skillName,
        success: false,
        error: 'El proyecto todavía no fue creado en disco por el Agent.',
      });
      return;
    }

    setInstalling({ skill: skillName, projectId: project.id });
    agentInstallRef.current = { skill: skillName, projectId: project.id };
    agent.sendCommand(
      'apply-skill',
      { skillId: skillName, projectPath: fsPath },
      agent.activeInstance?.id,
    );
  }

  const grouped = skills.reduce<Record<SkillSource, CatalogSkill[]>>((acc, s) => {
    if (!acc[s.source]) acc[s.source] = [];
    acc[s.source].push(s);
    return acc;
  }, { official: [], catalog: [] });

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-6">
        <p className="text-gray-500">Cargando skill registry...</p>
      </div>
    );
  }

  const selectedSkillData = skills.find((s) => s.skillName === selectedSkill) ?? null;

  return (
    <div className="max-w-6xl mx-auto px-6">
      {/* Header */}
      <div className="mb-8">
        {skills.length === 0 && (
          <div className="mb-4 p-3 rounded-xl border border-yellow-500/30 bg-yellow-500/5 text-xs text-yellow-300/90">
            ⚠ Sin skills registrados en las últimas 24h. El SF Agent pushea
            su catálogo al boot leyendo <code className="font-mono">.claude/skills/</code>{' '}
            y <code className="font-mono">.claude/skills-catalog/</code>. Si
            ningún Agent del usuario booteó recientemente, el catálogo aparece
            vacío hasta el próximo arranque.
          </div>
        )}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Skill Registry</h1>
            <p className="text-gray-400 mt-1">
              {skills.length} skill(s) en catálogo &bull; {projects.length} proyecto(s)
            </p>
          </div>
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs ${
              agent.isAgentOnline
                ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                : 'bg-white/5 border-white/10 text-gray-500'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                agent.isAgentOnline ? 'bg-blue-400 animate-pulse' : 'bg-gray-600'
              }`}
            />
            {agent.isAgentOnline
              ? `Agent: ${agent.activeInstance!.machineName}`
              : 'Agent offline'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Skills list */}
        <div className="lg:col-span-2 space-y-6">
          {(Object.entries(grouped) as Array<[SkillSource, CatalogSkill[]]>)
            .filter(([, list]) => list.length > 0)
            .map(([source, sourceSkills]) => (
              <div key={source}>
                <p
                  className={`text-xs font-medium uppercase tracking-wider mb-3 ${
                    SOURCE_COLORS[source] ?? 'text-gray-400'
                  }`}
                >
                  {SOURCE_LABELS[source] ?? source} ({sourceSkills.length})
                </p>
                <div className="space-y-2">
                  {sourceSkills.map((skill) => {
                    const isSelected = selectedSkill === skill.skillName;
                    const installedCount = projects.filter((p) =>
                      installedMap[p.id]?.has(skill.skillName),
                    ).length;
                    return (
                      <button
                        key={skill.id}
                        type="button"
                        onClick={() =>
                          setSelectedSkill((prev) =>
                            prev === skill.skillName ? null : skill.skillName,
                          )
                        }
                        className={`w-full text-left p-4 rounded-xl border transition-all duration-300 ${
                          isSelected
                            ? 'bg-fluya-purple/10 border-fluya-purple/30'
                            : 'bg-white/5 border-white/10 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-white font-mono truncate">
                              {skill.skillName}
                            </p>
                            {skill.description && (
                              <p className="text-xs text-gray-500 mt-0.5 truncate">
                                {skill.description}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {installedCount > 0 && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-fluya-green/10 text-fluya-green border border-fluya-green/20 rounded">
                                {installedCount} proyecto(s)
                              </span>
                            )}
                            {skill.hash && (
                              <span
                                className="text-[10px] text-gray-600 font-mono"
                                title={`Hash: ${skill.hash}`}
                              >
                                {skill.hash.slice(0, 7)}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
        </div>

        {/* Detail panel */}
        <div className="lg:col-span-1">
          <div className="sticky top-24">
            {selectedSkillData ? (
              <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-white/10">
                  <h3 className="text-sm font-semibold text-white font-mono">
                    {selectedSkillData.skillName}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {SOURCE_LABELS[selectedSkillData.source] ?? selectedSkillData.source}
                  </p>
                </div>
                {selectedSkillData.description && (
                  <div className="p-4 border-b border-white/10">
                    <p className="text-xs text-gray-300 leading-relaxed">
                      {selectedSkillData.description}
                    </p>
                  </div>
                )}
                <div className="p-4">
                  <p className="text-xs text-gray-400 mb-2">Instalar en proyecto:</p>
                  <div className="space-y-1">
                    {projects.map((project) => {
                      const isInstalled = installedMap[project.id]?.has(
                        selectedSkillData.skillName,
                      );
                      const fsPath = filesystemPath(project);
                      const canInstall = agent.isAgentOnline && fsPath !== null;
                      const isThisInstalling =
                        installing?.skill === selectedSkillData.skillName &&
                        installing?.projectId === project.id;
                      return (
                        <div key={project.id} className="flex items-center justify-between py-1.5">
                          <span className="text-xs text-white truncate">{project.name}</span>
                          {isInstalled ? (
                            <span className="text-[10px] px-2 py-0.5 bg-fluya-green/10 text-fluya-green rounded">
                              Instalado
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleInstall(selectedSkillData.skillName, project)}
                              disabled={!canInstall || isThisInstalling}
                              title={
                                !agent.isAgentOnline
                                  ? 'Agent offline'
                                  : !fsPath
                                    ? 'Proyecto no creado en disco aún'
                                    : undefined
                              }
                              className="text-[10px] px-2 py-0.5 bg-fluya-purple/10 text-fluya-purple border border-fluya-purple/20 rounded hover:bg-fluya-purple/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                            >
                              {isThisInstalling ? '...' : 'Instalar'}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {installResult && (
                    <p
                      className={`mt-2 text-xs ${
                        installResult.success ? 'text-fluya-green' : 'text-red-400'
                      }`}
                    >
                      {installResult.success
                        ? `"${installResult.skill}" instalado vía Agent`
                        : installResult.error}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
                <p className="text-sm text-gray-500">
                  Selecciona un skill para ver detalles e instalarlo en un proyecto
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
