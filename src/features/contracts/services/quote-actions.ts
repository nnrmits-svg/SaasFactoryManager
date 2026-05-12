// Server actions del sistema de cotizacion. Solo founders pueden crear/aprobar.
// El project_number lo asigna el trigger PG; la version se calcula contra max(version).

'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { computeQuoteTotals } from './pricing';
import { estimateAiCost, type BusinessBriefInput } from './ai-estimator';
import { formatQuoteNumber } from './numbering';
import type {
  ActionResult,
  Quote,
  QuoteLineItem,
  QuoteStatus,
  QuoteTotals,
  ProjectComplexity,
} from '../types';

interface CreateQuoteInput {
  project_id: string;
  line_items: QuoteLineItem[];
  profit_margin_pct: number;
  notes?: string;
}

interface CreateQuoteResult {
  quote_id: string;
  project_number: number;
  version: number;
  number_label: string; // 'SF-1042-01'
  totals: QuoteTotals;
}

export async function createQuoteAction(
  input: CreateQuoteInput,
): Promise<ActionResult<CreateQuoteResult>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'No autenticado' };

  // 1. Confirmar que el proyecto existe y traer su project_number
  const { data: project, error: pErr } = await supabase
    .from('projects')
    .select('id, project_number')
    .eq('id', input.project_id)
    .maybeSingle();
  if (pErr) return { ok: false, error: pErr.message };
  if (!project) return { ok: false, error: 'Proyecto no encontrado' };
  if (project.project_number == null) {
    return { ok: false, error: 'El proyecto no tiene project_number asignado' };
  }

  // 2. Calcular version: max(version) actual + 1 (default 1 si no hay quotes)
  const { data: maxQuote } = await supabase
    .from('quotes')
    .select('version')
    .eq('project_id', input.project_id)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();
  const version = (maxQuote?.version ?? 0) + 1;

  // 3. Calcular totales
  const totals = computeQuoteTotals(input.line_items, input.profit_margin_pct);

  // 4. INSERT quote
  const { data: quote, error: qErr } = await supabase
    .from('quotes')
    .insert({
      project_id: input.project_id,
      version,
      status: 'draft' satisfies QuoteStatus,
      total_usd: totals.grand_total_usd,
      profit_margin_pct: input.profit_margin_pct,
      notes: input.notes ?? null,
      created_by: user.id,
    })
    .select('id')
    .single();
  if (qErr) return { ok: false, error: qErr.message };

  // 5. INSERT line items (con sort_order incremental si no viene)
  if (input.line_items.length > 0) {
    const itemsToInsert = input.line_items.map((it, idx) => ({
      quote_id: quote.id,
      type: it.type,
      label: it.label,
      qty: it.qty,
      unit_price_usd: it.unit_price_usd,
      total_usd: it.total_usd,
      recurrence_months: it.recurrence_months ?? 1,
      metadata: it.metadata ?? {},
      sort_order: it.sort_order ?? idx,
    }));
    const { error: liErr } = await supabase.from('quote_line_items').insert(itemsToInsert);
    if (liErr) return { ok: false, error: liErr.message };
  }

  // 6. Actualizar columnas estimated_* en projects (snapshot del último quote draft)
  await supabase
    .from('projects')
    .update({
      estimated_ai_cost_usd: totals.ai_total_usd,
      estimated_labor_cost_usd: totals.labor_total_usd,
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
      project_number: project.project_number,
      version,
      number_label: formatQuoteNumber(project.project_number, version),
      totals,
    },
  };
}

interface ApproveQuoteResult {
  quote_id: string;
  approved_at: string;
}

export async function approveQuoteAction(
  quote_id: string,
): Promise<ActionResult<ApproveQuoteResult>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'No autenticado' };

  const approvedAt = new Date().toISOString();
  const { data, error } = await supabase
    .from('quotes')
    .update({ status: 'approved', approved_at: approvedAt })
    .eq('id', quote_id)
    .eq('status', 'draft') // Solo aprueba si está en draft
    .select('id, project_id')
    .single();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: 'Quote no encontrado o ya no está en draft' };

  revalidatePath(`/project/${data.project_id}`);

  return { ok: true, data: { quote_id: data.id, approved_at: approvedAt } };
}

export async function rejectQuoteAction(
  quote_id: string,
  reason: string,
): Promise<ActionResult<{ quote_id: string }>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'No autenticado' };

  const { data, error } = await supabase
    .from('quotes')
    .update({
      status: 'rejected',
      rejected_at: new Date().toISOString(),
      rejection_reason: reason,
    })
    .eq('id', quote_id)
    .select('id, project_id')
    .single();
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/project/${data.project_id}`);
  return { ok: true, data: { quote_id: data.id } };
}

// Estimación read-only (no toca DB) — la usa la UI del wizard al cambiar complexity.
interface EstimateInput {
  brief: BusinessBriefInput;
  complexity: ProjectComplexity;
  model?: string;
  /** Si true, calibrar con histórico real de claude_sessions del founder. */
  calibrate_with_history?: boolean;
}

export async function estimateAiCostAction(
  input: EstimateInput,
): Promise<ActionResult<ReturnType<typeof estimateAiCost>>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'No autenticado' };

  let historical: number[] | undefined;
  if (input.calibrate_with_history) {
    const { data } = await supabase
      .from('claude_sessions')
      .select('cost_usd')
      .eq('user_id', user.id)
      .order('started_at', { ascending: false })
      .limit(20);
    historical = data?.map((r) => Number(r.cost_usd)).filter((n) => n > 0);
  }

  const estimate = estimateAiCost({
    brief: input.brief,
    complexity: input.complexity,
    model: input.model,
    historicalCostsUsd: historical,
  });

  return { ok: true, data: estimate };
}

// Read-only: obtener el quote activo más reciente de un proyecto + line_items.
export async function getActiveQuoteForProjectAction(
  project_id: string,
): Promise<ActionResult<Quote | null>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'No autenticado' };

  const { data: quote, error } = await supabase
    .from('quotes')
    .select('*')
    .eq('project_id', project_id)
    .in('status', ['draft', 'sent', 'approved'])
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!quote) return { ok: true, data: null };

  const { data: lineItems } = await supabase
    .from('quote_line_items')
    .select('*')
    .eq('quote_id', quote.id)
    .order('sort_order', { ascending: true });

  return { ok: true, data: { ...quote, line_items: lineItems ?? [] } as Quote };
}
