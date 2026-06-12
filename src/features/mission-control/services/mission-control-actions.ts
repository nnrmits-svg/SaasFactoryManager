'use server';

// Mission Control — server action de lectura del tablero PMO.
// Lee pmo_sessions con el cliente AUTENTICADO (RLS: team_reads_pmo deja leer a
// cualquier usuario logueado). Sin token ni service-role expuesto al browser.

import { createClient } from '@/lib/supabase/server';

export interface BoardRow {
  machine: string;
  project: string;
  role: 'executor' | 'hub' | 'agent';
  status: 'working' | 'blocked' | 'review' | 'idle' | 'done';
  current_task: string | null;
  next_task: string | null;
  office: string | null;
  updated_at: string | null;
}

export async function getMissionControlBoard(): Promise<BoardRow[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('pmo_sessions')
    .select('machine, project, role, status, current_task, next_task, office, updated_at')
    .order('machine', { ascending: true })
    .order('project', { ascending: true });

  if (error) return [];
  return (data ?? []) as BoardRow[];
}
