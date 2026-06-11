// PMO Board / Mission Control — tablero central de sesiones.
// GET  → lee el tablero (todas las sesiones reportadas).
// POST → upsert del estado de una (machine, project).
// Auth: Bearer KB_INGEST_TOKEN (mismo token de los dev tools).

import { createClient } from '@supabase/supabase-js';

const STATUSES = ['working', 'blocked', 'review', 'idle', 'done'];
const ROLES = ['executor', 'hub', 'agent'];

function auth(req: Request): boolean {
  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
  return !!process.env.KB_INGEST_TOKEN && token === process.env.KB_INGEST_TOKEN;
}
function svc() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

export async function GET(req: Request) {
  if (!auth(req)) return Response.json({ error: 'unauthorized' }, { status: 401 });
  const { data, error } = await svc()
    .from('pmo_sessions')
    .select('machine, project, role, status, current_task, next_task, office, updated_at')
    .order('machine', { ascending: true })
    .order('project', { ascending: true });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ board: data ?? [] });
}

export async function POST(req: Request) {
  if (!auth(req)) return Response.json({ error: 'unauthorized' }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return Response.json({ error: 'invalid json' }, { status: 400 }); }

  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
  const machine = str(body.machine);
  const project = str(body.project);
  if (!machine || !project) return Response.json({ error: 'machine y project requeridos' }, { status: 400 });

  const row: Record<string, unknown> = { machine, project, updated_at: new Date().toISOString() };
  if (STATUSES.includes(str(body.status))) row.status = str(body.status);
  if (ROLES.includes(str(body.role))) row.role = str(body.role);
  if (body.current_task !== undefined) row.current_task = str(body.current_task) || null;
  if (body.next_task !== undefined) row.next_task = str(body.next_task) || null;
  if (body.office !== undefined) row.office = str(body.office) || 'principal';

  const { error } = await svc().from('pmo_sessions').upsert(row, { onConflict: 'machine,project' });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true, machine, project }, { status: 201 });
}
