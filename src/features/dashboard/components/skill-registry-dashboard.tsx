'use client';

import { useState, useEffect, useRef } from 'react';
import {
  discoverAllSkills,
  getSkillContent,
  getProjectSkills,
  type SkillInfo,
} from '@/features/factory-manager/services/skill-catalog-action';
import { getPortfolioProjects } from '@/features/factory-manager/services/git-sync-action';
import { useAgentStatus } from '@/features/factory-manager/hooks/use-agent-status';
import type { Project } from '@/features/factory-manager/types';

const CATEGORY_LABELS: Record<string, string> = {
  ui: 'UI / Design',
  auth: 'Autenticacion',
  backend: 'Backend',
  frontend: 'Frontend',
  feature: 'Features',
  ai: 'Inteligencia Artificial',
  other: 'Otros',
  meta: 'Proceso / Meta',
};

const CATEGORY_COLORS: Record<string, string> = {
  ui: 'text-pink-400 border-pink-400/20',
  auth: 'text-yellow-400 border-yellow-400/20',
  backend: 'text-blue-400 border-blue-400/20',
  frontend: 'text-cyan-400 border-cyan-400/20',
  feature: 'text-fluya-green border-fluya-green/20',
  ai: 'text-fluya-purple border-fluya-purple/20',
  other: 'text-gray-400 border-gray-400/20',
  meta: 'text-gray-500 border-gray-500/20',
};

type TabFilter = 'injectable' | 'all';

