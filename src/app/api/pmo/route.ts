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

const AGENT_FRESH_MS = 3 * 3600 * 1000; // solo sesiones del Agent realmente activas (3h)

export async function GET(req: Request) {
  if (!auth(req)) return Response.json({ error: 'unauthorized' }, { status: 401 });
  const supabase = svc();

  // 1) Reportes explícitos (/tablero, sf-report)
  const { data: reports, error } = await supabase
    .from('pmo_sessions')
    .select('machine, project, role, status, current_task, next_task, office, updated_at');
  if (error) return Response.json({ error: error.message }, { status: 500 });

  // 2) AUTO-INGEST (opcional, ?agent=1). project_active_sessions = repos que el Agent
  // VIGILA, no "trabajo activo" real → por default NO se incluye (ensucia el board).
  // Reactivar cuando el Agent reporte actividad real (#55 activity-reporter, Sprint D).
  type Row = Record<string, unknown> & { machine: string; project: string };
  const agentRows: Row[] = [];
  if (new URL(req.url).searchParams.get('agent') === '1') {
    const [pasRes, agentsRes, projsRes] = await Promise.all([
      supabase.from('project_active_sessions').select('project_id, agent_instance_id, last_activity_at'),
      supabase.from('agent_instances').select('id, machine_name'),
      supabase.from('projects').select('id, name'),
    ]);
    const machineById = new Map((agentsRes.data ?? []).map((a) => [a.id as string, a.machine_name as string]));
    const nameById = new Map((projsRes.data ?? []).map((p) => [p.id as string, p.name as string]));
    const seen = new Set((reports ?? []).map((r) => `${r.machine}::${r.project}`));
    const now = Date.now();
    for (const s of pasRes.data ?? []) {
      const machine = machineById.get(s.agent_instance_id as string);
      const project = nameById.get(s.project_id as string);
      if (!machine || !project) continue;
      if (s.last_activity_at && now - new Date(s.last_activity_at as string).getTime() > AGENT_FRESH_MS) continue;
      const key = `${machine}::${project}`;
      if (seen.has(key)) continue;
      seen.add(key);
      agentRows.push({
        machine, project, role: 'executor', status: 'working',
        current_task: '(actividad detectada por el Agent)', next_task: null,
        office: 'principal', source: 'agent', updated_at: s.last_activity_at ?? null,
      });
    }
  }

  const board = [...(reports ?? []).map((r) => ({ ...r, source: 'report' })), ...agentRows].sort(
    (a, b) => (a.machine + a.project).localeCompare(b.machine + b.project),
  );
  return Response.json({ board });
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

// DELETE → saca una sesión del tablero (limpiar ruido/duplicados o proyecto terminado).
// Por query: ?project=X  (opcional &machine=Y). Sin machine → borra ese project en todas.
export async function DELETE(req: Request) {
  if (!auth(req)) return Response.json({ error: 'unauthorized' }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const project = (searchParams.get('project') ?? '').trim();
  const machine = (searchParams.get('machine') ?? '').trim();
  if (!project) return Response.json({ error: 'project requerido' }, { status: 400 });

  let q = svc().from('pmo_sessions').delete().eq('project', project);
  if (machine) q = q.eq('machine', machine);
  const { error, count } = await q.select('project', { count: 'exact' });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true, deleted: project, count: count ?? 0 });
}
