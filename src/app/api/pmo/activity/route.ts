// Mission Control — feed de actividad del Arquitecto (tagueado por contexto).
// POST   → registra una acción { project (contexto), machine, action }.
// DELETE → resetea (?project=X opcional; sin él, borra todo).
// Auth: Bearer KB_INGEST_TOKEN.

import { createClient } from '@supabase/supabase-js';

function auth(req: Request): boolean {
  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
  return !!process.env.KB_INGEST_TOKEN && token === process.env.KB_INGEST_TOKEN;
}
function svc() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

export async function POST(req: Request) {
  if (!auth(req)) return Response.json({ error: 'unauthorized' }, { status: 401 });
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return Response.json({ error: 'invalid json' }, { status: 400 }); }

  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
  const project = str(body.project);   // el CONTEXTO (a qué se refiere el trabajo)
  const action = str(body.action);
  if (!project || !action) return Response.json({ error: 'project (contexto) y action requeridos' }, { status: 400 });

  const { error } = await svc().from('pmo_activity').insert({
    project, action, machine: str(body.machine) || null,
  });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true }, { status: 201 });
}

export async function DELETE(req: Request) {
  if (!auth(req)) return Response.json({ error: 'unauthorized' }, { status: 401 });
  const project = (new URL(req.url).searchParams.get('project') ?? '').trim();
  let q = svc().from('pmo_activity').delete();
  q = project ? q.eq('project', project) : q.neq('id', '00000000-0000-0000-0000-000000000000');
  const { error } = await q;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
