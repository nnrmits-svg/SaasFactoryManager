// Genera un Quote en draft a partir de los gastos REALES ya registrados del proyecto:
// - claude_sessions (tokens + cost USD por modelo) → line items ai_tokens
// - work_sessions × profiles.hourly_rate_usd → line items labor (1 por operador)
//
// Pensado para proyectos en curso que no pasaron por el wizard, o para regenerar
// con datos reales. El founder ajusta margen y notas después.

'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { computeQuoteTotals } from './pricing';
import { formatQuoteNumber } from './numbering';
import type { ActionResult, QuoteLineItem, QuoteStatus, QuoteTotals } from '../types';

interface CreateFromActualsInput {
  project_id: string;
  /** Default 30%. Editable después en la UI. */
  profit_margin_pct?: number;
}

interface CreateFromActualsResult {
  quote_id: string;
  number_label: string;
  totals: QuoteTotals;
  source_summary: {
    sessions_count: number;
    models_count: number;
    operators_count: number;
    total_minutes: number;
    ai_cost_usd: number;
    labor_cost_usd: number;
  };
}

const DEFAULT_MARGIN_PCT = 30;

export async function createQuoteFromActualsAction(
  input: CreateFromActualsInput,
): Promise<ActionResult<CreateFromActualsResult>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'No autenticado' };

  // 1. Proyecto + project_number
  const { data: project, error: pErr } = await supabase
    .from('projects')
    .select('id, project_number')
    .eq('id', input.project_id)
    .maybeSingle();
  if (pErr) return { ok: false, error: pErr.message };
  if (!project) return { ok: false, error: 'Proyecto no encontrado' };
  if (project.project_number == null) {
    return { ok: false, error: 'El proyecto no tiene project_number asignado (revisar migración PRP-005 Fase 1)' };
  }

  // 2. claude_sessions del proyecto
  const { data: sessions, error: sErr } = await supabase
    .from('claude_sessions')
    .select('model, tokens_input, tokens_output, tokens_cached, cost_usd')
    .eq('project_id', input.project_id);
  if (sErr) return { ok: false, error: `Sesiones IA: ${sErr.message}` };

  // 3. work_sessions del proyecto + tarifa de cada operador
  const { data: workSessions, error: wErr } = await supabase
    .from('work_sessions')
    .select('user_id, duration_minutes')
    .eq('project_id', input.project_id)
    .not('user_id', 'is', null);
  if (wErr) return { ok: false, error: `Work sessions: ${wErr.message}` };

  const operatorIds = Array.from(
    new Set(((workSessions ?? []) as Array<{ user_id: string }>).map((w) => w.user_id)),
  );
  let profilesById = new Map<string, { full_name: string | null; email: string | null; rate: number }>();
  if (operatorIds.length > 0) {
    const { data: profilesData, error: prErr } = await supabase
      .from('profiles')
      .select('id, full_name, email, hourly_rate_usd')
      .in('id', operatorIds);
    if (prErr) return { ok: false, error: `Profiles: ${prErr.message}` };
    profilesById = new Map(
      ((profilesData ?? []) as Array<{
        id: string;
        full_name: string | null;
        email: string | null;
        hourly_rate_usd: number | string | null;
      }>).map((p) => [
        p.id,
        {
          full_name: p.full_name,
          email: p.email,
          rate: Number(p.hourly_rate_usd ?? 0),
        },
      ]),
    );
  }

  // 4. Agregar IA por modelo
  type ModelAgg = { tokens: number; cost: number; sessions: number };
  const byModel = new Map<string, ModelAgg>();
  for (const s of (sessions ?? []) as Array<{
    model: string | null;
    tokens_input: number | string;
    tokens_output: number | string;
    tokens_cached: number | string;
    cost_usd: number | string;
  }>) {
    const model = s.model ?? 'unknown';
    const tokens =
      Number(s.tokens_input) + Number(s.tokens_output) + Number(s.tokens_cached);
    const cost = Number(s.cost_usd);
    const agg = byModel.get(model) ?? { tokens: 0, cost: 0, sessions: 0 };
    agg.tokens += tokens;
    agg.cost += cost;
    agg.sessions += 1;
    byModel.set(model, agg);
  }

  // 5. Agregar labor por operador
  type OperatorAgg = { minutes: number; cost: number; rate: number; name: string };
  const byOperator = new Map<string, OperatorAgg>();
  for (const w of (workSessions ?? []) as Array<{ user_id: string; duration_minutes: number | string }>) {
    const prof = profilesById.get(w.user_id);
    const rate = prof?.rate ?? 0;
    if (rate <= 0) continue; // sin rate no podemos cotizar
    const minutes = Number(w.duration_minutes) || 0;
    if (minutes <= 0) continue;
    const cost = (minutes / 60) * rate;
    const name = prof?.full_name?.trim() || prof?.email || 'Operador';
    const existing = byOperator.get(w.user_id);
    if (!existing) {
      byOperator.set(w.user_id, { minutes, cost, rate, name });
    } else {
      existing.minutes += minutes;
      existing.cost += cost;
    }
  }

  // 6. Construir line items
  const lineItems: QuoteLineItem[] = [];
  let sortOrder = 0;

  for (const [model, agg] of byModel) {
    if (agg.tokens <= 0 || agg.cost <= 0) continue;
    const unitPrice = round6(agg.cost / agg.tokens); // USD/token (muy chico)
    lineItems.push({
      type: 'ai_tokens',
      label: `Tokens IA — ${model} (${agg.sessions} sesión${agg.sessions === 1 ? '' : 'es'})`,
      qty: agg.tokens,
      unit_price_usd: unitPrice,
      total_usd: round2(agg.cost),
      sort_order: sortOrder++,
      metadata: { source: 'actuals', model, sessions_count: agg.sessions },
    });
  }

  for (const [userId, agg] of byOperator) {
    const hours = round2(agg.minutes / 60);
    lineItems.push({
      type: 'labor',
      label: `Horas operador — ${agg.name}`,
      qty: hours,
      unit_price_usd: round2(agg.rate),
      total_usd: round2(agg.cost),
      sort_order: sortOrder++,
      metadata: { source: 'actuals', operator_user_id: userId, minutes: agg.minutes },
    });
  }

  if (lineItems.length === 0) {
    return {
      ok: false,
      error:
        'El proyecto no tiene gastos registrados (ni sesiones IA ni horas de operador con tarifa). Esperá a que el SF Agent registre actividad o cargá un quote manual.',
    };
  }

  const margin = input.profit_margin_pct ?? DEFAULT_MARGIN_PCT;
  const totals = computeQuoteTotals(lineItems, margin);

  // 7. Calcular versión
  const { data: maxQuote } = await supabase
    .from('quotes')
    .select('version')
    .eq('project_id', input.project_id)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();
  const version = (maxQuote?.version ?? 0) + 1;

  const totalMinutes = Array.from(byOperator.values()).reduce((s, o) => s + o.minutes, 0);
  const totalAi = totals.ai_total_usd;
  const totalLabor = totals.labor_total_usd;
  const notes = `Presupuesto generado automáticamente desde gastos reales del proyecto al ${new Date().toLocaleDateString('es-AR')} — ${(sessions ?? []).length} sesión(es) IA, ${(totalMinutes / 60).toFixed(1)} hora(s) de operador.`;

  // 8. INSERT quote
  const { data: quote, error: qErr } = await supabase
    .from('quotes')
    .insert({
      project_id: input.project_id,
      version,
      status: 'draft' satisfies QuoteStatus,
      total_usd: totals.grand_total_usd,
      profit_margin_pct: margin,
      notes,
      created_by: user.id,
    })
    .select('id')
    .single();
  if (qErr) return { ok: false, error: `Insert quote: ${qErr.message}` };

  // 9. INSERT line items
  const itemsToInsert = lineItems.map((it) => ({
    quote_id: quote.id,
    type: it.type,
    label: it.label,
    qty: it.qty,
    unit_price_usd: it.unit_price_usd,
    total_usd: it.total_usd,
    recurrence_months: 1,
    metadata: it.metadata ?? {},
    sort_order: it.sort_order ?? 0,
  }));
  const { error: liErr } = await supabase.from('quote_line_items').insert(itemsToInsert);
  if (liErr) return { ok: false, error: `Insert line items: ${liErr.message}` };

  // 10. Snapshot en projects
  await supabase
    .from('projects')
    .update({
      estimated_ai_cost_usd: totalAi,
      estimated_labor_cost_usd: totalLabor,
      estimated_fixed_cost_usd: totals.fixed_costs_total_usd,
      estimated_total_usd: totals.grand_total_usd,
    })
    .eq('id', input.project_id);

  revalidatePath(`/project/${input.project_id}`);
  revalidatePath('/factory');

  return {
    ok: true,
    data: {
      quote_id: quote.id,
      number_label: formatQuoteNumber(project.project_number, version),
      totals,
      source_summary: {
        sessions_count: (sessions ?? []).length,
        models_count: byModel.size,
        operators_count: byOperator.size,
        total_minutes: totalMinutes,
        ai_cost_usd: round2(totalAi),
        labor_cost_usd: round2(totalLabor),
      },
    },
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round6(n: number): number {
  return Math.round(n * 1_000_000) / 1_000_000;
}
