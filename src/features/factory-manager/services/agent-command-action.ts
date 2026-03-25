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
    .select('id, user_id, machine_name, machine_id, os_type, agent_version, status, last_heartbeat')
    .eq('user_id', user.id)
    .order('last_heartbeat', { ascending: false });

  if (error || !data) return [];

  // Mark as offline if heartbeat > 2 minutes ago
  const now = Date.now();
  return data.map((row) => ({
    id: row.id as string,
    userId: row.user_id as string,
    machineName: row.machine_name as string,
    machineId: row.machine_id as string,
    osType: row.os_type as string,
    agentVersion: row.agent_version as string,
    status: (now - new Date(row.last_heartbeat as string).getTime() < 2 * 60 * 1000)
      ? 'active'
      : 'offline',
    lastHeartbeat: row.last_heartbeat as string,
  }));
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
