'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  getMissionControlBoard,
  type BoardRow,
  type ActiveSession,
  type ActivityEntry,
  type MissionControlData,
} from '@/features/mission-control/services/mission-control-actions';

const STATUS = {
  working: { label: 'Working',   card: 'bg-fluya-green/[0.07] border-fluya-green/25', badge: 'bg-fluya-green/15 text-fluya-green', bar: 'bg-fluya-green' },
  blocked: { label: 'Pendiente', card: 'bg-red-500/[0.07] border-red-500/30',         badge: 'bg-red-500/15 text-red-400',        bar: 'bg-red-400' },
  review:  { label: 'Review',    card: 'bg-amber-500/[0.07] border-amber-500/30',      badge: 'bg-amber-500/15 text-amber-400',    bar: 'bg-amber-400' },
  idle:    { label: 'Idle',      card: 'bg-white/[0.03] border-white/10',              badge: 'bg-white/10 text-gray-400',         bar: 'bg-gray-500' },
  done:    { label: 'Done',      card: 'bg-indigo-500/[0.07] border-indigo-500/30',    badge: 'bg-indigo-500/15 text-indigo-300',  bar: 'bg-indigo-400' },
} as const;
const ROLE_ICON: Record<string, string> = { hub: '🧠', agent: '🤖', executor: '🛠️' };
const STATUS_FILTERS = [
  { v: 'todos', l: 'Todos' }, { v: 'working', l: 'Working' }, { v: 'blocked', l: 'Pendientes' },
  { v: 'review', l: 'Review' }, { v: 'idle', l: 'Idle' },
];

const st = (s: string) => STATUS[s as keyof typeof STATUS] ?? STATUS.idle;
const chip = (active: boolean) =>
  `px-2.5 py-1 rounded-lg border text-xs transition-colors ${
    active ? 'bg-fluya-green/15 text-fluya-green border-fluya-green/30' : 'text-gray-400 border-white/10 hover:bg-white/5'
  }`;
