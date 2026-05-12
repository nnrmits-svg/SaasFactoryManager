// Rate limiting via Postgres function (atomico). Fail-open: si el RPC falla
// (red, BD), permite la accion (defensiva — no bloquear usuarios por bugs en
// la capa de proteccion).
//
// Uso tipico (en server actions):
//   const ok = await checkRateLimit({ action: 'invite_user', max: 5, windowMin: 15 });
//   if (!ok) return { error: 'Demasiadas invitaciones en poco tiempo' };

import 'server-only';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

export interface RateLimitConfig {
  action: string;
  max?: number;
  windowMin?: number;
}

export async function checkRateLimit({
  action,
  max = 100,
  windowMin = 15,
}: RateLimitConfig): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const headersList = await headers();
    const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    const identifier = user?.id ?? `ip:${ip}`;

    const { data, error } = await supabase.rpc('check_rate_limit', {
      p_identifier: identifier,
      p_action: action,
      p_max_requests: max,
      p_window_minutes: windowMin,
    });

    if (error) {
      console.error('[rate-limit] RPC error:', error.message);
      return true; // fail-open
    }
    return data === true;
  } catch (err) {
    console.error('[rate-limit] error:', err);
    return true; // fail-open
  }
}

// Limites recomendados por accion
export const RATE_LIMITS = {
  invite_user:    { max: 10, windowMin: 60 },
  role_change:    { max: 20, windowMin: 60 },
  chat_message:   { max: 60, windowMin: 15 },
  signup:         { max: 3,  windowMin: 60 },
  password_reset: { max: 3,  windowMin: 60 },
} as const;
