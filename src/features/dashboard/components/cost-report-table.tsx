'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  getReportsData,
  type ClaudeSessionRow,
  type ProjectMeta,
} from '@/features/factory-manager/services/report-action';

function compactNumber(n: number): string {
  if (n === 0) return '0';
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
}

function fmtCurrency(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function fmtDate(iso: string | null): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

interface AggregatedRow {
  projectId: string | null;
  projectName: string;
  status: string;
  tokensInput: number;
  tokensOutput: number;
  tokensCached: number;
  costUsd: number;
  promptCount: number;
  /** USD per hour, computed only over sessions linked to a `work_session` so
   *  we can divide by real human work time. Null when no linked sessions. */
  costPerHour: number | null;
  topModel: string;
  lastSessionAt: string | null;
}

const ALL = 'all';

export function CostReportTable() {
  const [projects, setProjects] = useState<ProjectMeta[]>([]);
  const [sessions, setSessions] = useState<ClaudeSessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filterModel, setFilterModel] = useState<string>(ALL);
  const [filterMonth, setFilterMonth] = useState<string>(ALL);
  const [filterProject, setFilterProject] = useState<string>(ALL);

  useEffect(() => {
    getReportsData()
      .then((data) => {
        setProjects(data.projects);
        setSessions(data.sessions);
        setLoading(false);
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : 'Error');
        setLoading(false);
      });
  }, []);

  const modelOptions = useMemo(() => {
    const set = new Set<string>();
    for (const s of sessions) if (s.model) set.add(s.model);
    return Array.from(set).sort();
  }, [sessions]);

  const monthOptions = useMemo(() => {
    const set = new Set<string>();
    for (const s of sessions) set.add(s.startedAt.slice(0, 7));
    return Array.from(set).sort().reverse();
  }, [sessions]);

  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      if (filterModel !== ALL && s.model !== filterModel) return false;
      if (filterMonth !== ALL && s.startedAt.slice(0, 7) !== filterMonth) return false;
      if (filterProject !== ALL && s.projectId !== filterProject) return false;
      return true;
    });
  }, [sessions, filterModel, filterMonth, filterProject]);

  const rows = useMemo<AggregatedRow[]>(() => {
    const byProject = new Map<string, AggregatedRow>();
    const projectsById = new Map(projects.map((p) => [p.id, p]));

    for (const s of filteredSessions) {
      const key = s.projectId ?? '__orphan__';
      const proj = s.projectId ? projectsById.get(s.projectId) : undefined;
      const existing = byProject.get(key);
      if (!existing) {
        byProject.set(key, {
          projectId: s.projectId,
          projectName: s.projectName ?? proj?.name ?? '(sin proyecto)',
          status: proj?.status ?? '-',
          tokensInput: s.tokensInput,
          tokensOutput: s.tokensOutput,
          tokensCached: s.tokensCached,
          costUsd: s.costUsd,
          promptCount: s.promptCount,
          costPerHour: null,
          topModel: '-',
          lastSessionAt: s.endedAt ?? s.startedAt,
        });
      } else {
        existing.tokensInput += s.tokensInput;
        existing.tokensOutput += s.tokensOutput;
        existing.tokensCached += s.tokensCached;
        existing.costUsd += s.costUsd;
        existing.promptCount += s.promptCount;
        const candidate = s.endedAt ?? s.startedAt;
        if (!existing.lastSessionAt || candidate > existing.lastSessionAt) {
          existing.lastSessionAt = candidate;
        }
      }
    }

    for (const row of byProject.values()) {
      const projectSessions = filteredSessions.filter(
        (s) => (s.projectId ?? '__orphan__') === (row.projectId ?? '__orphan__'),
      );

      // Top model by total prompt_count
      const modelCount = new Map<string, number>();
      for (const s of projectSessions) {
        if (!s.model) continue;
        modelCount.set(s.model, (modelCount.get(s.model) ?? 0) + s.promptCount);
      }
      let topModel = '-';
      let topCount = -1;
      for (const [m, c] of modelCount) {
        if (c > topCount) {
          topModel = m;
          topCount = c;
        }
      }
      row.topModel = topModel;

      // $/hour: divide the (filtered) project cost by the project's TOTAL
      // work-session minutes. Project-level — no per-session linking — so the
      // ratio stays in scale even when a single long claude_session aligns to
      // a brief work_session. (Asymmetry under month filters is intentional;
      // see ProjectMeta.totalWorkMinutes docstring.)
      const projectMeta = projectsById.get(row.projectId ?? '');
      const totalMinutes = projectMeta?.totalWorkMinutes ?? 0;
      row.costPerHour = totalMinutes > 0 ? row.costUsd / (totalMinutes / 60) : null;
    }

    return Array.from(byProject.values()).sort((a, b) => b.costUsd - a.costUsd);
  }, [filteredSessions, projects]);

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => ({
        tokensInput: acc.tokensInput + r.tokensInput,
        tokensOutput: acc.tokensOutput + r.tokensOutput,
        tokensCached: acc.tokensCached + r.tokensCached,
        costUsd: acc.costUsd + r.costUsd,
        promptCount: acc.promptCount + r.promptCount,
      }),
      { tokensInput: 0, tokensOutput: 0, tokensCached: 0, costUsd: 0, promptCount: 0 },
    );
  }, [rows]);

  if (loading) {
    return <div className="text-gray-400 text-center py-12">Cargando reports...</div>;
  }
  if (error) {
    return <div className="text-red-400 text-center py-12">Error: {error}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-gray-400 mb-1" htmlFor="f-model">
            Modelo
          </label>
          <select
            id="f-model"
            value={filterModel}
            onChange={(e) => setFilterModel(e.target.value)}
            className="w-52 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-fluya-purple/50"
          >
            <option value={ALL}>Todos</option>
            {modelOptions.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1" htmlFor="f-month">
            Mes
          </label>
          <select
            id="f-month"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="w-36 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-fluya-purple/50"
          >
            <option value={ALL}>Todos</option>
            {monthOptions.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1" htmlFor="f-project">
            Proyecto
          </label>
          <select
            id="f-project"
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            className="w-56 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-fluya-purple/50"
          >
            <option value={ALL}>Todos</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="ml-auto text-xs text-gray-400">
          {filteredSessions.length} sesion(es) &bull; {fmtCurrency(totals.costUsd)} &bull;{' '}
          {compactNumber(totals.tokensInput + totals.tokensOutput + totals.tokensCached)} tokens
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-white/5 text-left">
              <th className="px-4 py-3 text-gray-400 font-medium">Proyecto</th>
              <th className="px-4 py-3 text-gray-400 font-medium">Status</th>
              <th className="px-4 py-3 text-gray-400 font-medium text-right">
                Tokens (in / out / cached)
              </th>
              <th className="px-4 py-3 text-gray-400 font-medium text-right">$ Total</th>
              <th className="px-4 py-3 text-gray-400 font-medium text-right">$/hora</th>
              <th className="px-4 py-3 text-gray-400 font-medium">Modelo más usado</th>
              <th className="px-4 py-3 text-gray-400 font-medium text-right">Última sesión</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                  {sessions.length === 0
                    ? 'No hay sesiones de Claude registradas todavía. El SF Agent las pushea cada ~5 min.'
                    : 'No hay sesiones que coincidan con los filtros.'}
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.projectId ?? '__orphan__'} className="hover:bg-white/5 transition-colors">
                <td className="px-4 py-3 text-white font-medium">{r.projectName}</td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs ${
                      r.status === 'active'
                        ? 'bg-fluya-green/10 text-fluya-green'
                        : r.status === 'archived'
                          ? 'bg-gray-500/10 text-gray-500'
                          : 'bg-yellow-500/10 text-yellow-400'
                    }`}
                  >
                    {r.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-300 text-right font-mono text-xs">
                  {compactNumber(r.tokensInput)} / {compactNumber(r.tokensOutput)} /{' '}
                  {compactNumber(r.tokensCached)}
                </td>
                <td className="px-4 py-3 text-fluya-green text-right font-mono">
                  {fmtCurrency(r.costUsd)}
                </td>
                <td className="px-4 py-3 text-gray-300 text-right font-mono">
                  {r.costPerHour !== null ? fmtCurrency(r.costPerHour) : '-'}
                </td>
                <td className="px-4 py-3 text-gray-300 font-mono text-xs">{r.topModel}</td>
                <td className="px-4 py-3 text-gray-400 text-right">
                  {fmtDate(r.lastSessionAt)}
                </td>
              </tr>
            ))}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="bg-white/5 font-medium">
                <td className="px-4 py-3 text-white">Totales</td>
                <td className="px-4 py-3 text-gray-400">{rows.length} proyecto(s)</td>
                <td className="px-4 py-3 text-white text-right font-mono text-xs">
                  {compactNumber(totals.tokensInput)} / {compactNumber(totals.tokensOutput)} /{' '}
                  {compactNumber(totals.tokensCached)}
                </td>
                <td className="px-4 py-3 text-fluya-green text-right font-mono font-bold">
                  {fmtCurrency(totals.costUsd)}
                </td>
                <td className="px-4 py-3" />
                <td className="px-4 py-3" />
                <td className="px-4 py-3" />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
