// SF Knowledge Base — ingesta desde Claude Code (skill /capturar-conocimiento).
// Autenticada por token de ingesta (KB_INGEST_TOKEN), NO por sesión de usuario.
// Inserta con service role como pending_review (el Leader cura desde el Manager).

import { createClient } from '@supabase/supabase-js';

const DIMENSIONS = new Set(['development', 'platform', 'suggestion']);
const ITEM_TYPES = new Set([
  'solution', 'decision', 'pattern', 'gotcha', 'anti_pattern',
  'skill_added', 'agent_added', 'version_bump', 'migration', 'skill_deprecated',
  'new_skill_suggested', 'deprecate_suggested', 'pattern_detected', 'merge_suggested',
]);
const SOURCE_TYPES = new Set(['ai_harvested', 'manual_dev', 'platform_change', 'proactive_engine']);

export async function POST(req: Request) {
  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
  const expected = process.env.KB_INGEST_TOKEN;
  if (!expected) {
    return Response.json({ error: 'KB ingest not configured' }, { status: 503 });
  }
  if (!token || token !== expected) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'invalid json' }, { status: 400 });
  }

  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
  const dimension = str(body.dimension);
  const item_type = str(body.item_type);
  const title = str(body.title);
  const content = str(body.body);
  const source_type = str(body.source_type) || 'manual_dev';

  if (!DIMENSIONS.has(dimension)) return Response.json({ error: 'bad dimension' }, { status: 400 });
  if (!ITEM_TYPES.has(item_type)) return Response.json({ error: 'bad item_type' }, { status: 400 });
  if (!SOURCE_TYPES.has(source_type)) return Response.json({ error: 'bad source_type' }, { status: 400 });
  if (!title) return Response.json({ error: 'missing title' }, { status: 400 });
  if (!content) return Response.json({ error: 'missing body' }, { status: 400 });

  const arr = (v: unknown) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data, error } = await supabase
    .from('knowledge_items')
    .insert({
      dimension,
      item_type,
      title,
      body: content,
      context: str(body.context) || null,
      code_snippet: str(body.code_snippet) || null,
      tags: arr(body.tags),
      tech_stack: arr(body.tech_stack),
      source_type,
      source_ref: str(body.source_ref) || null,
      status: 'pending_review',
    })
    .select('id')
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true, id: data.id, status: 'pending_review' }, { status: 201 });
}
