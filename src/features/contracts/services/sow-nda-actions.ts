// Server actions para crear SOW, NDA y ampliaciones (amendments).

'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { computeQuoteTotals } from './pricing';
import { formatQuoteNumber, formatSowNumber, formatNdaNumber, formatAmendmentNumber } from './numbering';
import type { ActionResult, QuoteLineItem, SowStatus, NdaStatus, AmendmentStatus, QuoteStatus } from '../types';

// ============================================================
// CREATE SOW
// ============================================================
interface CreateSowInput {
  quote_id: string;
  content_md?: string;
}

interface CreateSowResult {
  sow_id: string;
  number_label: string;
}

export async function createSowAction(
  input: CreateSowInput,
): Promise<ActionResult<CreateSowResult>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'No autenticado' };

  // Cargar quote + project para validar
  const { data: quote, error: qErr } = await supabase
    .from('quotes')
    .select('id, project_id, status, version')
    .eq('id', input.quote_id)
    .maybeSingle();
  if (qErr || !quote) return { ok: false, error: qErr?.message ?? 'Quote no encontrado' };
  if (quote.status === 'rejected' || quote.status === 'superseded') {
    return { ok: false, error: `No se puede generar SOW desde un quote ${quote.status}` };
  }

  const { data: project } = await supabase
    .from('projects')
    .select('id, name, project_number, business_brief, description')
    .eq('id', quote.project_id)
    .maybeSingle();
  if (!project?.project_number) return { ok: false, error: 'Proyecto sin project_number' };

  // Calcular version del SOW (max+1 para este proyecto)
  const { data: maxSow } = await supabase
    .from('sows')
    .select('version')
    .eq('project_id', quote.project_id)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();
  const version = (maxSow?.version ?? 0) + 1;

  // Auto-generar content_md básico si no se especifica
  const content_md = input.content_md ?? buildDefaultSowContent(project);

  const { data: sow, error: sowErr } = await supabase
    .from('sows')
    .insert({
      quote_id: input.quote_id,
      project_id: quote.project_id,
      version,
      status: 'draft' satisfies SowStatus,
      content_md,
      created_by: user.id,
    })
    .select('id')
    .single();
  if (sowErr) return { ok: false, error: sowErr.message };

  revalidatePath(`/project/${project.name}`);
  return {
    ok: true,
    data: {
      sow_id: sow.id,
      number_label: formatSowNumber(project.project_number, version),
    },
  };
}

// ============================================================
// CREATE NDA (solo si cliente.is_new)
// ============================================================
interface CreateNdaInput {
  project_id: string;
  client_id: string;
  content_md?: string;
}

interface CreateNdaResult {
  nda_id: string;
  number_label: string;
}

export async function createNdaAction(
  input: CreateNdaInput,
): Promise<ActionResult<CreateNdaResult>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'No autenticado' };

  // Validar que el cliente es nuevo (regla del founder: existentes no firman NDA)
  const { data: client } = await supabase
    .from('clients')
    .select('id, name, is_new')
    .eq('id', input.client_id)
    .maybeSingle();
  if (!client) return { ok: false, error: 'Cliente no encontrado' };
  if (!client.is_new) {
    return {
      ok: false,
      error: `${client.name} es cliente existente — no requiere NDA (regla del proyecto).`,
    };
  }

  const { data: project } = await supabase
    .from('projects')
    .select('id, name, project_number')
    .eq('id', input.project_id)
    .maybeSingle();
  if (!project?.project_number) return { ok: false, error: 'Proyecto sin project_number' };

  const { data: maxNda } = await supabase
    .from('ndas')
    .select('version')
    .eq('project_id', input.project_id)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();
  const version = (maxNda?.version ?? 0) + 1;

  const content_md = input.content_md ?? buildDefaultNdaContent(client.name as string);

  const { data: nda, error: ndaErr } = await supabase
    .from('ndas')
    .insert({
      project_id: input.project_id,
      client_id: input.client_id,
      version,
      status: 'draft' satisfies NdaStatus,
      content_md,
      created_by: user.id,
    })
    .select('id')
    .single();
  if (ndaErr) return { ok: false, error: ndaErr.message };

  revalidatePath(`/project/${project.name}`);
  return {
    ok: true,
    data: {
      nda_id: nda.id,
      number_label: formatNdaNumber(project.project_number, version),
    },
  };
}

// ============================================================
// CREATE AMENDMENT
// ============================================================
interface CreateAmendmentInput {
  project_id: string;
  reason: string;
  new_line_items: QuoteLineItem[];
  new_profit_margin_pct: number;
  new_notes?: string;
}

interface CreateAmendmentResult {
  amendment_id: string;
  amendment_number_label: string;  // 'AMP-1042-02'
  new_quote_id: string;
  new_quote_number_label: string;  // 'SF-1042-02'
}