function ago(iso: string | null | undefined): string {
  if (!iso) return '';
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}min`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

export function MissionControlBoard() {
  const [data, setData] = useState<MissionControlData>({ board: [], sessions: [], activity: [] });
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [machineF, setMachineF] = useState('todas');
  const [statusF, setStatusF] = useState('todos');

  const refresh = useCallback(async () => {
    try { setData(await getMissionControlBoard()); setLastSync(new Date()); }
    catch { /* mantené lo previo */ }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 20000);
    return () => clearInterval(id);
  }, [refresh]);

  const { board, sessions, activity } = data;
  const hubs = board.filter((b) => b.role === 'hub');
  const rest = board.filter((b) => b.role !== 'hub');
  const machines = [...new Set(rest.map((b) => b.machine))];

  const match = (machine: string, status: string) =>
    (machineF === 'todas' || machine === machineF) && (statusF === 'todos' || status === statusF);

  const sessFiltered = sessions.filter((s) => match(s.machine, s.status));
  const byMachine = machines
    .map((m) => ({ machine: m, rows: rest.filter((b) => b.machine === m && match(b.machine, b.status)) }))
    .filter((g) => g.rows.length);

  return (
    <div className="max-w-6xl mx-auto px-6">
      <div className="flex items-end justify-between flex-wrap gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-semibold text-white">📋 Mission Control</h1>
          <p className="text-sm text-gray-400 mt-1">
            {machines.length} máquinas · {rest.length} workstreams · {sessions.length} sesiones activas
            {lastSync && <> · <span className="text-fluya-green">🔄 live</span> · {lastSync.toLocaleTimeString('es-AR')}</>}
          </p>
        </div>
        <button onClick={refresh} className="px-3 py-1.5 text-sm text-white/70 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors">
          Actualizar
        </button>
      </div>

      {loading && !board.length ? (
        <p className="text-gray-500 text-sm">Cargando tablero…</p>
      ) : (
        <>
          {/* Arquitecto — centro de mando, con su feed de actividad */}
          {hubs.map((h) => {
            const acts = activity.filter((a) => a.project === h.project).slice(0, 5);
            return (
              <div key={h.machine + h.project} className="mb-6 rounded-2xl border border-purple-500/30 bg-purple-500/[0.06] p-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xl">🧠</span>
                  <span className="text-base font-semibold text-white">{h.project}</span>
                  <span className="text-xs text-gray-400">centro de mando</span>
                  {h.current_task && <span className="ml-auto text-sm text-gray-300">ahora: {h.current_task}</span>}
                </div>
                {h.next_task && <p className="text-xs text-fluya-green mt-1">→ {h.next_task}</p>}
                {acts.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-white/10 space-y-1">
                    <p className="text-[11px] text-gray-500 mb-1">📜 últimas acciones</p>
                    {acts.map((a, i) => (
                      <p key={i} className="text-xs text-gray-400">· {a.action} <span className="text-gray-600">· hace {ago(a.created_at)}</span></p>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Filtros */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-5">
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-xs text-gray-500 mr-1">Máquina</span>
              {['todas', ...machines].map((m) => (
                <button key={m} onClick={() => setMachineF(m)} className={chip(machineF === m)}>{m === 'todas' ? 'Todas' : m}</button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-xs text-gray-500 mr-1">Estado</span>
              {STATUS_FILTERS.map((f) => (
                <button key={f.v} onClick={() => setStatusF(f.v)} className={chip(statusF === f.v)}>{f.l}</button>
              ))}
            </div>
          </div>

          {/* Sesiones activas (como antes) */}
          {sessFiltered.length > 0 && (
            <section className="mb-7">
              <h2 className="text-sm font-semibold text-fluya-green mb-3">💻 Sesiones activas ahora ({sessFiltered.length})</h2>
              <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
                {sessFiltered.map((s) => (
                  <div key={s.session_id} className="relative rounded-2xl border border-white/10 bg-white/[0.04] p-4 overflow-hidden">
                    <span className="absolute left-0 top-0 bottom-0 w-1 bg-fluya-green" />
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-white flex items-center gap-1.5 min-w-0"><span>💻</span><span className="truncate">{s.project}</span></p>
                      <span className="shrink-0 text-[10px] px-2 py-0.5 rounded-lg bg-purple-500/15 text-purple-300">{s.client ?? '?'}</span>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-2">{s.machine} · hace {ago(s.last_seen_at)}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Columnas por MÁQUINA (kanban): cada máquina una columna, sus proyectos apilados */}
          {byMachine.length === 0 ? (
            <p className="text-gray-500 text-sm">Nada coincide con el filtro.</p>
          ) : (
            <div className="grid gap-4 items-start" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))' }}>
              {byMachine.map(({ machine, rows }) => (
                <section key={machine} className="space-y-3">
                  <h2 className="text-sm font-semibold text-purple-300 flex items-center gap-2 pb-2 border-b border-white/10">
                    🖥️ {machine} <span className="text-xs text-gray-500 font-normal">({rows.length})</span>
                  </h2>
                  {rows.map((b) => (
                    <div key={b.machine + b.project} className={`relative rounded-2xl border p-4 overflow-hidden ${st(b.status).card}`}>
                      <span className={`absolute left-0 top-0 bottom-0 w-1 ${st(b.status).bar}`} />
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-white flex items-center gap-1.5 min-w-0"><span>{ROLE_ICON[b.role] ?? '🛠️'}</span><span className="truncate">{b.project}</span></p>
                        <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-lg uppercase font-medium ${st(b.status).badge}`}>{st(b.status).label}</span>
                      </div>
                      {b.current_task && <p className="text-xs text-gray-300 mt-2">{b.current_task}</p>}
                      {b.next_task && <p className="text-xs text-fluya-green mt-1">→ {b.next_task}</p>}
                      {b.pending_task && <p className="text-xs text-amber-400 mt-1">⏳ {b.pending_task}</p>}
                      {b.updated_at && <p className="text-[10px] text-gray-500 mt-2">hace {ago(b.updated_at)}</p>}
                    </div>
                  ))}
                </section>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
