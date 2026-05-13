'use client';

// Modal de firma electrónica. Tres modos: canvas local, upload de PDF firmado, DocuSign.

import { useState } from 'react';
import { SignatureCanvas } from './signature-canvas';
import {
  signDocumentLocalAction,
  signDocumentUploadAction,
  signDocumentDocusignAction,
} from '../services/signature-actions';
import type { DocumentType } from '../types';

interface SignatureDialogProps {
  document_type: DocumentType;
  document_id: string;
  document_label: string; // 'SF-1042-01' o 'SOW-1042-01' etc
  open: boolean;
  onClose: () => void;
  onSigned: () => void;
}

type Mode = 'local' | 'upload' | 'docusign';

export function SignatureDialog({
  document_type,
  document_id,
  document_label,
  open,
  onClose,
  onSigned,
}: SignatureDialogProps) {
  const [mode, setMode] = useState<Mode>('local');
  const [signerName, setSignerName] = useState('');
  const [signerEmail, setSignerEmail] = useState('');
  const [signaturePng, setSignaturePng] = useState<string | null>(null);
  const [uploadPdfBase64, setUploadPdfBase64] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleSubmit() {
    setError(null);
    if (!signerName.trim() || !signerEmail.trim() || !signerEmail.includes('@')) {
      setError('Nombre y email del firmante son obligatorios.');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'local') {
        if (!signaturePng) {
          setError('Trazá tu firma en el canvas primero.');
          return;
        }
        const res = await signDocumentLocalAction({
          document_type,
          document_id,
          signer_name: signerName,
          signer_email: signerEmail,
          signature_png_base64: signaturePng,
        });
        if (!res.ok) {
          setError(res.error ?? 'Error firmando');
          return;
        }
        onSigned();
        onClose();
      } else if (mode === 'upload') {
        if (!uploadPdfBase64) {
          setError('Subí el PDF firmado primero.');
          return;
        }
        const res = await signDocumentUploadAction({
          document_type,
          document_id,
          signer_name: signerName,
          signer_email: signerEmail,
          pdf_base64: uploadPdfBase64,
        });
        if (!res.ok) {
          setError(res.error ?? 'Error procesando upload');
          return;
        }
        onSigned();
        onClose();
      } else if (mode === 'docusign') {
        const res = await signDocumentDocusignAction({
          document_type,
          document_id,
          signer_name: signerName,
          signer_email: signerEmail,
        });
        if (!res.ok) {
          setError(res.error ?? 'DocuSign no disponible');
          return;
        }
        // En implementación real: redirect a res.data.redirect_url
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setUploadPdfBase64(String(ev.target?.result ?? ''));
    reader.readAsDataURL(file);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-fluya-bg border border-white/10 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <header className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Firmar documento</h2>
            <p className="text-xs text-gray-500">{document_label}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors text-xl"
          >
            ✕
          </button>
        </header>

        {/* Mode selector */}
        <div className="flex gap-2 mb-4">
          {(['local', 'upload', 'docusign'] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`flex-1 px-3 py-2 rounded-xl border text-sm transition-all ${
                mode === m
                  ? 'border-purple-500 bg-purple-500/10 text-white'
                  : 'border-white/10 bg-white/5 text-gray-400 hover:text-white'
              }`}
            >
              {m === 'local' ? 'Canvas (ARG)' : m === 'upload' ? 'Subir PDF' : 'DocuSign'}
            </button>
          ))}
        </div>

        {/* Signer info */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <input
            type="text"
            value={signerName}
            onChange={(e) => setSignerName(e.target.value)}
            placeholder="Nombre completo"
            className="px-3 py-2 bg-black/30 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-purple-500/50"
          />
          <input
            type="email"
            value={signerEmail}
            onChange={(e) => setSignerEmail(e.target.value)}
            placeholder="email@cliente.com"
            className="px-3 py-2 bg-black/30 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-purple-500/50"
          />
        </div>

        {/* Mode-specific UI */}
        {mode === 'local' && (
          <div className="space-y-2">
            <p className="text-xs text-gray-400">
              Firma electrónica simple (Ley 25.506 ARG). Se registra hash SHA-256, IP y timestamp.
            </p>
            <SignatureCanvas onChange={setSignaturePng} />
          </div>
        )}

        {mode === 'upload' && (
          <div className="space-y-2">
            <p className="text-xs text-gray-400">
              Subí el PDF ya firmado externamente (firma digital con certificado, escaneo, etc).
            </p>
            <input
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              className="block w-full text-sm text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:bg-purple-500/20 file:text-purple-300 hover:file:bg-purple-500/30"
            />
            {uploadPdfBase64 && <p className="text-xs text-fluya-green">PDF cargado.</p>}
          </div>
        )}

        {mode === 'docusign' && (
          <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-3">
            <p className="text-xs text-yellow-400">
              DocuSign requiere `DOCUSIGN_API_KEY` y `DOCUSIGN_ACCOUNT_ID` en env vars. Hoy no está
              configurado — se va a habilitar en una fase futura.
            </p>
          </div>
        )}

        {error && (
          <p className="mt-3 text-sm text-red-400">{error}</p>
        )}

        <div className="flex justify-end gap-2 mt-6">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={busy}
            className="px-4 py-2 bg-gradient-to-r from-fluya-purple to-fluya-blue text-white rounded-xl text-sm font-medium disabled:opacity-40 transition-all"
          >
            {busy ? 'Firmando...' : 'Firmar'}
          </button>
        </div>
      </div>
    </div>
  );
}
