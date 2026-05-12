// Server actions de firma electrónica.
// Tres providers soportados:
//   - 'local'    → canvas → PNG → upload a Storage + hash.
//   - 'upload'   → cliente sube PDF firmado externamente.
//   - 'docusign' → placeholder; requiere DOCUSIGN_API_KEY (no implementado todavía).

'use server';

import { createClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { computeSignatureHash } from './signature-hash';
import type { ActionResult, DocumentType, SignatureProvider } from '../types';

const BUCKET = 'contracts';

interface SignLocalInput {
  document_type: DocumentType;
  document_id: string;
  signer_name: string;
  signer_email: string;
  signature_png_base64: string;  // dataURL formato 'data:image/png;base64,...'
}

interface SignResult {
  signature_id: string;
  signed_pdf_path?: string | null;
}

// ============================================================
// FIRMA LOCAL (canvas)
// ============================================================
export async function signDocumentLocalAction(
  input: SignLocalInput,
): Promise<ActionResult<SignResult>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'No autenticado' };

  const hdrs = await headers();
  const ip =
    hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    hdrs.get('x-real-ip') ??
    'unknown';
  const userAgent = hdrs.get('user-agent') ?? 'unknown';
  const timestamp_iso = new Date().toISOString();

  // Cargar contenido del documento para hashear
  const content = await loadDocumentContent(supabase, input.document_type, input.document_id);
  if (!content.ok) return { ok: false, error: content.error };

  const signature_hash = computeSignatureHash({
    content: content.data,
    signer_email: input.signer_email,
    ip_address: ip,
    timestamp_iso,
  });

  // Guardar PNG de firma en Storage
  const pngBuffer = base64ToBuffer(input.signature_png_base64);
  const pngPath = `${input.document_type}s/${input.document_id}/signature-${Date.now()}.png`;
  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(pngPath, pngBuffer, { contentType: 'image/png', upsert: false });
  if (uploadErr) return { ok: false, error: `Upload firma: ${uploadErr.message}` };

  // Insertar row signatures
  const { data: sig, error: sigErr } = await supabase
    .from('signatures')
    .insert({
      document_type: input.document_type,
      document_id: input.document_id,
      provider: 'local' satisfies SignatureProvider,
      signer_name: input.signer_name,
      signer_email: input.signer_email,
      signature_hash,
      signature_png_path: pngPath,
      ip_address: ip,
      user_agent: userAgent,
      signed_at: timestamp_iso,
    })
    .select('id')
    .single();
  if (sigErr) return { ok: false, error: sigErr.message };

  // Marcar el documento padre como signed (sow/nda) o approved (quote)
  await markDocumentSigned(supabase, input.document_type, input.document_id, timestamp_iso);

  revalidatePath('/factory');
  return { ok: true, data: { signature_id: sig.id, signed_pdf_path: pngPath } };
}

// ============================================================
// UPLOAD PDF FIRMADO EXTERNO
// ============================================================
interface SignUploadInput {
  document_type: DocumentType;
  document_id: string;
  signer_name: string;
  signer_email: string;
  pdf_base64: string;  // dataURL del PDF firmado
}

export async function signDocumentUploadAction(
  input: SignUploadInput,
): Promise<ActionResult<SignResult>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'No autenticado' };

  const hdrs = await headers();
  const ip =
    hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    hdrs.get('x-real-ip') ??
    'unknown';
  const userAgent = hdrs.get('user-agent') ?? 'unknown';
  const timestamp_iso = new Date().toISOString();

  const content = await loadDocumentContent(supabase, input.document_type, input.document_id);
  if (!content.ok) return { ok: false, error: content.error };

  const signature_hash = computeSignatureHash({
    content: content.data,
    signer_email: input.signer_email,
    ip_address: ip,
    timestamp_iso,
  });

  const pdfBuffer = base64ToBuffer(input.pdf_base64);
  const pdfPath = `${input.document_type}s/${input.document_id}/signed-uploaded-${Date.now()}.pdf`;
  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(pdfPath, pdfBuffer, { contentType: 'application/pdf', upsert: false });
  if (uploadErr) return { ok: false, error: `Upload PDF: ${uploadErr.message}` };

  const { data: sig, error: sigErr } = await supabase
    .from('signatures')
    .insert({
      document_type: input.document_type,
      document_id: input.document_id,
      provider: 'upload' satisfies SignatureProvider,
      signer_name: input.signer_name,
      signer_email: input.signer_email,
      signature_hash,
      uploaded_pdf_path: pdfPath,
      ip_address: ip,
      user_agent: userAgent,
      signed_at: timestamp_iso,
    })
    .select('id')
    .single();
  if (sigErr) return { ok: false, error: sigErr.message };

  await markDocumentSigned(supabase, input.document_type, input.document_id, timestamp_iso, pdfPath);

  revalidatePath('/factory');
  return { ok: true, data: { signature_id: sig.id, signed_pdf_path: pdfPath } };
}

