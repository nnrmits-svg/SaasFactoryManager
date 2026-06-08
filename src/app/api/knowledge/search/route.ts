// SF Knowledge Base — búsqueda desde Claude Code (skill /buscar-conocimiento).
// Lectura pública de items APPROVED (full-text español). Service role + filtro
// explícito status='approved' (no expone pending). Sin token requerido.

import { createClient } from '@supabase/supabase-js';

const COLS =
  'id, dimension, item_type, title, body, context, code_snippet, tags, tech_stack, status, times_referenced, created_at';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') ?? '').trim();
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') ?? '10', 10) || 10, 1), 50);

  if (!q) return Response.json({ error: 'missing q' }, { status: 400 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data, error } = await supabase
    .from('knowledge_items')
    .select(COLS)
    .eq('status', 'approved')
    .textSearch('search_tsv', q, { type: 'websearch', config: 'spanish' })
    .order('times_referenced', { ascending: false })
    .limit(limit);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ query: q, count: data?.length ?? 0, results: data ?? [] });
}
