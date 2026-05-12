// Helper de hash criptográfico para firmas electrónicas.
// SHA-256(content + signer_email + ip + timestamp_iso) — usado en signatures.signature_hash.
// Garantiza inmutabilidad del consentimiento: cualquier cambio post-firma rompe el hash.

import { createHash } from 'crypto';

export interface HashInputs {
  /** Contenido firmado: content_md del SOW/NDA o el number_label del quote. */
  content: string;
  signer_email: string;
  ip_address: string;
  timestamp_iso: string;
}

export function computeSignatureHash(input: HashInputs): string {
  const blob = [input.content, input.signer_email, input.ip_address, input.timestamp_iso].join('|');
  return createHash('sha256').update(blob, 'utf8').digest('hex');
}

// Para validación post-firma: dado el row de signature + el content actual,
// verifica que el hash todavía matchea (no hubo tampering).
export function verifySignatureHash(
  stored_hash: string,
  inputs: HashInputs,
): boolean {
  return stored_hash === computeSignatureHash(inputs);
}
