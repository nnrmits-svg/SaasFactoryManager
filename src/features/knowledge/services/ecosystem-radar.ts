// SF Knowledge Base — Radar de Ecosistema (Capa 2).
// Lee tracked_tools (watch list), trae novedades (GitHub releases / changelog),
// filtra relevancia con LLM contra el stack, e inserta ecosystem_updates.
// Lo dispara el cron /api/cron/ecosystem-radar (semanal) o un trigger manual.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'google/gemini-2.5-flash';

const STACK_CONTEXT = `Stack de la SaaS Factory (Grupo ITS):
- Next.js 16 App Router + React 19 + TypeScript
- Supabase (Postgres, RLS multi-tenant, pgvector)
- Vercel (deploy, crons, edge)
- Electron (SF Agent desktop)
Skills propios: blindar-app (anti-scraping/anti-bot: usa Cloudflare Turnstile + Upstash rate-limit + Sentry), add-login, add-security.
Le interesa: features que mejoren build/DX/seguridad, capacidades nuevas de Claude/Claude Code para sus agentes, y herramientas nuevas mejores o más baratas que las actuales.
Pain points recientes: identidad estable de dispositivos, RLS policies, schema cache de PostgREST.`;

const KINDS = ['new_feature', 'new_version', 'new_tool', 'security', 'deprecation'];
const LEVELS = ['low', 'medium', 'high'];

interface TrackedTool {
  id: string;
  name: string;
  category: string | null;
  changelog_url: string | null;
  source_kind: string | null;
  required_by_skills: string[] | null;
}

interface RawUpdate {
  kind?: string;
  title?: string;
  whats_new?: string;
  why_relevant?: string;
  suggested_action?: string;
  effort?: string;
  impact?: string;
}

function svc(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

async function fetchToolContent(tool: TrackedTool): Promise<string> {
  try {
    if (tool.source_kind === 'github_releases') {
      const m = (tool.changelog_url ?? '').match(/github\.com\/([^/]+)\/([^/]+)/);
      if (!m) return '';
      const api = `https://api.github.com/repos/${m[1]}/${m[2]}/releases?per_page=4`;
      const r = await fetch(api, {
        headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'sf-radar' },
      });
      if (!r.ok) return '';
      const rels = (await r.json()) as Array<{ name?: string; tag_name?: string; body?: string; published_at?: string; html_url?: string }>;
      return rels
        .slice(0, 4)
        .map((x) => `## ${x.name ?? x.tag_name} (${(x.published_at ?? '').slice(0, 10)})\n${(x.body ?? '').slice(0, 1200)}\nURL: ${x.html_url}`)
        .join('\n\n');
    }
    const r = await fetch(tool.changelog_url ?? '', { headers: { 'User-Agent': 'sf-radar' } });
    if (!r.ok) return '';
    const html = await r.text();
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 5000);
  } catch {
    return '';
  }
}

async function analyzeRelevance(tool: TrackedTool, content: string): Promise<RawUpdate[]> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || !content) return [];

  const sys = `Sos analista de vigilancia tecnológica de una software factory. Te paso novedades recientes de una herramienta y el stack del equipo. Identificá SOLO lo RELEVANTE para ESE stack (features nuevas útiles, versiones con seguridad/CVEs, o tools nuevas que podrían reemplazar la actual).

SÉ ESTRICTO con la relevancia: si para justificarla tenés que decir "aunque no es exactamente el stack", "podría explorar", "ecosistema relacionado", o similar → NO la incluyas. Solo novedades con impacto DIRECTO en el stack o los skills declarados. Es MUCHO mejor devolver 0 updates que forzar relevancia. Calidad sobre cantidad.

Respondé EXCLUSIVAMENTE JSON: {"updates":[{"kind":"new_feature|new_version|new_tool|security|deprecation","title":"corto","whats_new":"qué es","why_relevant":"por qué le sirve A ESTE stack (directo, sin hedging)","suggested_action":"qué hacer","effort":"low|medium|high","impact":"low|medium|high"}]}. Máximo 3 updates, los más relevantes. Si nada es claramente relevante: {"updates":[]}.`;
  const user = `HERRAMIENTA: ${tool.name} (${tool.category ?? ''})${tool.required_by_skills?.length ? `\nUsada por: ${tool.required_by_skills.join(', ')}` : ''}\n\nSTACK:\n${STACK_CONTEXT}\n\nNOVEDADES:\n${content}`;

  try {
    const r = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: sys },
          { role: 'user', content: user },
        ],
        max_tokens: 1200,
        response_format: { type: 'json_object' },
      }),
    });
    if (!r.ok) return [];
    const j = (await r.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const txt = j.choices?.[0]?.message?.content ?? '{}';
    const parsed = JSON.parse(txt) as { updates?: RawUpdate[] };
    return Array.isArray(parsed.updates) ? parsed.updates : [];
  } catch {
    return [];
  }
}

export interface RadarResult {
  toolsChecked: number;
  updatesInserted: number;
  perTool: Array<{ tool: string; contentChars: number; found: number; inserted: number }>;
}

export async function runEcosystemRadar(): Promise<RadarResult> {
  const supabase = svc();
  const { data: tools } = await supabase.from('tracked_tools').select('*');
  const { data: existing } = await supabase.from('ecosystem_updates').select('tool_id,title');

  const seen = new Set((existing ?? []).map((e) => `${e.tool_id}::${String(e.title ?? '').toLowerCase().trim()}`));
  let inserted = 0;
  const perTool: RadarResult['perTool'] = [];

  for (const tool of (tools ?? []) as TrackedTool[]) {
    const content = await fetchToolContent(tool);
    const updates = await analyzeRelevance(tool, content);
    const fresh = updates.filter((u) => u.title && !seen.has(`${tool.id}::${u.title.toLowerCase().trim()}`));

    for (const u of fresh) {
      const { error } = await supabase.from('ecosystem_updates').insert({
        tool_id: tool.id,
        kind: KINDS.includes(u.kind ?? '') ? u.kind : 'new_feature',
        title: String(u.title).slice(0, 200),
        whats_new: u.whats_new ?? null,
        why_relevant: u.why_relevant ?? null,
        suggested_action: u.suggested_action ?? null,
        affects_skills: tool.required_by_skills ?? [],
        effort: LEVELS.includes(u.effort ?? '') ? u.effort : null,
        impact: LEVELS.includes(u.impact ?? '') ? u.impact : null,
        source_url: tool.changelog_url,
        status: 'new',
      });
      if (!error) {
        inserted++;
        seen.add(`${tool.id}::${u.title!.toLowerCase().trim()}`);
      }
    }

    await supabase.from('tracked_tools').update({ last_checked_at: new Date().toISOString() }).eq('id', tool.id);
    perTool.push({ tool: tool.name, contentChars: content.length, found: updates.length, inserted: fresh.length });
  }

  return { toolsChecked: tools?.length ?? 0, updatesInserted: inserted, perTool };
}
