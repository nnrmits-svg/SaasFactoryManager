// Tracking de sesiones de dispositivo. Cada vez que el usuario entra al
// Manager, hacemos upsert en user_sessions con su user_agent + ip. Le permite
// ver y revocar sesiones desde Settings.
//
// Limitacion: no podemos forzar logout en Supabase sin admin API. Lo que
// hacemos es eliminar la fila de user_sessions — el cookie sigue valido hasta
// que el usuario refresque (Supabase tiene su propio expiry).

import 'server-only';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

export async function trackSession(): Promise<void> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const headersList = await headers();
    const userAgent = headersList.get('user-agent') ?? 'unknown';
    const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim();

    // Upsert: si ya existe sesion para este user+UA, actualizar last_active.
    // (No hay UNIQUE en user_sessions hoy, asi que hacemos delete-then-insert
    // o update si existe).
    const { data: existing } = await supabase
      .from('user_sessions')
      .select('id')
      .eq('user_id', user.id)
      .eq('user_agent', userAgent)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('user_sessions')
        .update({ last_active_at: new Date().toISOString(), ip_address: ip ?? null })
        .eq('id', existing.id);
    } else {
      await supabase.from('user_sessions').insert({
        user_id: user.id,
        user_agent: userAgent,
        ip_address: ip ?? null,
        device_info: {
          browser: parseBrowser(userAgent),
          os: parseOS(userAgent),
        },
      });
    }
  } catch (err) {
    console.error('[sessions] track error:', err);
  }
}

function parseBrowser(ua: string): string {
  if (ua.includes('Edg/')) return 'Edge';
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Safari')) return 'Safari';
  return 'Otro';
}

function parseOS(ua: string): string {
  if (ua.includes('Windows')) return 'Windows';
  if (ua.includes('Mac')) return 'macOS';
  if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('Linux')) return 'Linux';
  return 'Otro';
}
