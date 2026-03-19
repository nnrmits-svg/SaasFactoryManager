'use client';

import { useState, useEffect } from 'react';
import { getProjectCostData, type ProjectCostRow } from '@/features/factory-manager/services/report-action';

function formatHours(minutes: number): string {
  if (minutes === 0) return '0h';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining > 0 ? `${hours}h ${remaining}m` : `${hours}h`;
}

function formatDate(iso: string | null): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

interface ExportData {
  exportedAt: string;
  hourlyRate: number;
  projects: Array<{
    name: string;
    status: string;
    totalHours: number;
    totalCommits: number;
    sessions: number;
    lastActivity: string | null;
    estimatedCost: number;
  }>;
  totals: {
    totalHours: number;
    totalCommits: number;
    totalSessions: number;
    totalCost: number;
  };
}

export function CostReportTable() {
  const [projects, setProjects] = useState<ProjectCostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [hourlyRate, setHourlyRate] = useState(0);
  const [exported, setExported] = useState(false);

  useEffect(() => {
    getProjectCostData().then((report) => {
      setProjects(report.projects);
      setLoading(false);
    });
  }, []);

  const totalMinutes = projects.reduce((sum, p) => sum + p.totalMinutes, 0);
  const totalCommits = projects.reduce((sum, p) => sum + p.totalCommits, 0);
  const totalSessions = projects.reduce((sum, p) => sum + p.sessionCount, 0);
  const totalHours = totalMinutes / 60;
  const totalCost = totalHours * hourlyRate;

  function buildExportData(): ExportData {
    return {
      exportedAt: new Date().toISOString(),
      hourlyRate,
      projects: projects.map((p) => ({
        name: p.name,
        status: p.status,
        totalHours: Math.round((p.totalMinutes / 60) * 100) / 100,
        totalCommits: p.totalCommits,
        sessions: p.sessionCount,
        lastActivity: p.lastCommitDate,
        estimatedCost: Math.round((p.totalMinutes / 60) * hourlyRate * 100) / 100,
      })),
      totals: {
        totalHours: Math.round(totalHours * 100) / 100,
        totalCommits,
        totalSessions,
        totalCost: Math.round(totalCost * 100) / 100,
      },
    };
  }

  function handleExportJSON() {
    const data = buildExportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cost-report-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExported(true);
    setTimeout(() => setExported(false), 2000);
  }

  function handleCopyClipboard() {
    const data = buildExportData();
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setExported(true);
    setTimeout(() => setExported(false), 2000);
  }

  if (loading) {
    return <div className="text-gray-400 text-center py-12">Cargando datos de costeo...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Rate input */}
      <div className="flex items-center gap-4">
        <label className="text-sm text-gray-400" htmlFor="hourly-rate">
          Tarifa por hora (USD)
        </label>
        <input
          id="hourly-rate"
          type="number"
          min="0"
          step="5"
          value={hourlyRate || ''}
          onChange={(e) => setHourlyRate(Number(e.target.value) || 0)}
          placeholder="0"
          className="w-28 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-gray-600 focus:outline-none focus:border-fluya-purple/50"
        />
        {hourlyRate > 0 && (
          <span className="text-sm text-fluya-green">
            Total estimado: {formatCurrency(totalCost)}
          </span>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-white/5 text-left">
              <th className="px-4 py-3 text-gray-400 font-medium">Proyecto</th>
              <th className="px-4 py-3 text-gray-400 font-medium">Status</th>
              <th className="px-4 py-3 text-gray-400 font-medium text-right">Commits</th>
              <th className="px-4 py-3 text-gray-400 font-medium text-right">Horas</th>
              <th className="px-4 py-3 text-gray-400 font-medium text-right">Sesiones</th>
              <th className="px-4 py-3 text-gray-400 font-medium text-right">Ultimo Commit</th>
              {hourlyRate > 0 && (
                <th className="px-4 py-3 text-gray-400 font-medium text-right">Costo Est.</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {projects.map((p) => {
              const hours = p.totalMinutes / 60;
              const cost = hours * hourlyRate;
              return (
                <tr key={p.name} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 text-white font-medium">{p.name}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs ${
                        p.status === 'active'
                          ? 'bg-fluya-green/10 text-fluya-green'
                          : p.status === 'archived'
                            ? 'bg-gray-500/10 text-gray-500'
                            : 'bg-yellow-500/10 text-yellow-400'
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-300 text-right">{p.totalCommits}</td>
                  <td className="px-4 py-3 text-white text-right font-mono">
                    {formatHours(p.totalMinutes)}
                  </td>
                  <td className="px-4 py-3 text-gray-300 text-right">{p.sessionCount}</td>
                  <td className="px-4 py-3 text-gray-400 text-right">
                    {formatDate(p.lastCommitDate)}
                  </td>
                  {hourlyRate > 0 && (
                    <td className="px-4 py-3 text-fluya-green text-right font-mono">
                      {formatCurrency(cost)}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-white/5 font-medium">
              <td className="px-4 py-3 text-white">Totales</td>
              <td className="px-4 py-3 text-gray-400">{projects.length} proyectos</td>
              <td className="px-4 py-3 text-white text-right">{totalCommits}</td>
              <td className="px-4 py-3 text-white text-right font-mono">
                {formatHours(totalMinutes)}
              </td>
              <td className="px-4 py-3 text-white text-right">{totalSessions}</td>
              <td className="px-4 py-3" />
              {hourlyRate > 0 && (
                <td className="px-4 py-3 text-fluya-green text-right font-mono font-bold">
                  {formatCurrency(totalCost)}
                </td>
              )}
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Export buttons */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleExportJSON}
          className="px-5 py-2.5 bg-gradient-to-r from-fluya-purple to-fluya-blue text-white rounded-xl font-medium hover:-translate-y-0.5 transition-all duration-300 shadow-lg shadow-fluya-purple/20 text-sm"
        >
          Descargar JSON
        </button>
        <button
          type="button"
          onClick={handleCopyClipboard}
          className="px-5 py-2.5 bg-white/5 text-gray-300 border border-white/10 rounded-xl hover:bg-white/10 transition-all duration-300 text-sm"
        >
          Copiar al Clipboard
        </button>
        {exported && (
          <span className="text-sm text-fluya-green animate-pulse">Exportado</span>
        )}
      </div>
    </div>
  );
}
