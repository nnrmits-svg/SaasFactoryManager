'use server';

import { createClient } from '@/lib/supabase/server';
import type { AgentCommandType, AgentInstance } from '../types';

/**
 * Get all active agent instances for the current user.
 */
export async function getAgentInstances(): Promise<AgentInstance[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('agent_instances')
    .select('id, user_id, machine_name, machine_id, os_type, agent_version, status, last_heartbeat, last_seen_at')
    .eq('user_id', user.id)
    .order('last_seen_at', { ascending: false });

  if (error || !data) return [];

  // El Agent legacy (v1) actualiza last_heartbeat; el Agent nuevo (Mig 003)
  // actualiza last_seen_at. Usamos el más reciente de ambos para no marcar
  // Offline a un Agent que sí está latiendo por la columna nueva.
  const ONLINE_THRESHOLD_MS = 60 * 1000;
  const now = Date.now();
  const freshestTs = (row: { last_heartbeat: unknown; last_seen_at: unknown }): number => {
    const hb = row.last_heartbeat ? new Date(row.last_heartbeat as string).getTime() : 0;
    const seen = row.last_seen_at ? new Date(row.last_seen_at as string).getTime() : 0;
    return Math.max(hb, seen);
  };

  return data.map((row) => {
    const lastSeenMs = freshestTs(row);
    return {
      id: row.id as string,
      userId: row.user_id as string,
      machineName: row.machine_name as string,
      machineId: row.machine_id as string,
      osType: row.os_type as string,
      agentVersion: row.agent_version as string,
      status: now - lastSeenMs < ONLINE_THRESHOLD_MS ? 'active' : 'offline',
      lastHeartbeat: new Date(lastSeenMs).toISOString(),
    };
  });
}

/**
 * Send a command to a specific agent instance (or all instances for the user).
 */
export async function sendAgentCommand(
  command: AgentCommandType,
  payload: Record<string, unknown> = {},
  instanceId?: string,
): Promise<{ ok: boolean; commandId?: string; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('agent_commands')
    .insert({
      user_id: user.id,
      instance_id: instanceId ?? null,
      command,
      payload,
      status: 'pending',
    })
    .select('id')
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? 'Insert failed' };
  }

  return { ok: true, commandId: data.id as string };
}
