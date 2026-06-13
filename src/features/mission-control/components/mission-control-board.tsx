'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  getMissionControlBoard,
  type ActiveSession,
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
  { v: 'review', l: 'Review' }, { v: 'done', l: 'Done' }, { v: 'idle', l: 'Idle' },
];
const DONE_TTL_MS = 48 * 3600 * 1000; // los "done" desaparecen a las 48h

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

function SessionCard({ s }: { s: ActiveSession }) {
  return (
    <div className="relative rounded-2xl border border-white/10 bg-white/[0.04] p-3 overflow-hidden">
      <span className="absolute left-0 top-0 bottom-0 w-1 bg-fluya-green" />
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-white flex items-center gap-1.5 min-w-0"><span>💻</span><span className="truncate">{s.project}</span></p>
        <span className="shrink-0 text-[10px] px-2 py-0.5 rounded-lg bg-purple-500/15 text-purple-300">{s.client ?? '?'}</span>
      </div>
      <p className="text-[10px] text-gray-500 mt-1.5">sesión activa · hace {ago(s.last_seen_at)}</p>
    </div>
  );
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
  const rest = board.filter((b) => {
    if (b.role === 'hub') return false;
    // "done" desaparece a las 48h (Date.now() acá, no en el body: no rompe el prerender de Next 16)
    if (b.status === 'done' && b.updated_at && Date.now() - new Date(b.updated_at).getTime() > DONE_TTL_MS) return false;
    return true;
  });

  const match = (machine: string, status: string) =>
    (machineF === 'todas' || machine === machineF) && (statusF === 'todos' || status === statusF);

  const machines = [...new Set([...rest.map((b) => b.machine), ...sessions.map((s) => s.machine)])];
  const machineCols = machines
    .map((m) => ({
      machine: m,
      ws: rest.filter((b) => b.machine === m && match(b.machine, b.status)),
      sess: sessions.filter((s) => s.machine === m && match(s.machine, s.status)),
    }))
    .filter((c) => c.ws.length || c.sess.length);

  // Zona Arquitecto: actividad agrupada por CONTEXTO (a qué proyecto se refiere)
  const ctxMap: Record<string, typeof activity> = {};
  activity.forEach((a) => { (ctxMap[a.project] ??= []).push(a); });
  const contexts = Object.keys(ctxMap)
    .map((ctx) => {
      const acts = ctxMap[ctx];
      return { ctx, machine: acts.find((a) => a.machine)?.machine ?? '', acts, last: acts[0]?.created_at ?? null };
    })
    .sort((a, b) => (b.last ?? '').localeCompare(a.last ?? ''));

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
          {/* Zona Arquitecto — columnas por contexto */}
          <div className="mb-6 rounded-2xl border border-purple-500/30 bg-purple-500/[0.06] p-4">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className="text-xl">🧠</span>
              <span className="text-base font-semibold text-white">Arquitecto</span>
              <span className="text-xs text-gray-400">centro de mando · qué trabajé y a qué se refiere</span>
              {hubs[0]?.next_task && <span className="ml-auto text-xs text-fluya-green">→ {hubs[0].next_task}</span>}
            </div>
            {contexts.length === 0 ? (
              <p className="text-xs text-gray-500">Sin actividad registrada todavía.</p>
            ) : (
              <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))' }}>
                {contexts.map((c) => (
                  <div key={c.ctx} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-purple-200 truncate">{c.ctx}</span>
                      {c.machine && <span className="text-[10px] text-gray-500 shrink-0">🖥️ {c.machine}</span>}
                    </div>
                    <div className="mt-2 space-y-1">
                      {c.acts.slice(0, 6).map((a, i) => (
                        <p key={i} className="text-[11px] text-gray-400 leading-snug">· {a.action} <span className="text-gray-600">· {ago(a.created_at)}</span></p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

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

          {/* Columnas por MÁQUINA: proyectos + sesiones activas adentro */}
          {machineCols.length === 0 ? (
            <p className="text-gray-500 text-sm">Nada coincide con el filtro.</p>
          ) : (
            <div className="grid gap-4 items-start" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))' }}>
              {machineCols.map(({ machine, ws, sess }) => (
                <section key={machine} className="space-y-3">
                  <h2 className="text-sm font-semibold text-purple-300 flex items-center gap-2 pb-2 border-b border-white/10">
                    🖥️ {machine} <span className="text-xs text-gray-500 font-normal">({ws.length + sess.length})</span>
                  </h2>
                  {ws.map((b) => (
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
                  {sess.map((s) => <SessionCard key={s.session_id} s={s} />)}
                </section>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
