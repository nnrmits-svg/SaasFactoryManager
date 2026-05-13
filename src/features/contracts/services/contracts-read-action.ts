// Server action para listar todos los contratos asociados a un proyecto.
// Usado por el tab Contratos en /project/[name].

'use server';

import { createClient } from '@/lib/supabase/server';
import { formatQuoteNumber, formatSowNumber, formatNdaNumber, formatAmendmentNumber } from './numbering';
import type { ActionResult } from '../types';

export interface ContractsBundle {
  project_id: string;
  project_number: number;
  project_name: string;
  client: { id: string; name: string; is_new: boolean } | null;
  quotes: Array<{
    id: string;
    number_label: string;
    version: number;
    status: string;
    total_usd: number;
    profit_margin_pct: number;
    created_at: string;
    approved_at: string | null;
    line_items_count: number;
  }>;
  sows: Array<{
    id: string;
    number_label: string;
    quote_id: string;
    version: number;
    status: string;
    signed_at: string | null;
    signed_pdf_path: string | null;
    created_at: string;
  }>;
  ndas: Array<{
    id: string;
    number_label: string;
    client_id: string;
    version: number;
    status: string;
    signed_at: string | null;
    signed_pdf_path: string | null;
    created_at: string;
  }>;
  amendments: Array<{
    id: string;
    number_label: string;
    amendment_number: number;
    reason: string;
    status: string;
    parent_quote_id: string | null;
    child_quote_id: string | null;
    approved_at: string | null;
    created_at: string;
  }>;
  signatures: Array<{
    id: string;
    document_type: string;
    document_id: string;
    provider: string;
    signer_name: string;
    signer_email: string;
    signed_at: string;
  }>;
}

export async function getProjectContractsAction(
  project_id: string,
): Promise<ActionResult<ContractsBundle>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'No autenticado' };

  const { data: project, error: pErr } = await supabase
    .from('projects')
    .select('id, name, project_number, client_id')
    .eq('id', project_id)
    .maybeSingle();
  if (pErr || !project) return { ok: false, error: pErr?.message ?? 'Proyecto no encontrado' };
  if (!project.project_number) {
    return { ok: false, error: 'Proyecto sin project_number (faltan migraciones?)' };
  }
  const projectNumber = project.project_number as number;

  let client: ContractsBundle['client'] = null;
  if (project.client_id) {
    const { data: c } = await supabase
      .from('clients')
      .select('id, name, is_new')
      .eq('id', project.client_id)
      .maybeSingle();
    if (c) client = { id: c.id, name: c.name as string, is_new: Boolean(c.is_new) };
  }

  const [quotesRes, sowsRes, ndasRes, amendmentsRes, signaturesRes] = await Promise.all([
    supabase
      .from('quotes')
      .select('id, version, status, total_usd, profit_margin_pct, created_at, approved_at')
      .eq('project_id', project_id)
      .order('version', { ascending: false }),
    supabase
      .from('sows')
      .select('id, quote_id, version, status, signed_at, signed_pdf_path, created_at')
      .eq('project_id', project_id)
      .order('version', { ascending: false }),
    supabase
      .from('ndas')
      .select('id, client_id, version, status, signed_at, signed_pdf_path, created_at')
      .eq('project_id', project_id)
      .order('version', { ascending: false }),
    supabase
      .from('amendments')
      .select('id, amendment_number, reason, status, parent_quote_id, child_quote_id, approved_at, created_at')
      .eq('project_id', project_id)
      .order('amendment_number', { ascending: false }),
    supabase
      .from('signatures')
      .select('id, document_type, document_id, provider, signer_name, signer_email, signed_at')
      .order('signed_at', { ascending: false })
      .limit(50),
  ]);

  // Count line items per quote
  const quoteIds = (quotesRes.data ?? []).map((q) => q.id);
  const liCountMap = new Map<string, number>();
  if (quoteIds.length > 0) {
    const { data: liRows } = await supabase
      .from('quote_line_items')
      .select('quote_id')
      .in('quote_id', quoteIds);
    (liRows ?? []).forEach((row) => {
      liCountMap.set(row.quote_id as string, (liCountMap.get(row.quote_id as string) ?? 0) + 1);
    });
  }

  return {
    ok: true,
    data: {
      project_id: project.id as string,
      project_number: projectNumber,
      project_name: project.name as string,
      client,
      quotes: (quotesRes.data ?? []).map((q) => ({
        id: q.id as string,
        number_label: formatQuoteNumber(projectNumber, q.version as number),
        version: q.version as number,
        status: q.status as string,
        total_usd: Number(q.total_usd),
        profit_margin_pct: Number(q.profit_margin_pct ?? 0),
        created_at: q.created_at as string,
        approved_at: (q.approved_at as string | null) ?? null,
        line_items_count: liCountMap.get(q.id as string) ?? 0,
      })),
      sows: (sowsRes.data ?? []).map((s) => ({
        id: s.id as string,
        number_label: formatSowNumber(projectNumber, s.version as number),
        quote_id: s.quote_id as string,
        version: s.version as number,
        status: s.status as string,
        signed_at: (s.signed_at as string | null) ?? null,
        signed_pdf_path: (s.signed_pdf_path as string | null) ?? null,
        created_at: s.created_at as string,
      })),
      ndas: (ndasRes.data ?? []).map((n) => ({
        id: n.id as string,
        number_label: formatNdaNumber(projectNumber, n.version as number),
        client_id: n.client_id as string,
        version: n.version as number,
        status: n.status as string,
        signed_at: (n.signed_at as string | null) ?? null,
        signed_pdf_path: (n.signed_pdf_path as string | null) ?? null,
        created_at: n.created_at as string,
      })),
      amendments: (amendmentsRes.data ?? []).map((a) => ({
        id: a.id as string,
        number_label: formatAmendmentNumber(projectNumber, a.amendment_number as number),
        amendment_number: a.amendment_number as number,
        reason: a.reason as string,
        status: a.status as string,
        parent_quote_id: (a.parent_quote_id as string | null) ?? null,
        child_quote_id: (a.child_quote_id as string | null) ?? null,
        approved_at: (a.approved_at as string | null) ?? null,
        created_at: a.created_at as string,
      })),
      signatures: (signaturesRes.data ?? []).map((s) => ({
        id: s.id as string,
        document_type: s.document_type as string,
        document_id: s.document_id as string,
        provider: s.provider as string,
        signer_name: s.signer_name as string,
        signer_email: s.signer_email as string,
        signed_at: s.signed_at as string,
      })),
    },
  };
}
