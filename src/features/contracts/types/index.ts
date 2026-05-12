// Types canonicos del sistema de cotizacion + SOW + NDA + firma + versionado.
// Espejan el schema PRP-005 Fase 1 (supabase/migrations/20260512090000).

export type QuoteStatus = 'draft' | 'sent' | 'approved' | 'rejected' | 'superseded';
export type SowStatus = 'draft' | 'sent' | 'signed' | 'rejected' | 'superseded';
export type NdaStatus = 'draft' | 'sent' | 'signed' | 'rejected';
export type AmendmentStatus = 'draft' | 'sent' | 'approved' | 'rejected';
export type LineItemType = 'ai_tokens' | 'labor' | 'fixed_cost' | 'overhead' | 'profit';
export type SignatureProvider = 'local' | 'docusign' | 'upload';
export type DocumentType = 'quote' | 'sow' | 'nda' | 'amendment';

export type ProjectComplexity = 'simple' | 'medium' | 'complex' | 'enterprise';

export interface QuoteLineItem {
  id?: string;
  quote_id?: string;
  type: LineItemType;
  label: string;
  qty: number;
  unit_price_usd: number;
  total_usd: number;
  recurrence_months?: number;
  metadata?: Record<string, unknown>;
  sort_order?: number;
}

export interface Quote {
  id?: string;
  project_id: string;
  version: number;
  status: QuoteStatus;
  total_usd: number;
  profit_margin_pct: number;
  notes?: string | null;
  created_by?: string;
  approved_at?: string | null;
  rejected_at?: string | null;
  rejection_reason?: string | null;
  created_at?: string;
  updated_at?: string;
  line_items?: QuoteLineItem[];
}

export interface Sow {
  id?: string;
  quote_id: string;
  project_id: string;
  version: number;
  status: SowStatus;
  content_md?: string | null;
  signed_pdf_path?: string | null;
  signed_at?: string | null;
  rejected_at?: string | null;
  rejection_reason?: string | null;
}

export interface Nda {
  id?: string;
  project_id: string;
  client_id: string;
  version: number;
  status: NdaStatus;
  content_md?: string | null;
  signed_pdf_path?: string | null;
  signed_at?: string | null;
}

export interface Amendment {
  id?: string;
  project_id: string;
  amendment_number: number;
  reason: string;
  status: AmendmentStatus;
  parent_quote_id?: string | null;
  child_quote_id?: string | null;
  approved_at?: string | null;
}

export interface Client {
  id?: string;
  name: string;
  tax_id?: string | null;
  country?: string | null;
  primary_contact_name?: string | null;
  primary_contact_email?: string | null;
  primary_contact_phone?: string | null;
  address?: string | null;
  is_new: boolean;
}

export interface Signature {
  id?: string;
  document_type: DocumentType;
  document_id: string;
  provider: SignatureProvider;
  signer_name: string;
  signer_email: string;
  signature_hash: string;
  signature_png_path?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  external_envelope_id?: string | null;
  uploaded_pdf_path?: string | null;
  signed_at?: string;
}

export interface QuoteTotals {
  ai_total_usd: number;
  labor_total_usd: number;
  fixed_costs_total_usd: number;
  overhead_total_usd: number;
  subtotal_usd: number;        // ai + labor + fixed + overhead (cost basis)
  profit_amount_usd: number;   // subtotal * (margin_pct/100)
  grand_total_usd: number;     // subtotal + profit
}

export interface ActionResult<T = void> {
  ok: boolean;
  error?: string;
  data?: T;
}
