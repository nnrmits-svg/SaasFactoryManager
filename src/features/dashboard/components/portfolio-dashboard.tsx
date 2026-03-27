'use client';

import { useState, useEffect, useCallback } from 'react';
import { getPortfolioProjects } from '@/features/factory-manager/services/git-sync-action';
import { getProjectSkillsById } from '@/features/factory-manager/services/skill-catalog-action';
import type { Project } from '@/features/factory-manager/types';
import { StatsBar } from './stats-bar';
import { PortfolioGrid } from './portfolio-grid';
import { SyncButton } from './sync-button';

export function PortfolioDashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectSkillsMap, setProjectSkillsMap] = useState<Record<string, string[]>>({});
  const [isLoading, setIsLoading] = useState(true);

  const loadProjects = useCallback(async () => {
    setIsLoading(true);
    const data = await getPortfolioProjects();
    setProjects(data);

    // Load installed skills per project (from Supabase)
    const map: Record<string, string[]> = {};
    await Promise.all(
      data.map(async (p) => {
        try {
          const skills = await getProjectSkillsById(p.id);
          map[p.id] = skills;
        } catch {
          map[p.id] = [];
        }
      }),
    );
    setProjectSkillsMap(map);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  return (
    <div className="max-w-6xl mx-auto px-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Portfolio</h1>
          <p className="text-gray-400 mt-1">
            {projects.length} proyecto(s) en tu fabrica de software.
          </p>
        </div>
        <SyncButton onSyncComplete={loadProjects} />
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-gray-500">Cargando proyectos...</div>
      ) : (
        <>
          <StatsBar projects={projects} />
          <PortfolioGrid projects={projects} projectSkillsMap={projectSkillsMap} />
        </>
      )}
    </div>
  );
}
