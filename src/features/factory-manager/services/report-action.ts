'use server';

import { createClient } from '@/lib/supabase/server';

export interface ProjectMeta {
  id: string;
  name: string;
  status: string;
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
      .select('id, name, status')
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

  const projects: ProjectMeta[] = (projectsRes.data ?? []).map((p) => ({
    id: p.id as string,
    name: p.name as string,
    status: (p.status as string | null) ?? 'active',
  }));

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
