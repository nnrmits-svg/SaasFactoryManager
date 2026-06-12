'use server';

// Mission Control — server action de lectura del tablero PMO (Fase 2).
// Lee workstreams (pmo_sessions) + sesiones activas (pmo_active_sessions) con el
// cliente AUTENTICADO (RLS deja leer a cualquier usuario logueado).

import { createClient } from '@/lib/supabase/server';

export interface BoardRow {
  machine: string;
  project: string;
  role: 'executor' | 'hub' | 'agent';
  status: 'working' | 'blocked' | 'review' | 'idle' | 'done';
  current_task: string | null;
  next_task: string | null;
  pending_task: string | null;
  office: string | null;
  updated_at: string | null;
}

export interface ActiveSession {
  session_id: string;
  machine: string;
  project: string;
  client: string | null;
  status: string;
  current_task: string | null;
  cwd: string | null;
  started_at: string | null;
  last_seen_at: string | null;
}

export interface MissionControlData {
  board: BoardRow[];
  sessions: ActiveSession[];
}

export async function getMissionControlBoard(): Promise<MissionControlData> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { board: [], sessions: [] };

  const [bRes, sRes] = await Promise.all([
    supabase
      .from('pmo_sessions')
      .select('machine, project, role, status, current_task, next_task, pending_task, office, updated_at')
      .order('machine', { ascending: true })
      .order('project', { ascending: true }),
    supabase
      .from('pmo_active_sessions')
      .select('session_id, machine, project, client, status, current_task, cwd, started_at, last_seen_at')
      .order('last_seen_at', { ascending: false }),
  ]);

  return {
    board: (bRes.data ?? []) as BoardRow[],
    sessions: (sRes.data ?? []) as ActiveSession[],
  };
}
