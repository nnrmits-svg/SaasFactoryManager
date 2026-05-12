// Tools del bot AI Fluya — el modelo las llama para leer datos reales del usuario
// autenticado. Todo scopeado por user_id (defense in depth, RLS ya filtra).
//
// Devolver objetos JSON-serializable (sin Date, sin BigInt). El modelo los lee
// como texto.

import { tool } from 'ai';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

async function getUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

// ============================================================
// Tool 1: list_my_projects — lista proyectos del usuario
// ============================================================
const listMyProjects = tool({
  description:
    'Lista todos los proyectos del usuario autenticado con su estado actual. ' +
    'Usar cuando el usuario pregunte "que proyectos tengo", "mostrame mis proyectos", "cuantos proyectos tengo".',
  inputSchema: z.object({}),
  execute: async () => {
    const userId = await getUserId();
    if (!userId) return { error: 'No autenticado' };

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('projects')
      .select('id, name, status, agent_status, local_path, sf_version, updated_at')
      .eq('user_id', userId)
      .order('name');

    if (error) return { error: error.message };
    return {
      total: data?.length ?? 0,
      projects: data ?? [],
    };
  },
});

// ============================================================
// Tool 2: get_project_status — detalle de un proyecto especifico
// ============================================================
const getProjectStatus = tool({
  description:
    'Obtiene el estado completo de un proyecto especifico por nombre: status, agent_status, ' +
    'ultima actividad, conteo de skills por estado (synced/divergent/missing/external). ' +
    'Usar cuando el usuario pregunte por un proyecto concreto: "como va X", "estado de X".',
  inputSchema: z.object({
    name: z.string().describe('Nombre del proyecto (case-sensitive, ej: "SaasFactoryAgent")'),
  }),
  execute: async ({ name }) => {
    const userId = await getUserId();
    if (!userId) return { error: 'No autenticado' };

    const supabase = await createClient();
    const { data: project, error: pe } = await supabase
      .from('projects')
      .select('id, name, status, agent_status, local_path, sf_version, updated_at')
      .eq('user_id', userId)
      .ilike('name', name)
      .maybeSingle();

    if (pe) return { error: pe.message };
    if (!project) return { error: `Proyecto "${name}" no encontrado` };

    const { data: skills } = await supabase
      .from('project_skills')
      .select('skill_name, local_hash, registry_hash, last_synced_at')
      .eq('project_id', project.id);

    let synced = 0, divergent = 0, missing = 0, external = 0;
    for (const s of skills ?? []) {
      if (s.local_hash === null) missing++;
      else if (s.registry_hash === null) external++;
      else if (s.local_hash === s.registry_hash) synced++;
      else divergent++;
    }

    return {
      project,
      skills_summary: {
        total: skills?.length ?? 0,
        synced,
        divergent,
        missing,
        external,
      },
    };
  },
});

// ============================================================
// Tool 3: list_problematic_skills — skills con problemas
// ============================================================
const listProblematicSkills = tool({
  description:
    'Lista todos los skills con estado divergent, missing o external. Opcionalmente filtra por proyecto. ' +
    'Usar cuando el usuario pregunte "que skills tienen problemas", "cuales estan rotos", "skills divergent".',
  inputSchema: z.object({
    project: z
      .string()
      .optional()
      .describe('Nombre del proyecto (opcional). Si no se da, lista todos los proyectos del usuario.'),
  }),
  execute: async ({ project }) => {
    const userId = await getUserId();
    if (!userId) return { error: 'No autenticado' };

    const supabase = await createClient();

    let projectIds: string[] | null = null;
    if (project) {
      const { data: p } = await supabase
        .from('projects')
        .select('id')
        .eq('user_id', userId)
        .ilike('name', project)
        .maybeSingle();
      if (!p) return { error: `Proyecto "${project}" no encontrado` };
      projectIds = [p.id];
    } else {
      const { data: ps } = await supabase
        .from('projects')
        .select('id')
        .eq('user_id', userId);
      projectIds = (ps ?? []).map((r) => r.id as string);
    }

    if (!projectIds.length) return { problematic: [], total: 0 };

    const { data: skills } = await supabase
      .from('project_skills')
      .select('skill_name, local_hash, registry_hash, last_synced_at, projects(name)')
      .in('project_id', projectIds);

    type Row = {
      skill_name: string;
      local_hash: string | null;
      registry_hash: string | null;
      last_synced_at: string | null;
      projects: { name: string } | { name: string }[] | null;
    };

    const problematic = ((skills as unknown as Row[] | null) ?? [])
      .map((s) => {
        let state: 'synced' | 'divergent' | 'missing' | 'external';
        if (s.local_hash === null) state = 'missing';
        else if (s.registry_hash === null) state = 'external';
        else if (s.local_hash === s.registry_hash) state = 'synced';
        else state = 'divergent';
        const projObj = Array.isArray(s.projects) ? s.projects[0] : s.projects;
        return {
          project: projObj?.name ?? '(sin proyecto)',
          skill: s.skill_name,
          state,
          last_synced_at: s.last_synced_at,
        };
      })
      .filter((s) => s.state !== 'synced');

    return { problematic, total: problematic.length };
  },
});

