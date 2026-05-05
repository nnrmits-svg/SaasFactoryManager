'use client';

import { useEffect, useState } from 'react';
import {
  getProjectClaudeSessions,
  type ClaudeSessionDetailRow,
} from '@/features/factory-manager/services/report-action';

interface Props {
  projectId: string;
}

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function fmtDateTime(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, '0');
  const month = MONTHS[d.getMonth()];
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${day} ${month} ${hh}:${mm}`;
}

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

export function AiActivityTab({ projectId }: Props) {
  const [sessions, setSessions] = useState<ClaudeSessionDetailRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getProjectClaudeSessions(projectId)
      .then((rows) => {
        if (cancelled) return;
        setSessions(rows);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  if (loading) {
    return (
      <div className="text-gray-400 text-center py-12">Cargando sesiones de Claude...</div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="p-6 bg-white/5 border border-white/10 rounded-2xl text-center">
        <p className="text-sm text-gray-400">
          Sin sesiones de Claude registradas para este proyecto.
        </p>
        <p className="text-xs text-gray-500 mt-1">
          El SF Agent pushea cada ~5 min mientras hay sesiones activas.
        </p>
      </div>
    );
  }

  const totals = sessions.reduce(
    (acc, s) => ({
      tokensInput: acc.tokensInput + s.tokensInput,
      tokensOutput: acc.tokensOutput + s.tokensOutput,
      tokensCached: acc.tokensCached + s.tokensCached,
      costUsd: acc.costUsd + s.costUsd,
      promptCount: acc.promptCount + s.promptCount,
    }),
    { tokensInput: 0, tokensOutput: 0, tokensCached: 0, costUsd: 0, promptCount: 0 },
  );

  return (
    <div className="space-y-4">
      <div className="text-xs text-gray-400">
        {sessions.length} sesion(es) &bull; {fmtCurrency(totals.costUsd)} &bull;{' '}
        {compactNumber(totals.tokensInput + totals.tokensOutput + totals.tokensCached)} tokens
        totales &bull; {totals.promptCount} prompts
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-white/5 text-left">
              <th className="px-4 py-3 text-gray-400 font-medium">Inicio</th>
              <th className="px-4 py-3 text-gray-400 font-medium">Fin</th>
              <th className="px-4 py-3 text-gray-400 font-medium">Modelo</th>
              <th className="px-4 py-3 text-gray-400 font-medium text-right">
                Tokens (in / out / cached)
              </th>
              <th className="px-4 py-3 text-gray-400 font-medium text-right">Costo</th>
              <th className="px-4 py-3 text-gray-400 font-medium">Host</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {sessions.map((s) => (
              <tr key={s.id} className="hover:bg-white/5 transition-colors">
                <td className="px-4 py-3 text-white text-xs font-mono">{fmtDateTime(s.startedAt)}</td>
                <td className="px-4 py-3 text-gray-400 text-xs font-mono">{fmtDateTime(s.endedAt)}</td>
                <td className="px-4 py-3 text-gray-300 text-xs font-mono">
                  {s.model ?? '—'}
                </td>
                <td className="px-4 py-3 text-gray-300 text-right text-xs font-mono">
                  {compactNumber(s.tokensInput)} / {compactNumber(s.tokensOutput)} /{' '}
                  {compactNumber(s.tokensCached)}
                </td>
                <td className="px-4 py-3 text-fluya-green text-right font-mono">
                  {fmtCurrency(s.costUsd)}
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs font-mono truncate max-w-[180px]">
                  {s.hostname ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
