// Server actions para generar PDFs (Quote / SOW / NDA) y subirlos a Supabase Storage.
// El bucket 'contracts' es privado; el cliente accede via signed URLs.

'use server';

import { createClient } from '@/lib/supabase/server';
import { renderToBuffer, type DocumentProps } from '@react-pdf/renderer';
import { createElement, type ReactElement } from 'react';
import { QuotePdfTemplate, type QuotePdfData } from '../pdf/quote-template';
import { SowPdfTemplate, type SowPdfData } from '../pdf/sow-template';
import { NdaPdfTemplate, type NdaPdfData } from '../pdf/nda-template';
import { formatQuoteNumber, formatSowNumber, formatNdaNumber } from './numbering';
import type { ActionResult } from '../types';

// Cast helper: nuestros templates retornan <Document>, pero TypeScript no infiere DocumentProps
// desde un FunctionComponentElement genérico. Sabemos que cumplen el contrato.
type PdfElement = ReactElement<DocumentProps>;

const BUCKET = 'contracts';

interface PdfUploadResult {
  path: string;        // contracts/<project_id>/quotes/SF-1042-01.pdf
  signed_url: string;  // URL temporal para preview/download
}

// ============================================================
// QUOTE PDF
// ============================================================
export async function generateQuotePdfAction(
  quote_id: string,
): Promise<ActionResult<PdfUploadResult>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'No autenticado' };

  // Cargar quote + line items + project + client
  const { data: quote, error: qErr } = await supabase
    .from('quotes')
    .select('id, project_id, version, total_usd, profit_margin_pct, notes, created_at')
    .eq('id', quote_id)
    .maybeSingle();
  if (qErr || !quote) return { ok: false, error: qErr?.message ?? 'Quote no encontrado' };

  const { data: lineItems } = await supabase
    .from('quote_line_items')
    .select('type, label, qty, unit_price_usd, total_usd')
    .eq('quote_id', quote_id)
    .order('sort_order', { ascending: true });

  const { data: project } = await supabase
    .from('projects')
    .select('id, name, project_number, client_id')
    .eq('id', quote.project_id)
    .maybeSingle();
  if (!project?.project_number) {
    return { ok: false, error: 'Proyecto sin project_number' };
  }

  let clientName: string | null = null;
  if (project.client_id) {
    const { data: client } = await supabase
      .from('clients')
      .select('name')
      .eq('id', project.client_id)
      .maybeSingle();
    clientName = (client?.name as string | null) ?? null;
  }

  // Recompute totals para el PDF (siempre desde line_items, no del campo total cached)
  const items = (lineItems ?? []).map((it) => ({
    type: it.type,
    label: it.label,
    qty: Number(it.qty),
    unit_price_usd: Number(it.unit_price_usd),
    total_usd: Number(it.total_usd),
  }));
  const subtotal = items
    .filter((i) => i.type !== 'profit')
    .reduce((s, i) => s + i.total_usd, 0);
  const margin = Number(quote.profit_margin_pct ?? 0);
  const profitAmount = round2((subtotal * margin) / 100);

  const data: QuotePdfData = {
    number_label: formatQuoteNumber(project.project_number, quote.version),
    project_name: project.name,
    client_name: clientName,
    date_iso: (quote.created_at as string) ?? new Date().toISOString(),
    line_items: items,
    totals: {
      ai_total_usd: items.filter((i) => i.type === 'ai_tokens').reduce((s, i) => s + i.total_usd, 0),
      labor_total_usd: items.filter((i) => i.type === 'labor').reduce((s, i) => s + i.total_usd, 0),
      fixed_costs_total_usd: items
        .filter((i) => i.type === 'fixed_cost')
        .reduce((s, i) => s + i.total_usd, 0),
      overhead_total_usd: items
        .filter((i) => i.type === 'overhead')
        .reduce((s, i) => s + i.total_usd, 0),
      subtotal_usd: round2(subtotal),
      profit_amount_usd: profitAmount,
      grand_total_usd: round2(subtotal + profitAmount),
    },
    profit_margin_pct: margin,
    notes: (quote.notes as string | null) ?? null,
  };

  const element = createElement(QuotePdfTemplate, { data }) as unknown as PdfElement;
  const buffer = await renderToBuffer(element);
  const path = `${project.id}/quotes/${data.number_label}.pdf`;
  return uploadAndSign(supabase, path, buffer);
}

