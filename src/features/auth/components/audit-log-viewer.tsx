// Server component: muestra los ultimos 30 audit_logs. Solo founder (RLS).

import { createClient } from '@/lib/supabase/server';
import { isFounder } from '@/features/auth/services/permissions';

interface AuditRow {
  id: string;
  user_email: string | null;
  user_role: string | null;
  action: string;
  resource: string;
  resource_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const ACTION_LABELS: Record<string, string> = {
  invite: '✉️ Invitación',
  role_change: '🔄 Cambio de rol',
  delete: '🗑️ Eliminación',
  login: '🔓 Login',
  logout: '🔒 Logout',
};

export async function AuditLogViewer() {
  if (!(await isFounder())) return null;

  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from('audit_logs')
    .select('id, user_email, user_role, action, resource, resource_id, details, created_at')
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) {
    return (
      <section className="bg-white/5 border border-red-500/20 rounded-2xl p-6">
        <h2 className="text-xl font-semibold text-white mb-2">Audit Logs</h2>
        <p className="text-red-400 text-sm">Error: {error.message}</p>
      </section>
    );
  }

  const logs = (rows ?? []) as AuditRow[];

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-white mb-1">Audit Logs</h2>
        <p className="text-sm text-gray-400">
          Últimas 30 acciones críticas registradas. Solo founders ven este log.
        </p>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        {logs.length === 0 ? (
          <p className="p-5 text-sm text-gray-500 italic">Sin acciones registradas todavía.</p>
        ) : (
          <ul className="divide-y divide-white/5">
            {logs.map((r) => (
              <li key={r.id} className="px-5 py-3 flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white">
                    <span className="font-medium">{ACTION_LABELS[r.action] ?? r.action}</span>
                    <span className="text-gray-500"> · {r.resource}</span>
                    {r.resource_id && (
                      <span className="ml-1 text-xs font-mono text-gray-600">
                        {r.resource_id.slice(0, 8)}…
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {r.user_email ?? 'sistema'} ({r.user_role ?? 'n/a'})
                    {r.details && Object.keys(r.details).length > 0 && (
                      <span className="ml-2 font-mono text-[10px]">
                        {JSON.stringify(r.details)}
                      </span>
                    )}
                  </p>
                </div>
                <span className="text-xs text-gray-600 shrink-0 ml-3">{formatTime(r.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