// ============================================================
// Tool 4: get_cost_summary — costos agregados
// ============================================================
const getCostSummary = tool({
  description:
    'Resumen de costos de IA. Devuelve total, total por proyecto, top proyectos. ' +
    'Opcionalmente filtra por mes (formato YYYY-MM). Usar cuando el usuario pregunte ' +
    '"cuanto gaste", "costos del mes", "cual proyecto me cuesta mas".',
  inputSchema: z.object({
    month: z
      .string()
      .optional()
      .describe('Mes en formato YYYY-MM (ej: "2026-05"). Si no se da, suma todos los meses.'),
  }),
  execute: async ({ month }) => {
    const userId = await getUserId();
    if (!userId) return { error: 'No autenticado' };

    const supabase = await createClient();

    let query = supabase
      .from('claude_sessions')
      .select('cost_usd, ended_at, started_at, projects(name)')
      .eq('user_id', userId);

    if (month) {
      const start = `${month}-01T00:00:00Z`;
      const [y, m] = month.split('-').map(Number);
      const nextM = m === 12 ? 1 : m + 1;
      const nextY = m === 12 ? y + 1 : y;
      const end = `${nextY}-${String(nextM).padStart(2, '0')}-01T00:00:00Z`;
      query = query.gte('ended_at', start).lt('ended_at', end);
    }

    const { data, error } = await query;
    if (error) return { error: error.message };

    type SessionRow = {
      cost_usd: number | string;
      ended_at: string | null;
      started_at: string;
      projects: { name: string } | { name: string }[] | null;
    };

    const byProject = new Map<string, number>();
    let total = 0;
    for (const s of (data as unknown as SessionRow[] | null) ?? []) {
      const cost = Number(s.cost_usd) || 0;
      total += cost;
      const projObj = Array.isArray(s.projects) ? s.projects[0] : s.projects;
      const proj = projObj?.name ?? '(sin proyecto)';
      byProject.set(proj, (byProject.get(proj) ?? 0) + cost);
    }

    const top = Array.from(byProject.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, cost]) => ({ name, cost_usd: Number(cost.toFixed(4)) }));

    return {
      month: month ?? 'all',
      total_usd: Number(total.toFixed(4)),
      sessions: data?.length ?? 0,
      top_projects: top,
    };
  },
});

// ============================================================
// Tool 5: search_articles — busqueda en help center
// ============================================================
const searchArticles = tool({
  description:
    'Busca articulos del help center por texto en titulo/excerpt/content. Usar cuando ' +
    'el usuario pregunte por un tema general que pueda estar en la base de conocimiento. ' +
    'NO inventar URLs — los resultados devueltos solo tienen slug + title + excerpt. ' +
    'Para linkear, usar el formato relativo /help/<slug>.',
  inputSchema: z.object({
    query: z.string().describe('Texto a buscar (ej: "auto commit", "skill missing", "wizard")'),
  }),
  execute: async ({ query }) => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('help_articles')
      .select('slug, title, excerpt')
      .eq('is_published', true)
      .or(`title.ilike.%${query}%,content.ilike.%${query}%,excerpt.ilike.%${query}%`)
      .limit(5);

    if (error) return { error: error.message };
    return { results: data ?? [], total: data?.length ?? 0 };
  },
});

// ============================================================
// Export bundle
// ============================================================
export const helpTools = {
  list_my_projects: listMyProjects,
  get_project_status: getProjectStatus,
  list_problematic_skills: listProblematicSkills,
  get_cost_summary: getCostSummary,
  search_articles: searchArticles,
};