// ============================================================
// DOCUSIGN (placeholder)
// ============================================================
interface SignDocusignInput {
  document_type: DocumentType;
  document_id: string;
  signer_name: string;
  signer_email: string;
}

export async function signDocumentDocusignAction(
  input: SignDocusignInput,
): Promise<ActionResult<{ envelope_id: string; redirect_url: string }>> {
  const apiKey = process.env.DOCUSIGN_API_KEY;
  const accountId = process.env.DOCUSIGN_ACCOUNT_ID;
  if (!apiKey || !accountId) {
    return {
      ok: false,
      error:
        'DocuSign no configurado. Setea DOCUSIGN_API_KEY y DOCUSIGN_ACCOUNT_ID en env vars. ' +
        'Mientras tanto usá firma local o upload de PDF firmado.',
    };
  }
  // Implementación real: crear envelope vía DocuSign REST API, configurar tabs,
  // retornar URL de embedded signing. Pendiente de credenciales.
  return {
    ok: false,
    error: `DocuSign integration TBD para ${input.document_type}:${input.document_id}.`,
  };
}

// ============================================================
// Helpers
// ============================================================
type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

async function loadDocumentContent(
  supabase: SupabaseClient,
  document_type: DocumentType,
  document_id: string,
): Promise<{ ok: true; data: string } | { ok: false; error: string }> {
  if (document_type === 'sow') {
    const { data } = await supabase.from('sows').select('content_md, version, project_id').eq('id', document_id).maybeSingle();
    if (!data) return { ok: false, error: 'SOW no encontrado' };
    return { ok: true, data: String(data.content_md ?? '') + `|v${data.version}|${data.project_id}` };
  }
  if (document_type === 'nda') {
    const { data } = await supabase.from('ndas').select('content_md, version, project_id').eq('id', document_id).maybeSingle();
    if (!data) return { ok: false, error: 'NDA no encontrado' };
    return { ok: true, data: String(data.content_md ?? '') + `|v${data.version}|${data.project_id}` };
  }
  if (document_type === 'quote') {
    const { data } = await supabase.from('quotes').select('version, total_usd, project_id').eq('id', document_id).maybeSingle();
    if (!data) return { ok: false, error: 'Quote no encontrado' };
    return { ok: true, data: `quote|${data.project_id}|v${data.version}|${data.total_usd}` };
  }
  return { ok: false, error: `document_type ${document_type} no soportado para firma` };
}

async function markDocumentSigned(
  supabase: SupabaseClient,
  document_type: DocumentType,
  document_id: string,
  timestamp_iso: string,
  pdf_path?: string,
) {
  if (document_type === 'sow') {
    await supabase
      .from('sows')
      .update({ status: 'signed', signed_at: timestamp_iso, signed_pdf_path: pdf_path ?? null })
      .eq('id', document_id);
  } else if (document_type === 'nda') {
    await supabase
      .from('ndas')
      .update({ status: 'signed', signed_at: timestamp_iso, signed_pdf_path: pdf_path ?? null })
      .eq('id', document_id);
  } else if (document_type === 'quote') {
    await supabase
      .from('quotes')
      .update({ status: 'approved', approved_at: timestamp_iso })
      .eq('id', document_id);
  }
}

function base64ToBuffer(dataUrl: string): Buffer {
  // Strip 'data:image/png;base64,' prefix if present
  const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
  return Buffer.from(base64, 'base64');
}
