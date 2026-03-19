import type { Project } from '@/features/factory-manager/types';

interface Props {
  projects: Project[];
}

function formatHours(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining > 0 ? `${hours}h ${remaining}m` : `${hours}h`;
}

export function StatsBar({ projects }: Props) {
  const totalProjects = projects.length;
  const totalMinutes = projects.reduce((sum, p) => sum + (p.totalWorkMinutes ?? 0), 0);
  const totalCommits = projects.reduce((sum, p) => sum + (p.commitCount ?? 0), 0);

  const mostActive = projects.length > 0
    ? projects.reduce((max, p) => (p.commitCount ?? 0) > (max.commitCount ?? 0) ? p : max)
    : null;

  const stats = [
    { label: 'Proyectos', value: totalProjects.toString() },
    { label: 'Tiempo Total', value: formatHours(totalMinutes) },
    { label: 'Commits', value: totalCommits.toString() },
    { label: 'Mas Activo', value: mostActive?.name ?? '-' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="p-4 bg-white/5 border border-white/10 rounded-2xl hover:border-fluya-purple/30 transition-all duration-300"
        >
          <p className="text-xs text-gray-500 uppercase tracking-wider">{stat.label}</p>
          <p className="text-2xl font-bold text-white mt-1 truncate">{stat.value}</p>
        </div>
      ))}
    </div>
  );
}
