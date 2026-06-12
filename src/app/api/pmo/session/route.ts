// Mission Control — sesiones activas de Claude Code (Fase 2).
// POST   → prende/actualiza una sesión (upsert por session_id). Lo llama el hook SessionStart.
// DELETE → apaga una sesión (?session_id=X). Lo llama el hook SessionEnd.
// Auth: Bearer KB_INGEST_TOKEN (mismo token de los dev tools).

import { createClient } from '@supabase/supabase-js';

const STATUSES = ['working', 'blocked', 'review', 'idle', 'done'];

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
  const session_id = str(body.session_id);
  const machine = str(body.machine);
  const project = str(body.project);
  if (!session_id || !machine || !project) {
    return Response.json({ error: 'session_id, machine y project requeridos' }, { status: 400 });
  }

  const now = new Date().toISOString();
  const row: Record<string, unknown> = {
    session_id, machine, project, last_seen_at: now,
    client: str(body.client) || null,
    current_task: body.current_task !== undefined ? str(body.current_task) || null : null,
    cwd: str(body.cwd) || null,
    office: str(body.office) || 'principal',
    status: STATUSES.includes(str(body.status)) ? str(body.status) : 'working',
  };

  // started_at solo en el primer insert; en updates conservamos el original.
  const { error } = await svc()
    .from('pmo_active_sessions')
    .upsert(row, { onConflict: 'session_id', ignoreDuplicates: false });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true, session_id }, { status: 201 });
}

export async function DELETE(req: Request) {
  if (!auth(req)) return Response.json({ error: 'unauthorized' }, { status: 401 });
  const session_id = (new URL(req.url).searchParams.get('session_id') ?? '').trim();
  if (!session_id) return Response.json({ error: 'session_id requerido' }, { status: 400 });

  const { data, error } = await svc()
    .from('pmo_active_sessions')
    .delete()
    .eq('session_id', session_id)
    .select('session_id');
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true, removed: data?.length ?? 0 });
}
