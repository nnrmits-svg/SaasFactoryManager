'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  getMissionControlBoard,
  type BoardRow,
} from '@/features/mission-control/services/mission-control-actions';

const STATUS_ICON: Record<string, string> = {
  working: '🟢', blocked: '🔴', review: '🟡', idle: '⚪', done: '✅',
};
const ROLE_ICON: Record<string, string> = { hub: '🧠', agent: '🤖', executor: '🛠️' };
const STATUS_STYLE: Record<string, string> = {
  working: 'bg-fluya-green/10 text-fluya-green border-fluya-green/20',
  blocked: 'bg-red-500/10 text-red-400 border-red-500/20',
  review: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  idle: 'bg-white/5 text-gray-400 border-white/10',
  done: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20',
};
const STATUS_BAR: Record<string, string> = {
  working: 'bg-fluya-green', blocked: 'bg-red-400', review: 'bg-amber-400',
  idle: 'bg-gray-500', done: 'bg-indigo-400',
};
const STALE_H = 24;
const ROLE_LABEL: Record<string, string> = { hub: 'Arquitecto / Hub', agent: 'Agent', executor: 'Executor' };

function hoursAgo(iso: string | null): number {
  if (!iso) return Infinity;
  return (Date.now() - new Date(iso).getTime()) / 3.6e6;
}
function ago(iso: string | null): string {
  if (!iso) return '';
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}min`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

export function MissionControlBoard() {
  const [board, setBoard] = useState<BoardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    try {
      const rows = await getMissionControlBoard();
      setBoard(rows);
      setLastSync(new Date());
    } catch {
      /* mantené el board previo si falla un tick */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 20000);
    return () => clearInterval(id);
  }, [refresh]);

  const machines = [...new Set(board.map((b) => b.machine))];
  const atencion = board.filter((b) => b.status === 'blocked' || hoursAgo(b.updated_at) > STALE_H);
  const byMachine = machines.map((m) => ({ machine: m, rows: board.filter((b) => b.machine === m) }));

  return (
    <div className="max-w-6xl mx-auto px-6">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white flex items-center gap-2">
            📋 Mission Control
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            {machines.length} máquinas · {board.length} workstreams
            {lastSync && (
              <>
                {' · '}
                <span className="text-fluya-green">🔄 live</span>
                {' · '}actualizado {lastSync.toLocaleTimeString('es-AR')}
              </>
            )}
          </p>
        </div>
        <button
          onClick={refresh}
          className="px-3 py-1.5 text-sm text-white/70 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
        >
          Actualizar
        </button>
      </div>

      {loading && board.length === 0 ? (
        <p className="text-gray-500 text-sm">Cargando tablero…</p>
      ) : board.length === 0 ? (
        <p className="text-gray-500 text-sm">
          Tablero vacío. Las sesiones reportan con <code className="text-fluya-green">/tablero</code>.
        </p>
      ) : (
        <>
          {/* Atención */}
          {atencion.length > 0 ? (
            <div className="mb-6 p-4 bg-red-500/5 border border-red-500/30 rounded-2xl">
              <p className="text-sm font-medium text-red-300 mb-2">⚠️ Atención ({atencion.length})</p>
              <div className="space-y-1">
                {atencion.map((b) => (
                  <p key={`${b.machine}-${b.project}`} className="text-sm text-gray-300">
                    {STATUS_ICON[b.status]}{' '}
                    <span className="font-medium text-white">{b.project}</span>
                    {' — '}
                    {b.status === 'blocked'
                      ? `bloqueado: ${b.current_task ?? '?'}`
                      : `sin novedad hace ${ago(b.updated_at)}`}
                  </p>
                ))}
              </div>
            </div>
          ) : (
            <div className="mb-6 p-3 bg-fluya-green/5 border border-fluya-green/20 rounded-2xl">
              <p className="text-sm text-fluya-green">✅ Nada urgente.</p>
            </div>
          )}

          {/* Por máquina */}
          <div className="space-y-7">
            {byMachine.map(({ machine, rows }) => (
              <section key={machine}>
                <h2 className="text-sm font-semibold text-purple-300 mb-3 flex items-center gap-2">
                  🖥️ {machine}
                </h2>
                <div
                  className="grid gap-3"
                  style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}
                >
                  {rows.map((b) => (
                    <div
                      key={`${b.machine}-${b.project}`}
                      className="relative p-4 bg-white/5 border border-white/10 rounded-2xl overflow-hidden"
                    >
                      <span className={`absolute left-0 top-0 bottom-0 w-1 ${STATUS_BAR[b.status] ?? 'bg-gray-500'}`} />
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-white flex items-center gap-1.5 min-w-0">
                          <span title={ROLE_LABEL[b.role] ?? b.role}>{ROLE_ICON[b.role] ?? '🛠️'}</span>
                          <span className="truncate">{b.project}</span>
                        </p>
                        <span
                          className={`shrink-0 text-[10px] px-2 py-0.5 rounded-lg border uppercase ${STATUS_STYLE[b.status] ?? STATUS_STYLE.idle}`}
                        >
                          {b.status}
                        </span>
                      </div>
                      {b.current_task && <p className="text-xs text-gray-300 mt-2">{b.current_task}</p>}
                      {b.next_task && <p className="text-xs text-fluya-green mt-1">→ {b.next_task}</p>}
                      {b.updated_at && <p className="text-[10px] text-gray-500 mt-2">hace {ago(b.updated_at)}</p>}
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
