'use client';

// Tab principal del sistema de contratos para un proyecto.
// Muestra: Quote activo + line items · SOWs · NDAs · Amendments · Signatures recientes.
// Acciones: generar PDF, firmar (3 modos), crear SOW, crear NDA, crear ampliación.

import { useState, useEffect, useCallback } from 'react';
import {
  getProjectContractsAction,
  type ContractsBundle,
} from '../services/contracts-read-action';
import { getActiveQuoteForProjectAction, approveQuoteAction } from '../services/quote-actions';
import {
  generateQuotePdfAction,
  generateSowPdfAction,
  generateNdaPdfAction,
} from '../services/pdf-actions';
import { createSowAction, createNdaAction } from '../services/sow-nda-actions';
import { SignatureDialog } from './signature-dialog';
import { AmendmentForm } from './amendment-form';
import type { Quote, DocumentType } from '../types';

interface ContractsTabProps {
  projectId: string;
}

interface SignTarget {
  document_type: DocumentType;
  document_id: string;
  label: string;
}

export function ContractsTab({ projectId }: ContractsTabProps) {
  const [bundle, setBundle] = useState<ContractsBundle | null>(null);
  const [activeQuote, setActiveQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [signTarget, setSignTarget] = useState<SignTarget | null>(null);
  const [showAmendmentForm, setShowAmendmentForm] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [bRes, qRes] = await Promise.all([
      getProjectContractsAction(projectId),
      getActiveQuoteForProjectAction(projectId),
    ]);
    if (bRes.ok && bRes.data) setBundle(bRes.data);
    if (qRes.ok) setActiveQuote(qRes.data ?? null);
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  async function handleGeneratePdf(type: DocumentType, id: string, label: string) {
    setBusy(`pdf-${id}`);
    setMsg(null);
    const action =
      type === 'quote'
        ? generateQuotePdfAction
        : type === 'sow'
          ? generateSowPdfAction
          : type === 'nda'
            ? generateNdaPdfAction
            : null;
    if (!action) {
      setMsg({ ok: false, text: `PDF para ${type} no soportado.` });
      setBusy(null);
      return;
    }
    const res = await action(id);
    setBusy(null);
    if (!res.ok || !res.data) {
      setMsg({ ok: false, text: `Error generando PDF: ${res.error}` });
      return;
    }
    setMsg({ ok: true, text: `PDF ${label} generado` });
    window.open(res.data.signed_url, '_blank', 'noopener,noreferrer');
  }

  async function handleApproveQuote(quoteId: string, label: string) {
    setBusy(`approve-${quoteId}`);
    setMsg(null);
    const res = await approveQuoteAction(quoteId);
    setBusy(null);
    if (!res.ok) {
      setMsg({ ok: false, text: res.error ?? 'Error aprobando' });
      return;
    }
    setMsg({ ok: true, text: `Quote ${label} aprobado` });
    void loadAll();
  }

  async function handleCreateSow(quoteId: string) {
    setBusy('create-sow');
    setMsg(null);
    const res = await createSowAction({ quote_id: quoteId });
    setBusy(null);
    if (!res.ok || !res.data) {
      setMsg({ ok: false, text: res.error ?? 'Error creando SOW' });
      return;
    }
    setMsg({ ok: true, text: `SOW ${res.data.number_label} creado en draft` });
    void loadAll();
  }

  async function handleCreateNda() {
    if (!bundle?.client) {
      setMsg({ ok: false, text: 'Falta asignar un cliente al proyecto para generar NDA.' });
      return;
    }
    setBusy('create-nda');
    setMsg(null);
    const res = await createNdaAction({ project_id: projectId, client_id: bundle.client.id });
    setBusy(null);
    if (!res.ok || !res.data) {
      setMsg({ ok: false, text: res.error ?? 'Error creando NDA' });
      return;
    }
    setMsg({ ok: true, text: `NDA ${res.data.number_label} creado en draft` });
    void loadAll();
  }

  function handleSignClick(type: DocumentType, id: string, label: string) {
    setSignTarget({ document_type: type, document_id: id, label });
  }

  function handleSigned() {
    setMsg({ ok: true, text: `Documento firmado` });
    void loadAll();
  }

  if (loading) {
    return <p className="text-sm text-gray-500">Cargando contratos…</p>;
  }
  if (!bundle) {
    return (
      <p className="text-sm text-red-400">
        No se pudieron cargar los contratos. Posiblemente el proyecto no tiene `project_number`
        asignado (revisar migración PRP-005 Fase 1).
      </p>
    );
  }

  const headerQuote = bundle.quotes[0]; // más reciente
  const isClientNew = bundle.client?.is_new ?? false;
  const hasNda = bundle.ndas.length > 0;

  return (
    <div className="space-y-6">
      {/* Mensaje */}
      {msg && (
        <div
          className={`p-3 rounded-xl text-sm ${
            msg.ok
              ? 'bg-fluya-green/10 border border-fluya-green/30 text-fluya-green'
              : 'bg-red-500/10 border border-red-500/30 text-red-400'
          }`}
        >
          {msg.text}
        </div>
      )}

      {/* Cliente */}
      <section className="bg-white/5 border border-white/10 rounded-2xl p-4">
        <h3 className="text-sm font-semibold text-white mb-2">Cliente</h3>
        {bundle.client ? (
          <p className="text-sm text-gray-300">
            {bundle.client.name}{' '}
            <span
              className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                isClientNew
                  ? 'bg-yellow-500/20 text-yellow-300'
                  : 'bg-fluya-green/20 text-fluya-green'
              }`}
            >
              {isClientNew ? 'Nuevo (requiere NDA)' : 'Existente'}
            </span>
          </p>
        ) : (
          <p className="text-xs text-gray-500">Sin cliente asociado a este proyecto.</p>
        )}
      </section>

      {/* Quote activo */}
      <section className="bg-white/5 border border-white/10 rounded-2xl p-4">
        <div className="flex items-baseline justify-between mb-3">
          <h3 className="text-sm font-semibold text-white">Presupuesto activo</h3>
          {headerQuote && (
            <span className="text-xs text-gray-500">
              {bundle.quotes.length} versión{bundle.quotes.length === 1 ? '' : 'es'}
            </span>
          )}
        </div>
        {!headerQuote && (
          <p className="text-sm text-gray-500">Sin presupuesto. Creá uno desde el wizard.</p>
        )}
        {headerQuote && (
          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <div>
                <p className="text-base font-mono text-white">{headerQuote.number_label}</p>
                <p className="text-xs text-gray-400">
                  {headerQuote.line_items_count} items · margen {headerQuote.profit_margin_pct}%
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-mono font-bold text-white">
                  USD ${headerQuote.total_usd.toFixed(2)}
                </p>
                <StatusBadge status={headerQuote.status} />
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5">
              <ActionBtn
                onClick={() => handleGeneratePdf('quote', headerQuote.id, headerQuote.number_label)}
                disabled={busy === `pdf-${headerQuote.id}`}
              >
                {busy === `pdf-${headerQuote.id}` ? '...' : '📄 Generar PDF'}
              </ActionBtn>
              {headerQuote.status === 'draft' && (
                <ActionBtn
                  onClick={() => handleApproveQuote(headerQuote.id, headerQuote.number_label)}
                  disabled={busy === `approve-${headerQuote.id}`}
                  variant="primary"
                >
                  ✓ Aprobar
                </ActionBtn>
              )}
              {headerQuote.status === 'approved' && (
                <ActionBtn
                  onClick={() => handleCreateSow(headerQuote.id)}
                  disabled={busy === 'create-sow'}
                  variant="primary"
                >
                  ➤ Generar SOW
                </ActionBtn>
              )}
              <ActionBtn onClick={() => setShowAmendmentForm(true)}>+ Ampliación</ActionBtn>
            </div>
          </div>
        )}
      </section>

      {/* Ampliación form */}
      {showAmendmentForm && activeQuote && (
        <AmendmentForm
          project_id={projectId}
          current_line_items={activeQuote.line_items ?? []}
          current_profit_margin_pct={activeQuote.profit_margin_pct}
          onCancel={() => setShowAmendmentForm(false)}
          onCreated={(r) => {
            setShowAmendmentForm(false);
            setMsg({
              ok: true,
              text: `Ampliación ${r.amendment_label} creó nuevo quote ${r.quote_label}`,
            });
            void loadAll();
          }}
        />
      )}

      {/* SOWs */}
      <section className="bg-white/5 border border-white/10 rounded-2xl p-4">
        <h3 className="text-sm font-semibold text-white mb-3">SOWs</h3>
        {bundle.sows.length === 0 && (
          <p className="text-xs text-gray-500">
            Sin SOWs. Generá uno desde un presupuesto aprobado.
          </p>
        )}
        <div className="space-y-2">
          {bundle.sows.map((sow) => (
            <div
              key={sow.id}
              className="flex items-center justify-between p-3 bg-black/20 border border-white/5 rounded-xl"
            >
              <div>
                <p className="text-sm font-mono text-white">{sow.number_label}</p>
                <p className="text-xs text-gray-500">
                  {sow.signed_at
                    ? `Firmado ${new Date(sow.signed_at).toLocaleDateString()}`
                    : 'Sin firmar'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={sow.status} />
                <ActionBtn
                  onClick={() => handleGeneratePdf('sow', sow.id, sow.number_label)}
                  disabled={busy === `pdf-${sow.id}`}
                  size="sm"
                >
                  📄
                </ActionBtn>
                {sow.status !== 'signed' && (
                  <ActionBtn
                    onClick={() => handleSignClick('sow', sow.id, sow.number_label)}
                    size="sm"
                    variant="primary"
                  >
                    ✍ Firmar
                  </ActionBtn>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* NDAs (solo si cliente.is_new) */}
      {isClientNew && (
        <section className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white">NDAs</h3>
            {!hasNda && bundle.client && (
              <ActionBtn
                onClick={handleCreateNda}
                disabled={busy === 'create-nda'}
                variant="primary"
                size="sm"
              >
                + Crear NDA
              </ActionBtn>
            )}
          </div>
          {bundle.ndas.length === 0 && (
            <p className="text-xs text-gray-500">Cliente nuevo. Generá el NDA para firmarlo.</p>
          )}
          <div className="space-y-2">
            {bundle.ndas.map((nda) => (
              <div
                key={nda.id}
                className="flex items-center justify-between p-3 bg-black/20 border border-white/5 rounded-xl"
              >
                <div>
                  <p className="text-sm font-mono text-white">{nda.number_label}</p>
                  <p className="text-xs text-gray-500">
                    {nda.signed_at
                      ? `Firmado ${new Date(nda.signed_at).toLocaleDateString()}`
                      : 'Sin firmar'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={nda.status} />
                  <ActionBtn
                    onClick={() => handleGeneratePdf('nda', nda.id, nda.number_label)}
                    disabled={busy === `pdf-${nda.id}`}
                    size="sm"
                  >
                    📄
                  </ActionBtn>
                  {nda.status !== 'signed' && (
                    <ActionBtn
                      onClick={() => handleSignClick('nda', nda.id, nda.number_label)}
                      size="sm"
                      variant="primary"
                    >
                      ✍ Firmar
                    </ActionBtn>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Amendments history */}
      {bundle.amendments.length > 0 && (
        <section className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-white mb-3">Historial de ampliaciones</h3>
          <div className="space-y-2">
            {bundle.amendments.map((a) => (
              <div
                key={a.id}
                className="p-3 bg-black/20 border border-white/5 rounded-xl"
              >
                <div className="flex items-baseline justify-between mb-1">
                  <p className="text-sm font-mono text-white">{a.number_label}</p>
                  <StatusBadge status={a.status} />
                </div>
                <p className="text-xs text-gray-400">{a.reason}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Versiones anteriores de quote (collapsed) */}
      {bundle.quotes.length > 1 && (
        <section className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-white mb-3">
            Versiones anteriores ({bundle.quotes.length - 1})
          </h3>
          <div className="space-y-2">
            {bundle.quotes.slice(1).map((q) => (
              <div key={q.id} className="flex items-center justify-between text-sm text-gray-400">
                <span className="font-mono">{q.number_label}</span>
                <span>${q.total_usd.toFixed(2)}</span>
                <StatusBadge status={q.status} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Signature dialog */}
      {signTarget && (
        <SignatureDialog
          document_type={signTarget.document_type}
          document_id={signTarget.document_id}
          document_label={signTarget.label}
          open
          onClose={() => setSignTarget(null)}
          onSigned={handleSigned}
        />
      )}
    </div>
  );
}

// ============================================================
// Sub-components
// ============================================================

function ActionBtn({
  children,
  onClick,
  disabled,
  variant = 'default',
  size = 'md',
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'default' | 'primary';
  size?: 'sm' | 'md';
}) {
  const padding = size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm';
  const variantClass =
    variant === 'primary'
      ? 'bg-gradient-to-r from-fluya-purple/30 to-fluya-blue/30 text-white border border-fluya-purple/40'
      : 'bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${padding} ${variantClass} rounded-lg font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-all`}
    >
      {children}
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: 'bg-gray-500/20 text-gray-300',
    sent: 'bg-blue-500/20 text-blue-300',
    approved: 'bg-fluya-green/20 text-fluya-green',
    signed: 'bg-fluya-green/20 text-fluya-green',
    rejected: 'bg-red-500/20 text-red-400',
    superseded: 'bg-yellow-500/20 text-yellow-300',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${styles[status] ?? 'bg-white/10 text-white'}`}>
      {status}
    </span>
  );
}