// ============================================================
// SOW PDF
// ============================================================
export async function generateSowPdfAction(
  sow_id: string,
): Promise<ActionResult<PdfUploadResult>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'No autenticado' };

  const { data: sow, error: sErr } = await supabase
    .from('sows')
    .select('id, quote_id, project_id, version, content_md, created_at')
    .eq('id', sow_id)
    .maybeSingle();
  if (sErr || !sow) return { ok: false, error: sErr?.message ?? 'SOW no encontrado' };

  const { data: project } = await supabase
    .from('projects')
    .select('id, name, project_number, client_id')
    .eq('id', sow.project_id)
    .maybeSingle();
  if (!project?.project_number) return { ok: false, error: 'Proyecto sin project_number' };

  const { data: quote } = await supabase
    .from('quotes')
    .select('version, total_usd')
    .eq('id', sow.quote_id)
    .maybeSingle();

  let clientName: string | null = null;
  if (project.client_id) {
    const { data: client } = await supabase
      .from('clients')
      .select('name')
      .eq('id', project.client_id)
      .maybeSingle();
    clientName = (client?.name as string | null) ?? null;
  }

  const data: SowPdfData = {
    number_label: formatSowNumber(project.project_number, sow.version),
    quote_number_label: quote
      ? formatQuoteNumber(project.project_number, quote.version)
      : '—',
    project_name: project.name,
    client_name: clientName,
    date_iso: (sow.created_at as string) ?? new Date().toISOString(),
    content_md: (sow.content_md as string) ?? '',
    grand_total_usd: Number(quote?.total_usd ?? 0),
  };

  const element = createElement(SowPdfTemplate, { data }) as unknown as PdfElement;
  const buffer = await renderToBuffer(element);
  const path = `${project.id}/sows/${data.number_label}.pdf`;
  return uploadAndSign(supabase, path, buffer);
}

// ============================================================
// NDA PDF
// ============================================================
export async function generateNdaPdfAction(
  nda_id: string,
): Promise<ActionResult<PdfUploadResult>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'No autenticado' };

  const { data: nda, error: nErr } = await supabase
    .from('ndas')
    .select('id, project_id, client_id, version, content_md, created_at')
    .eq('id', nda_id)
    .maybeSingle();
  if (nErr || !nda) return { ok: false, error: nErr?.message ?? 'NDA no encontrado' };

  const { data: project } = await supabase
    .from('projects')
    .select('id, name, project_number')
    .eq('id', nda.project_id)
    .maybeSingle();
  if (!project?.project_number) return { ok: false, error: 'Proyecto sin project_number' };

  const { data: client } = await supabase
    .from('clients')
    .select('name, tax_id')
    .eq('id', nda.client_id)
    .maybeSingle();
  if (!client) return { ok: false, error: 'Cliente no encontrado' };

  const data: NdaPdfData = {
    number_label: formatNdaNumber(project.project_number, nda.version),
    client_name: client.name as string,
    client_tax_id: (client.tax_id as string | null) ?? null,
    date_iso: (nda.created_at as string) ?? new Date().toISOString(),
    content_md: (nda.content_md as string) ?? '',
  };

  const element = createElement(NdaPdfTemplate, { data }) as unknown as PdfElement;
  const buffer = await renderToBuffer(element);
  const path = `${project.id}/ndas/${data.number_label}.pdf`;
  return uploadAndSign(supabase, path, buffer);
}

// ============================================================
// Helper: subir buffer al bucket + devolver signed URL
// ============================================================
type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

async function uploadAndSign(
  supabase: SupabaseClient,
  path: string,
  buffer: Buffer,
): Promise<ActionResult<PdfUploadResult>> {
  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, {
      contentType: 'application/pdf',
      upsert: true,
    });
  if (uploadErr) return { ok: false, error: `Storage upload: ${uploadErr.message}` };

  const { data: signed, error: signErr } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 60); // 1 hora
  if (signErr || !signed) {
    return { ok: false, error: `Signed URL: ${signErr?.message ?? 'no se generó'}` };
  }

  return { ok: true, data: { path, signed_url: signed.signedUrl } };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
