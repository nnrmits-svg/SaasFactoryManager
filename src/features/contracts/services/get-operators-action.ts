// Lee operadores del proyecto con su hourly_rate_usd configurado.
// Usado por el BudgetStep para armar el bloque Labor del presupuesto.

'use server';

import { createClient } from '@/lib/supabase/server';
import type { ActionResult } from '../types';

export interface Operator {
  id: string;
  full_name: string | null;
  email: string;
  hourly_rate_usd: number | null;
}

export async function getOperatorsAction(): Promise<ActionResult<Operator[]>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'No autenticado' };

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, hourly_rate_usd')
    .in('role', ['founder', 'operator'])
    .eq('status', 'active')
    .order('full_name', { ascending: true, nullsFirst: false });

  if (error) return { ok: false, error: error.message };

  return {
    ok: true,
    data: (data ?? []).map((r) => ({
      id: r.id,
      full_name: (r.full_name as string | null) ?? null,
      email: r.email as string,
      hourly_rate_usd: r.hourly_rate_usd ? Number(r.hourly_rate_usd) : null,
    })),
  };
}
