// Server action: expone el estimador de horas de labor al BudgetStep (client component).
// El estimador usa OPENROUTER_API_KEY (server-only), por eso va detrás de una action.

'use server';

import { createClient } from '@/lib/supabase/server';
import type { ActionResult } from '../types';
import {
  estimateLaborHours,
  type LaborEstimateInput,
  type LaborEstimate,
} from './labor-estimator';

export async function estimateLaborHoursAction(
  input: LaborEstimateInput,
): Promise<ActionResult<LaborEstimate>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'No autenticado' };

  try {
    const data = await estimateLaborHours(input);
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
