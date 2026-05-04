'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  createProjectWithAgent,
  retryCreateProject,
  type CreateProjectWithAgentInput,
} from '../services/create-project-with-agent';
import type { CreateProjectCommandResult } from '../types';

export type ProjectCreationStatus =
  | 'idle'
  | 'pending'
  | 'creating'
  | 'created'
  | 'failed';

export interface ProjectCreationState {
  status: ProjectCreationStatus;
  projectId: string | null;
  commandId: string | null;
  stage: CreateProjectCommandResult['stage'] | null;
  result: CreateProjectCommandResult | null;
  error: string | null;
}

const STAGE_LABEL: Record<NonNullable<CreateProjectCommandResult['stage']>, string> = {
  folder: 'Creando carpeta del proyecto...',
  'git-init': 'Iniciando repo git...',
  'initial-commit': 'Primer commit...',
  'gh-create': 'Creando repo en GitHub...',
  'apply-skills': 'Aplicando skills (bitacora, project-plan, ...)',
  'final-commit': 'Commit final + push...',
  done: 'Listo',
};

export function stageLabel(stage: CreateProjectCommandResult['stage'] | null): string {
  if (!stage) return 'Esperando que el agente tome el comando...';
  return STAGE_LABEL[stage] ?? stage;
}

const POLL_INTERVAL_MS = 2000;
const TERMINAL_STATUSES = new Set(['done', 'error']);

export function useProjectCreation(initialCommandId?: string) {
  const [state, setState] = useState<ProjectCreationState>({
    status: 'idle',
    projectId: null,
    commandId: initialCommandId ?? null,
    stage: null,
    result: null,
    error: null,
  });

  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const cleanupChannel = useCallback(() => {
    if (channelRef.current) {
      const supabase = createClient();
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, []);

  const applyCommandUpdate = useCallback(
    (raw: { status: string; result: Record<string, unknown> | null }) => {
      const result = (raw.result as CreateProjectCommandResult | null) ?? null;
      const cmdStatus = raw.status as 'pending' | 'running' | 'done' | 'error';

      setState((prev) => {
        let nextStatus: ProjectCreationStatus = prev.status;
        if (cmdStatus === 'pending') nextStatus = 'pending';
        else if (cmdStatus === 'running') nextStatus = 'creating';
        else if (cmdStatus === 'done') nextStatus = result?.success ? 'created' : 'failed';
        else if (cmdStatus === 'error') nextStatus = 'failed';

        return {
          ...prev,
          status: nextStatus,
          stage: result?.stage ?? prev.stage,
          result,
          error:
            cmdStatus === 'error' || (cmdStatus === 'done' && !result?.success)
              ? result?.error ?? 'El agente reporto un error'
              : prev.error,
        };
      });

      if (TERMINAL_STATUSES.has(cmdStatus)) {
        stopPolling();
        cleanupChannel();
      }
    },
    [cleanupChannel, stopPolling],
  );

  const subscribe = useCallback(
    (commandId: string) => {
      cleanupChannel();
      const supabase = createClient();
      channelRef.current = supabase
        .channel(`project-creation-${commandId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'agent_commands',
            filter: `id=eq.${commandId}`,
          },
          (payload) => {
            const row = payload.new as { status: string; result: Record<string, unknown> | null };
            applyCommandUpdate(row);
          },
        )
        .subscribe();

      stopPolling();
      const check = async () => {
        const { data } = await supabase
          .from('agent_commands')
          .select('status, result')
          .eq('id', commandId)
          .single();
        if (!data) return;
        applyCommandUpdate({
          status: data.status as string,
          result: data.result as Record<string, unknown> | null,
        });
      };
      void check();
      pollRef.current = setInterval(check, POLL_INTERVAL_MS);
    },
    [applyCommandUpdate, cleanupChannel, stopPolling],
  );

  useEffect(() => {
    if (initialCommandId) subscribe(initialCommandId);
    return () => {
      stopPolling();
      cleanupChannel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startCreation = useCallback(
    async (input: CreateProjectWithAgentInput) => {
      setState({
        status: 'pending',
        projectId: null,
        commandId: null,
        stage: null,
        result: null,
        error: null,
      });
      const result = await createProjectWithAgent(input);
      if (!result.ok || !result.projectId || !result.commandId) {
        setState({
          status: 'failed',
          projectId: result.projectId ?? null,
          commandId: result.commandId ?? null,
          stage: null,
          result: null,
          error: result.error ?? 'No se pudo crear el proyecto',
        });
        return result;
      }
      setState((prev) => ({
        ...prev,
        projectId: result.projectId ?? null,
        commandId: result.commandId ?? null,
      }));
      subscribe(result.commandId);
      return result;
    },
    [subscribe],
  );

  const retry = useCallback(
    async (projectId: string) => {
      setState((prev) => ({ ...prev, status: 'pending', error: null, stage: null }));
      const result = await retryCreateProject(projectId);
      if (!result.ok || !result.commandId) {
        setState((prev) => ({
          ...prev,
          status: 'failed',
          error: result.error ?? 'No se pudo reintentar',
        }));
        return result;
      }
      setState((prev) => ({
        ...prev,
        projectId,
        commandId: result.commandId ?? null,
      }));
      subscribe(result.commandId);
      return result;
    },
    [subscribe],
  );

  const reset = useCallback(() => {
    stopPolling();
    cleanupChannel();
    setState({
      status: 'idle',
      projectId: null,
      commandId: null,
      stage: null,
      result: null,
      error: null,
    });
  }, [cleanupChannel, stopPolling]);

  return {
    state,
    startCreation,
    retry,
    reset,
  };
}