export function SkillRegistryDashboard() {
  const [skills, setSkills] = useState<SkillInfo[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tab, setTab] = useState<TabFilter>('injectable');
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const [skillContent, setSkillContent] = useState<string | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);

  // Install state
  const [installing, setInstalling] = useState(false);
  const [installResult, setInstallResult] = useState<{ skill: string; success: boolean; error?: string } | null>(null);

  // Agent integration
  const agent = useAgentStatus();
  const agentInstallRef = useRef<{ skill: string; projectId: string; projectPath: string } | null>(null);

  // Project skills cache
  const [projectSkillsMap, setProjectSkillsMap] = useState<Record<string, string[]>>({});

  useEffect(() => {
    async function load() {
      const [allSkills, allProjects] = await Promise.all([
        discoverAllSkills(),
        getPortfolioProjects(),
      ]);
      setSkills(allSkills);
      setProjects(allProjects);

      // Load skills for each project
      const skillsMap: Record<string, string[]> = {};
      await Promise.all(
        allProjects.map(async (p) => {
          const pSkills = await getProjectSkills(p.path);
          skillsMap[p.id] = pSkills;
        }),
      );
      setProjectSkillsMap(skillsMap);
      setIsLoading(false);
    }
    load();
  }, []);

  // Watch agent command completion to refresh installed skills
  useEffect(() => {
    const target = agentInstallRef.current;
    if (!target) return;

    if (agent.activeCommand?.status === 'done') {
      setInstalling(false);
      setInstallResult({ skill: target.skill, success: true });
      // Refresh installed skills for the project
      getProjectSkills(target.projectPath).then((pSkills) => {
        setProjectSkillsMap((prev) => ({ ...prev, [target.projectId]: pSkills }));
      });
      agentInstallRef.current = null;
    } else if (agent.activeCommand?.status === 'error') {
      setInstalling(false);
      setInstallResult({
        skill: target.skill,
        success: false,
        error: String(agent.activeCommand.result?.error ?? 'Error del agente'),
      });
      agentInstallRef.current = null;
    }
  }, [agent.activeCommand?.status, agent.activeCommand?.result]);

  async function handleSkillClick(skillName: string) {
    if (selectedSkill === skillName) {
      setSelectedSkill(null);
      setSkillContent(null);
      return;
    }

    setSelectedSkill(skillName);
    setLoadingContent(true);
    const content = await getSkillContent(skillName);
    setSkillContent(content);
    setLoadingContent(false);
  }

  async function handleInstall(skillName: string, projectPath: string, projectId: string) {
    setInstalling(true);
    setInstallResult(null);

    if (agent.isAgentOnline) {
      // Route through the Agent (same as desktop app)
      agentInstallRef.current = { skill: skillName, projectId, projectPath };
      agent.sendCommand('apply-skill', { skillId: skillName, projectPath }, agent.activeInstance?.id);
    } else {
      // Agent offline — can't install remotely
      setInstallResult({
        skill: skillName,
        success: false,
        error: 'El SF Agent no esta conectado. Inicia el agente de escritorio para instalar skills en proyectos.',
      });
      setInstalling(false);
    }
  }

  const filteredSkills = tab === 'injectable'
    ? skills.filter((s) => s.isInjectable)
    : skills;

  const grouped = filteredSkills.reduce<Record<string, SkillInfo[]>>((acc, skill) => {
    const cat = skill.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(skill);
    return acc;
  }, {});

  const injectableCount = skills.filter((s) => s.isInjectable).length;
  const metaCount = skills.filter((s) => !s.isInjectable).length;

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-6">
        <p className="text-gray-500">Cargando skill registry...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Skill Registry</h1>
            <p className="text-gray-400 mt-1">
              {injectableCount} skills instalables &bull; {metaCount} skills de proceso &bull; {projects.length} proyecto(s)
            </p>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs ${
            agent.isAgentOnline
              ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
              : 'bg-white/5 border-white/10 text-gray-500'
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              agent.isAgentOnline ? 'bg-blue-400 animate-pulse' : 'bg-gray-600'
            }`} />
            {agent.isAgentOnline
              ? `Agent: ${agent.activeInstance!.machineName}`
              : 'Agent offline'}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 bg-white/5 rounded-xl w-fit">
        <button
          type="button"
          onClick={() => setTab('injectable')}
          className={`px-4 py-2 text-sm rounded-lg transition-all ${
            tab === 'injectable'
              ? 'bg-fluya-purple/20 text-fluya-purple'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Instalables ({injectableCount})
        </button>
        <button
          type="button"
          onClick={() => setTab('all')}
          className={`px-4 py-2 text-sm rounded-lg transition-all ${
            tab === 'all'
              ? 'bg-fluya-purple/20 text-fluya-purple'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Todos ({skills.length})
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Skills List */}
        <div className="lg:col-span-2 space-y-6">
          {Object.entries(grouped).map(([category, categorySkills]) => (
            <div key={category}>
              <p className={`text-xs font-medium uppercase tracking-wider mb-3 ${CATEGORY_COLORS[category]?.split(' ')[0] ?? 'text-gray-400'}`}>
                {CATEGORY_LABELS[category] ?? category}
              </p>
              <div className="space-y-2">
                {categorySkills.map((skill) => {
                  const isSelected = selectedSkill === skill.name;
                  const installedInProjects = projects.filter(
                    (p) => projectSkillsMap[p.id]?.includes(skill.name),
                  );

                  return (
                    <button
                      key={skill.name}
                      type="button"
                      onClick={() => handleSkillClick(skill.name)}
                      className={`w-full text-left p-4 rounded-xl border transition-all duration-300 ${
                        isSelected
                          ? 'bg-fluya-purple/10 border-fluya-purple/30'
                          : 'bg-white/5 border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-white">{skill.label}</p>
                            {skill.prerequisites && skill.prerequisites.length > 0 && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 rounded">
                                req: {skill.prerequisites.join(', ')}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">{skill.description}</p>
                        </div>
                        <div className="flex items-center gap-2 ml-3 shrink-0">
                          {installedInProjects.length > 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-fluya-green/10 text-fluya-green border border-fluya-green/20 rounded">
                              {installedInProjects.length} proyecto(s)
                            </span>
                          )}
                          <span className="px-2 py-1 text-xs bg-white/5 text-gray-400 border border-white/10 rounded-lg font-mono">
                            /{skill.name}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Detail Panel */}
        <div className="lg:col-span-1">
          <div className="sticky top-24">
            {selectedSkill ? (
              <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-white/10">
                  <h3 className="text-sm font-semibold text-white">
                    {skills.find((s) => s.name === selectedSkill)?.label}
                  </h3>
                  <p className="text-xs text-gray-500 font-mono mt-1">/{selectedSkill}</p>
                </div>

                {/* Install to project */}
                {skills.find((s) => s.name === selectedSkill)?.isInjectable && (
                  <div className="p-4 border-b border-white/10">
                    <p className="text-xs text-gray-400 mb-2">Instalar en proyecto:</p>
                    <div className="space-y-1">
                      {projects.map((project) => {
                        const isInstalled = projectSkillsMap[project.id]?.includes(selectedSkill);
                        return (
                          <div
                            key={project.id}
                            className="flex items-center justify-between py-1.5"
                          >
                            <span className="text-xs text-white truncate">{project.name}</span>
                            {isInstalled ? (
                              <span className="text-[10px] px-2 py-0.5 bg-fluya-green/10 text-fluya-green rounded">
                                Instalado
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleInstall(selectedSkill, project.path, project.id)}
                                disabled={installing}
                                className="text-[10px] px-2 py-0.5 bg-fluya-purple/10 text-fluya-purple border border-fluya-purple/20 rounded hover:bg-fluya-purple/20 disabled:opacity-40 transition-all"
                              >
                                {installing && agentInstallRef.current?.projectId === project.id ? '...' : 'Instalar'}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {installResult && (
                      <p className={`mt-2 text-xs ${installResult.success ? 'text-fluya-green' : 'text-red-400'}`}>
                        {installResult.success
                          ? `"${installResult.skill}" instalado ${agent.isAgentOnline ? 'via Agent' : ''}`
                          : installResult.error
                        }
                      </p>
                    )}
                  </div>
                )}

                {/* SKILL.md preview */}
                <div className="p-4 max-h-[60vh] overflow-y-auto">
                  {loadingContent ? (
                    <p className="text-xs text-gray-500">Cargando...</p>
                  ) : skillContent ? (
                    <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono leading-relaxed">
                      {skillContent.slice(0, 2000)}
                      {skillContent.length > 2000 && '\n\n... (truncado)'}
                    </pre>
                  ) : (
                    <p className="text-xs text-gray-500">Sin contenido SKILL.md</p>
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
