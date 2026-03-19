'use server';

import { createClient } from '@/lib/supabase/server';

export interface ProjectCostRow {
  name: string;
  status: string;
  totalMinutes: number;
  totalCommits: number;
  sessionCount: number;
  lastCommitDate: string | null;
}

export interface CostReport {
  projects: ProjectCostRow[];
  generatedAt: string;
}

export async function getProjectCostData(): Promise<CostReport> {
  const supabase = await createClient();

  const { data: projects, error } = await supabase
    .from('projects')
    .select(`
      name,
      status,
      commits(committed_at),
      work_sessions(duration_minutes)
    `)
    .order('name');

  if (error || !projects) {
    return { projects: [], generatedAt: new Date().toISOString() };
  }

  const rows: ProjectCostRow[] = projects.map((p) => {
    const commits = (p.commits as Array<{ committed_at: string }>) ?? [];
    const sessions = (p.work_sessions as Array<{ duration_minutes: number }>) ?? [];

    const totalMinutes = sessions.reduce((sum, s) => sum + s.duration_minutes, 0);

    const sortedCommits = [...commits].sort(
      (a, b) => new Date(b.committed_at).getTime() - new Date(a.committed_at).getTime(),
    );

    return {
      name: p.name,
      status: p.status ?? 'active',
      totalMinutes,
      totalCommits: commits.length,
      sessionCount: sessions.length,
      lastCommitDate: sortedCommits[0]?.committed_at ?? null,
    };
  });

  return {
    projects: rows,
    generatedAt: new Date().toISOString(),
  };
}
