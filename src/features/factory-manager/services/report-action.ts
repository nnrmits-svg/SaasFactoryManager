'use server';

import { createClient } from '@/lib/supabase/server';

export interface ProjectMeta {
  id: string;
  name: string;
  status: string;
  /** Sum of `work_sessions.duration_minutes` for the project. Project-level,
   *  not filter-dependent, so $/h stays stable regardless of how the user
   *  slices `claude_sessions` by model/month. */
  totalWorkMinutes: number;
}

export interface ClaudeSessionRow {
  id: string;
  projectId: string | null;
  projectName: string | null;
  workSessionId: string | null;
  workSessionMinutes: number | null;
  model: string | null;
  startedAt: string;
  endedAt: string | null;
  tokensInput: number;
  tokensOutput: number;
  tokensCached: number;
  costUsd: number;
  promptCount: number;
}

/** Detailed claude_sessions row for a single project's "AI Activity" tab. */
export interface ClaudeSessionDetailRow {
  id: string;
  startedAt: string;
  endedAt: string | null;
  model: string | null;
  hostname: string | null;
  tokensInput: number;
  tokensOutput: number;
  tokensCached: number;
  costUsd: number;
  promptCount: number;
}

export interface ReportsData {
  projects: ProjectMeta[];
  sessions: ClaudeSessionRow[];
  generatedAt: string;
}

/**
 * Returns all the user's projects (for the project filter) and their raw
 * `claude_sessions`. The page does the filtering and per-project aggregation
 * client-side — keeps the server action simple and the filters snappy.
 */
export async function getReportsData(): Promise<ReportsData> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { projects: [], sessions: [], generatedAt: new Date().toISOString() };
  }

  const [projectsRes, sessionsRes] = await Promise.all([
    supabase
      .from('projects')
      .select('id, name, status, work_sessions(duration_minutes)')
      .eq('user_id', user.id)
      .order('name'),
    supabase
      .from('claude_sessions')
      .select(`
        id, project_id, work_session_id, model,
        started_at, ended_at,
        tokens_input, tokens_output, tokens_cached,
        cost_usd, prompt_count,
        projects(id, name),
        work_sessions(duration_minutes)
      `)
      .eq('user_id', user.id)
      .order('started_at', { ascending: false })
      .limit(5000),
  ]);

  const projects: ProjectMeta[] = (projectsRes.data ?? []).map((p) => {
    const ws = (p.work_sessions as Array<{ duration_minutes: number }> | null) ?? [];
    const totalWorkMinutes = ws.reduce(
      (sum, s) => sum + (Number(s.duration_minutes) || 0),
      0,
    );
    return {
      id: p.id as string,
      name: p.name as string,
      status: (p.status as string | null) ?? 'active',
      totalWorkMinutes,
    };
  });

  type SessionRaw = {
    id: string;
    project_id: string | null;
    work_session_id: string | null;
    model: string | null;
    started_at: string;
    ended_at: string | null;
    tokens_input: number | string;
    tokens_output: number | string;
    tokens_cached: number | string;
    cost_usd: number | string;
    prompt_count: number;
    projects: { id: string; name: string } | null;
    work_sessions: { duration_minutes: number } | null;
  };

  const sessions: ClaudeSessionRow[] = ((sessionsRes.data as SessionRaw[] | null) ?? []).map((s) => ({
    id: s.id,
    projectId: s.project_id,
    projectName: s.projects?.name ?? null,
    workSessionId: s.work_session_id,
    workSessionMinutes: s.work_sessions?.duration_minutes ?? null,
    model: s.model,
    startedAt: s.started_at,
    endedAt: s.ended_at,
    tokensInput: Number(s.tokens_input),
    tokensOutput: Number(s.tokens_output),
    tokensCached: Number(s.tokens_cached),
    costUsd: Number(s.cost_usd),
    promptCount: s.prompt_count,
  }));

  return { projects, sessions, generatedAt: new Date().toISOString() };
}

/**
 * Reads `claude_sessions` for a single project, newest-first. Used by the
 * "AI Activity" tab in the project detail view. Verifies project ownership
 * server-side (defense in depth — RLS already filters).
 */
export async function getProjectClaudeSessions(
  projectId: string,
): Promise<ClaudeSessionDetailRow[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!project) return [];

  const { data, error } = await supabase
    .from('claude_sessions')
    .select(`
      id, started_at, ended_at, model, hostname,
      tokens_input, tokens_output, tokens_cached,
      cost_usd, prompt_count
    `)
    .eq('project_id', projectId)
    .order('started_at', { ascending: false })
    .limit(500);

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id as string,
    startedAt: row.started_at as string,
    endedAt: (row.ended_at as string | null) ?? null,
    model: (row.model as string | null) ?? null,
    hostname: (row.hostname as string | null) ?? null,
    tokensInput: Number(row.tokens_input),
    tokensOutput: Number(row.tokens_output),
    tokensCached: Number(row.tokens_cached),
    costUsd: Number(row.cost_usd),
    promptCount: row.prompt_count as number,
  }));
}
