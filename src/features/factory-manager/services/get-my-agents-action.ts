// Lista los SF Agents del founder con su estado de heartbeat actual.
// Usado por el wizard para que el founder elija a qué máquina mandar el comando.

'use server';

import { createClient } from '@/lib/supabase/server';

export interface AgentOption {
  id: string;
  machine_name: string;
  os_type: string | null;
  agent_version: string | null;
  last_heartbeat: string | null;
  /** true si latió hace menos de 60 segundos. */
  is_online: boolean;
  /** Texto legible: "Online", "Hace 2 min", "Hace 3h", etc. */
  freshness_label: string;
}

export async function getMyAgentsAction(): Promise<AgentOption[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('agent_instances')
    .select('id, machine_name, os_type, agent_version, last_heartbeat')
    .eq('user_id', user.id)
    .order('last_heartbeat', { ascending: false, nullsFirst: false });

  if (error) return [];

  const now = Date.now();
  return (data ?? []).map((row) => {
    const lastBeat = row.last_heartbeat ? new Date(row.last_heartbeat as string).getTime() : 0;
    const ageMs = now - lastBeat;
    const isOnline = lastBeat > 0 && ageMs < 60_000; // < 60 seg
    return {
      id: row.id as string,
      machine_name: (row.machine_name as string) ?? 'unknown',
      os_type: (row.os_type as string | null) ?? null,
      agent_version: (row.agent_version as string | null) ?? null,
      last_heartbeat: (row.last_heartbeat as string | null) ?? null,
      is_online: isOnline,
      freshness_label: formatFreshness(ageMs, isOnline),
    };
  });
}

function formatFreshness(ageMs: number, isOnline: boolean): string {
  if (isOnline) return 'Online';
  if (ageMs <= 0 || !isFinite(ageMs)) return 'Nunca conectado';
  const sec = Math.floor(ageMs / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  if (day > 0) return `Offline · hace ${day}d`;
  if (hr > 0) return `Offline · hace ${hr}h`;
  if (min > 0) return `Offline · hace ${min}min`;
  return `Offline · hace ${sec}s`;
}
