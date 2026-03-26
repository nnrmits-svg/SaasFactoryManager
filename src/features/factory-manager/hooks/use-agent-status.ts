'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getAgentInstances, sendAgentCommand } from '../services/agent-command-action';
import type { AgentInstance, AgentCommandType } from '../types';

interface CommandState {
  commandId: string;
  command: AgentCommandType;
  status: 'pending' | 'running' | 'done' | 'error';
  result: Record<string, unknown> | null;
}

interface AgentStatusState {
  instances: AgentInstance[];
  loading: boolean;
  activeCommand: CommandState | null;
  error: string | null;
}

export function useAgentStatus() {
  const [state, setState] = useState<AgentStatusState>({
    instances: [],
    loading: true,
    activeCommand: null,
    error: null,
  });
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadInstances = useCallback(async () => {
    const instances = await getAgentInstances();
    setState((prev) => ({ ...prev, instances, loading: false }));
  }, []);

  // Load agent instances on mount + poll every 30s
  useEffect(() => {
    loadInstances();
    const interval = setInterval(loadInstances, 30_000);
    return () => clearInterval(interval);
  }, [loadInstances]);

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  // Poll command status as fallback (catches race condition with Realtime)
  function startPolling(commandId: string) {
    stopPolling();
    const supabase = createClient();

    const check = async () => {
      const { data } = await supabase
        .from('agent_commands')
        .select('status, result')
        .eq('id', commandId)
        .single();

      if (!data) return;

      const status = data.status as CommandState['status'];
      const result = data.result as Record<string, unknown> | null;

      setState((prev) => {
        if (!prev.activeCommand || prev.activeCommand.commandId !== commandId) return prev;
        if (prev.activeCommand.status === status) return prev;
        return {
          ...prev,
          activeCommand: { ...prev.activeCommand, status, result },
        };
      });

      if (status === 'done' || status === 'error') {
        stopPolling();
      }
    };

    // Check immediately, then every 2s
    check();
    pollRef.current = setInterval(check, 2000);
  }

  // Subscribe to agent_commands updates via Supabase Realtime
  function subscribeToCommand(commandId: string, command: AgentCommandType) {
    // Cleanup previous subscription
    if (channelRef.current) {
      createClient().removeChannel(channelRef.current);
    }

    const supabase = createClient();
    channelRef.current = supabase
      .channel(`command-${commandId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'agent_commands',
          filter: `id=eq.${commandId}`,
        },
        (payload) => {
          const updated = payload.new as {
            status: 'pending' | 'running' | 'done' | 'error';
            result: Record<string, unknown> | null;
          };
          setState((prev) => ({
            ...prev,
            activeCommand: prev.activeCommand
              ? { ...prev.activeCommand, status: updated.status, result: updated.result }
              : null,
          }));
          if (updated.status === 'done' || updated.status === 'error') {
            stopPolling();
          }
        },
      )
      .subscribe();

    setState((prev) => ({
      ...prev,
      activeCommand: { commandId, command, status: 'pending', result: null },
      error: null,
    }));

    // Start polling fallback to catch race conditions
    startPolling(commandId);
  }

  const sendCommand = useCallback(
    async (command: AgentCommandType, payload: Record<string, unknown> = {}, instanceId?: string) => {
      setState((prev) => ({ ...prev, error: null }));

      const result = await sendAgentCommand(command, payload, instanceId);
      if (!result.ok || !result.commandId) {
        setState((prev) => ({ ...prev, error: result.error ?? 'Error enviando comando' }));
        return;
      }

      subscribeToCommand(result.commandId, command);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        createClient().removeChannel(channelRef.current);
      }
      stopPolling();
    };
  }, []);

  const activeInstance = state.instances.find((i) => i.status === 'active') ?? null;
  const isAgentOnline = activeInstance !== null;

  return {
    instances: state.instances,
    activeInstance,
    isAgentOnline,
    loading: state.loading,
    activeCommand: state.activeCommand,
    error: state.error,
    sendCommand,
    refresh: loadInstances,
  };
}
