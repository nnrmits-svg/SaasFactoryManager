// SF Knowledge Base — registro de versiones de la plataforma (D2 "con el porqué").
// Lo llama la GitHub Action del kit en cada release, o el backfill. Token-auth.

import { createClient } from '@supabase/supabase-js';

const COMPONENTS = new Set(['kit-comercial', 'sf-manager', 'sf-agent']);

// Extrae skills/agents/rationale de las notas de release con LLM (para que la
// GitHub Action solo tenga que mandar el body crudo).
async function extractFromNotes(version: string, notes: string): Promise<{ skills_added: string[]; agents_added: string[]; rationale: string | null }> {
  const empty = { skills_added: [], agents_added: [], rationale: null };
  if (!notes || !process.env.OPENROUTER_API_KEY) return empty;
  const sys = `Extraé de las notas de release EXCLUSIVAMENTE JSON: {"skills_added":["nombre"],"agents_added":["nombre"],"rationale":"el PORQUÉ del cambio en 1-2 frases"}. Arrays vacíos si no aplica.`;
  try {
    const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}` },
      body: JSON.stringify({ model: 'google/gemini-2.5-flash', messages: [{ role: 'system', content: sys }, { role: 'user', content: `VERSIÓN ${version}:\n${notes.slice(0, 4000)}` }], max_tokens: 500, response_format: { type: 'json_object' } }),
    });
    if (!r.ok) return empty;
    const j = (await r.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const p = JSON.parse(j.choices?.[0]?.message?.content ?? '{}');
    return { skills_added: Array.isArray(p.skills_added) ? p.skills_added : [], agents_added: Array.isArray(p.agents_added) ? p.agents_added : [], rationale: p.rationale ?? null };
  } catch { return empty; }
}

export async function POST(req: Request) {
  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
  if (!process.env.KB_INGEST_TOKEN) return Response.json({ error: 'not configured' }, { status: 503 });
  if (!token || token !== process.env.KB_INGEST_TOKEN) return Response.json({ error: 'unauthorized' }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return Response.json({ error: 'invalid json' }, { status: 400 }); }

  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
  const arr = (v: unknown) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []);
  const component = str(body.component);
  const version = str(body.version);
  if (!COMPONENTS.has(component)) return Response.json({ error: 'bad component' }, { status: 400 });
  if (!version) return Response.json({ error: 'missing version' }, { status: 400 });

  // Si no mandan rationale, lo extraemos de las notas (raw_notes o changelog).
  let skills = arr(body.skills_added);
  let agents = arr(body.agents_added);
  let rationale = str(body.rationale) || null;
  const notes = str(body.raw_notes) || str(body.changelog);
  if (!rationale && notes) {
    const ex = await extractFromNotes(version, notes);
    if (!skills.length) skills = ex.skills_added;
    if (!agents.length) agents = ex.agents_added;
    rationale = ex.rationale;
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  const { data, error } = await supabase
    .from('platform_versions')
    .upsert({
      component,
      version,
      released_at: str(body.released_at) || new Date().toISOString(), // default a ahora: evita NULLs que el dashboard ordena al fondo
      skills_added: skills,
      skills_removed: arr(body.skills_removed),
      agents_added: agents,
      migrations_applied: arr(body.migrations_applied),
      changelog: str(body.changelog) || str(body.raw_notes) || null,
      rationale,
      commit_sha: str(body.commit_sha) || null,
    }, { onConflict: 'component,version' })
    .select('id')
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true, id: data.id, component, version }, { status: 201 });
}
