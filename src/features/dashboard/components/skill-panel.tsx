'use client';

import { useState, useEffect } from 'react';
import { getApplicableSkills, type SkillInfo } from '@/features/factory-manager/services/skill-catalog-action';

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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const data = await getApplicableSkills();
      setSkills(data);
      setIsLoading(false);
    }
    load();
  }, []);

  if (isLoading) {
    return (
      <div className="mb-8 p-5 bg-white/5 border border-white/10 rounded-2xl">
        <p className="text-sm text-gray-500">Cargando skills...</p>
      </div>
    );
  }

  // Group by category
  const grouped = skills.reduce<Record<string, SkillInfo[]>>((acc, skill) => {
    const cat = skill.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(skill);
    return acc;
  }, {});

  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold text-white mb-4">Skills Disponibles</h2>
      <p className="text-xs text-gray-500 mb-4">
        Estos skills se aplican abriendo el proyecto en el IDE y ejecutando el comando correspondiente.
        El Factory Manager los detecta y trackea.
      </p>

      <div className="space-y-4">
        {Object.entries(grouped).map(([category, categorySkills]) => (
          <div key={category}>
            <p className={`text-xs font-medium uppercase tracking-wider mb-2 ${CATEGORY_COLORS[category] ?? 'text-gray-400'}`}>
              {CATEGORY_LABELS[category] ?? category}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {categorySkills.map((skill) => (
                <div
                  key={skill.name}
                  className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl hover:border-white/20 transition-all duration-300"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white">{skill.label}</p>
                    <p className="text-xs text-gray-500 truncate">{skill.description}</p>
                  </div>
                  <span className="ml-2 px-2 py-1 text-xs bg-white/5 text-gray-400 border border-white/10 rounded-lg font-mono shrink-0">
                    /{skill.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
