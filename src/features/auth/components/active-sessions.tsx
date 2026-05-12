'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Session {
  id: string;
  device_info: { browser?: string; os?: string };
  ip_address: string | null;
  user_agent: string | null;
  last_active_at: string;
  created_at: string;
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'ahora';
  if (diffMin < 60) return `hace ${diffMin}m`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `hace ${diffH}h`;
  return `hace ${Math.floor(diffH / 24)}d`;
}

export function ActiveSessions() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUA, setCurrentUA] = useState<string>('');

  useEffect(() => {
    setCurrentUA(navigator.userAgent);
    load();
  }, []);

  async function load() {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from('user_sessions')
      .select('id, device_info, ip_address, user_agent, last_active_at, created_at')
      .order('last_active_at', { ascending: false });
    setSessions((data as Session[]) ?? []);
    setLoading(false);
  }

  async function revoke(id: string) {
    if (!confirm('¿Cerrar esta sesión?')) return;
    const supabase = createClient();
    await supabase.from('user_sessions').delete().eq('id', id);
    load();
  }

  async function revokeAllOthers() {
    if (!confirm('¿Cerrar todas las demás sesiones?')) return;
    const supabase = createClient();
    await supabase.from('user_sessions').delete().neq('user_agent', currentUA);
    load();
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-white mb-1">Sesiones Activas</h2>
        <p className="text-sm text-gray-400">
          Dispositivos donde tu cuenta está abierta. Si ves uno que no reconocés, revocalo.
        </p>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
        {loading && <p className="text-sm text-gray-500">Cargando...</p>}

        {!loading && sessions.length === 0 && (
          <p className="text-sm text-gray-500 italic">
            Sin sesiones registradas. Se rastrea en el próximo login.
          </p>
        )}

        {!loading && sessions.length > 0 && (
          <>
            {sessions.length > 1 && (
              <div className="flex justify-end mb-3">
                <button
                  onClick={revokeAllOthers}
                  className="text-sm text-red-400 hover:text-red-300 transition-colors"
                >
                  Cerrar todas las demás
                </button>
              </div>
            )}
            <ul className="space-y-2">
              {sessions.map((s) => {
                const isCurrent = s.user_agent === currentUA;
                return (
                  <li
                    key={s.id}
                    className="flex items-center justify-between p-3 bg-white/5 rounded-xl"
                  >
                    <div>
                      <p className="text-sm text-white">
                        {s.device_info.browser ?? 'Browser'} en {s.device_info.os ?? 'OS'}
                        {isCurrent && (
                          <span className="ml-2 text-xs text-fluya-green">(actual)</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500">
                        {s.ip_address ?? 'IP no disponible'} · activo {timeAgo(s.last_active_at)}
                      </p>
                    </div>
                    {!isCurrent && (
                      <button
                        onClick={() => revoke(s.id)}
                        className="text-sm text-red-400 hover:text-red-300 transition-colors"
                      >
                        Revocar
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}
