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
const STATUS_FILTERS = [
  { v: 'todos', l: 'Todos' }, { v: 'working', l: 'Working' }, { v: 'blocked', l: 'Pendientes' },
  { v: 'review', l: 'Review' }, { v: 'done', l: 'Done' }, { v: 'idle', l: 'Idle' },
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
function maxIso(...xs: (string | null | undefined)[]): string | null {
  const v = xs.filter(Boolean).sort();
  return v.length ? (v[v.length - 1] as string) : null;
}

interface Proj {
  name: string; status: string; machine: string; task: string;
  next: string | null; pend: string | null;
  acts: ActivityEntry[]; sess: ActiveSession[]; lastActive: string | null;
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
  const hubNames = new Set(hubs.map((h) => h.project));

  const wsByProject: Record<string, BoardRow> = {};
  board.filter((b) => b.role !== 'hub').forEach((b) => { wsByProject[b.project] = b; });
  const sessByProject: Record<string, ActiveSession[]> = {};
  sessions.forEach((s) => { (sessByProject[s.project] ??= []).push(s); });
  const actByProject: Record<string, ActivityEntry[]> = {};
  activity.forEach((a) => { (actByProject[a.project] ??= []).push(a); });

  const machines = [...new Set([
    ...board.filter((b) => b.role !== 'hub').map((b) => b.machine),
    ...sessions.map((s) => s.machine),
  ])];

  const names = [...new Set([...Object.keys(wsByProject), ...sessions.map((s) => s.project)])]
    .filter((n) => !hubNames.has(n));

  const projects: Proj[] = names.map((name) => {
    const ws = wsByProject[name];
    const sess = sessByProject[name] ?? [];
    const acts = (actByProject[name] ?? []).slice(0, 3);
    return {
      name,
      status: ws?.status ?? (sess.length ? 'working' : 'idle'),
      machine: ws?.machine ?? sess[0]?.machine ?? '',
      task: ws?.current_task ?? sess[0]?.current_task ?? '',
      next: ws?.next_task ?? null,
      pend: ws?.pending_task ?? null,
      acts, sess,
      lastActive: maxIso(ws?.updated_at, acts[0]?.created_at, sess[0]?.last_seen_at),
    };
  })
    .filter((p) => (machineF === 'todas' || p.machine === machineF) && (statusF === 'todos' || p.status === statusF))
    .sort((a, b) => (b.lastActive ?? '').localeCompare(a.lastActive ?? ''));

  return (
    <div className="max-w-6xl mx-auto px-6">
      <div className="flex items-end justify-between flex-wrap gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-semibold text-white">📋 Mission Control</h1>
          <p className="text-sm text-gray-400 mt-1">
            {names.length} proyectos · {sessions.length} sesiones activas
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
          {/* Arquitecto — centro de mando, con su feed */}
          {hubs.map((h) => {
            const acts = (actByProject[h.project] ?? []).slice(0, 4);
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
                    {acts.map((a, i) => (
                      <p key={i} className="text-xs text-gray-400">
                        <span className="text-gray-500">·</span> {a.action} <span className="text-gray-600">· hace {ago(a.created_at)}</span>
                      </p>
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

          {/* Columnas por proyecto */}
          {projects.length === 0 ? (
            <p className="text-gray-500 text-sm">Nada coincide con el filtro.</p>
          ) : (
            <div className="grid gap-3 items-start" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
              {projects.map((p) => (
                <div key={p.name} className={`relative rounded-2xl border p-4 overflow-hidden ${st(p.status).card}`}>
                  <span className={`absolute left-0 top-0 bottom-0 w-1 ${st(p.status).bar}`} />
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-semibold text-white truncate">{p.name}</span>
                    <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-lg uppercase font-medium ${st(p.status).badge}`}>{st(p.status).label}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-500">
                    {p.machine && <span>🖥️ {p.machine}</span>}
                    {p.lastActive && <span>· activo hace {ago(p.lastActive)}</span>}
                  </div>

                  {p.task && <p className="text-xs text-gray-300 mt-2">{p.task}</p>}
                  {p.next && <p className="text-xs text-fluya-green mt-1">→ {p.next}</p>}
                  {p.pend && <p className="text-xs text-amber-400 mt-1">⏳ {p.pend}</p>}

                  {p.sess.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {p.sess.map((s) => (
                        <span key={s.session_id} className="text-[10px] px-2 py-0.5 rounded-lg bg-purple-500/15 text-purple-300">💻 {s.client ?? '?'}</span>
                      ))}
                    </div>
                  )}

                  {p.acts.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-white/10 space-y-1">
                      {p.acts.map((a, i) => (
                        <p key={i} className="text-[11px] text-gray-500 leading-snug">· {a.action} <span className="text-gray-600">· {ago(a.created_at)}</span></p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