export async function createAmendmentAction(
  input: CreateAmendmentInput,
): Promise<ActionResult<CreateAmendmentResult>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'No autenticado' };

  const { data: project } = await supabase
    .from('projects')
    .select('id, name, project_number')
    .eq('id', input.project_id)
    .maybeSingle();
  if (!project?.project_number) return { ok: false, error: 'Proyecto sin project_number' };

  // Quote activo actual (último aprobado o draft)
  const { data: parentQuote } = await supabase
    .from('quotes')
    .select('id, version')
    .eq('project_id', input.project_id)
    .in('status', ['approved', 'draft', 'sent'])
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Crear nuevo quote con line items y profit margin nuevos
  const totals = computeQuoteTotals(input.new_line_items, input.new_profit_margin_pct);
  const nextVersion = (parentQuote?.version ?? 0) + 1;

  const { data: newQuote, error: qErr } = await supabase
    .from('quotes')
    .insert({
      project_id: input.project_id,
      version: nextVersion,
      status: 'draft' satisfies QuoteStatus,
      total_usd: totals.grand_total_usd,
      profit_margin_pct: input.new_profit_margin_pct,
      notes: input.new_notes ?? null,
      created_by: user.id,
    })
    .select('id')
    .single();
  if (qErr) return { ok: false, error: qErr.message };

  // Insert line items del nuevo quote
  if (input.new_line_items.length > 0) {
    const itemsToInsert = input.new_line_items.map((it, idx) => ({
      quote_id: newQuote.id,
      type: it.type,
      label: it.label,
      qty: it.qty,
      unit_price_usd: it.unit_price_usd,
      total_usd: it.total_usd,
      recurrence_months: it.recurrence_months ?? 1,
      metadata: it.metadata ?? {},
      sort_order: it.sort_order ?? idx,
    }));
    await supabase.from('quote_line_items').insert(itemsToInsert);
  }

  // Marcar quote anterior como superseded
  if (parentQuote) {
    await supabase.from('quotes').update({ status: 'superseded' }).eq('id', parentQuote.id);
  }

  // Crear amendment row (numerar AMP-XXXX-MM)
  const { data: maxAmp } = await supabase
    .from('amendments')
    .select('amendment_number')
    .eq('project_id', input.project_id)
    .order('amendment_number', { ascending: false })
    .limit(1)
    .maybeSingle();
  const amendmentNumber = (maxAmp?.amendment_number ?? 0) + 1;

  const { data: amendment, error: aErr } = await supabase
    .from('amendments')
    .insert({
      project_id: input.project_id,
      amendment_number: amendmentNumber,
      reason: input.reason,
      status: 'draft' satisfies AmendmentStatus,
      parent_quote_id: parentQuote?.id ?? null,
      child_quote_id: newQuote.id,
      created_by: user.id,
    })
    .select('id')
    .single();
  if (aErr) return { ok: false, error: aErr.message };

  // Actualizar estimated_* del proyecto con los nuevos totales
  await supabase
    .from('projects')
    .update({
      estimated_ai_cost_usd: totals.ai_total_usd,
      estimated_labor_cost_usd: totals.labor_total_usd,
      estimated_fixed_cost_usd: totals.fixed_costs_total_usd,
      estimated_total_usd: totals.grand_total_usd,
    })
    .eq('id', input.project_id);

  revalidatePath(`/project/${project.name}`);
  return {
    ok: true,
    data: {
      amendment_id: amendment.id,
      amendment_number_label: formatAmendmentNumber(project.project_number, amendmentNumber),
      new_quote_id: newQuote.id,
      new_quote_number_label: formatQuoteNumber(project.project_number, nextVersion),
    },
  };
}

// ============================================================
// Helpers de contenido por defecto
// ============================================================
function buildDefaultSowContent(project: {
  name: string;
  description: string | null;
  business_brief: Record<string, unknown> | null;
}): string {
  const brief = (project.business_brief ?? {}) as Record<string, string>;
  const sections = [
    `## Resumen del proyecto`,
    project.description ?? brief.solucion ?? `Implementación del proyecto ${project.name}.`,
    `## Objetivos`,
    brief.kpi ? `Resultado medible: ${brief.kpi}` : 'KPI a definir con el cliente.',
    `## Alcance`,
    brief.flujo ?? 'Alcance funcional según presupuesto aprobado.',
    `## Usuarios del sistema`,
    brief.usuario ?? 'Definidos según relevamiento.',
    `## Entregables`,
    `Sistema funcional desplegado en producción, código fuente versionado en repositorio del cliente, ` +
      `documentación operativa básica, training inicial.`,
    `## Exclusiones`,
    `Mantenimiento posterior, soporte continuo y nuevas funcionalidades no detalladas en este SOW ` +
      `se cotizan como ampliaciones (AMP-XXXX-MM).`,
  ];
  return sections.join('\n\n');
}

function buildDefaultNdaContent(clientName: string): string {
  return [
    `## Objeto`,
    `Las partes acuerdan mantener bajo estricta confidencialidad toda información comercial, técnica, ` +
      `financiera y operativa que se intercambien durante la evaluación, propuesta, desarrollo y ejecución ` +
      `del proyecto entre ambas partes.`,
    `## Información confidencial`,
    `Incluye, sin limitarse a: brief de negocio, datos de clientes, código fuente, esquemas de base de ` +
      `datos, credenciales de acceso, estrategias comerciales, métricas de uso, planes de roadmap.`,
    `## Plazo`,
    `La obligación de confidencialidad rige durante toda la relación comercial y por **5 años** posteriores ` +
      `a su finalización, salvo prórroga acordada por escrito.`,
    `## Excepciones`,
    `No constituye violación: (a) información ya pública sin culpa del receptor, (b) información ya conocida ` +
      `por el receptor antes de la divulgación, (c) divulgación requerida por autoridad competente.`,
    `## Jurisdicción`,
    `Cualquier controversia se someterá a los tribunales ordinarios de la Ciudad Autónoma de Buenos Aires, ` +
      `República Argentina, renunciando ${clientName} a cualquier otro fuero o jurisdicción.`,
  ].join('\n\n');
}
