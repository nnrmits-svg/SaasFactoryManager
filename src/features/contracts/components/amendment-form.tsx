'use client';

// Formulario simple para crear una ampliación. Toma la razón (texto) + delta de costos
// vs. el quote anterior; el founder ajusta los line items en el siguiente paso.
// Versión MVP: la nueva versión del quote arranca como copia del último y se editan los items.

import { useState } from 'react';
import { createAmendmentAction } from '../services/sow-nda-actions';
import type { QuoteLineItem } from '../types';

interface AmendmentFormProps {
  project_id: string;
  current_line_items: QuoteLineItem[];
  current_profit_margin_pct: number;
  onCreated: (result: { amendment_label: string; quote_label: string }) => void;
  onCancel: () => void;
}

interface ExtraItemDraft {
  type: 'labor' | 'fixed_cost';
  label: string;
  qty: number;
  unit_price_usd: number;
}

export function AmendmentForm({
  project_id,
  current_line_items,
  current_profit_margin_pct,
  onCreated,
  onCancel,
}: AmendmentFormProps) {
  const [reason, setReason] = useState('');
  const [extras, setExtras] = useState<ExtraItemDraft[]>([
    { type: 'labor', label: '', qty: 0, unit_price_usd: 0 },
  ]);
  const [profitMarginPct, setProfitMarginPct] = useState(current_profit_margin_pct);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addExtra(type: ExtraItemDraft['type']) {
    setExtras([...extras, { type, label: '', qty: 0, unit_price_usd: 0 }]);
  }

  function updateExtra(idx: number, patch: Partial<ExtraItemDraft>) {
    const next = [...extras];
    next[idx] = { ...next[idx], ...patch };
    setExtras(next);
  }

  function removeExtra(idx: number) {
    setExtras(extras.filter((_, i) => i !== idx));
  }

  async function handleSubmit() {
    setError(null);
    if (!reason.trim()) {
      setError('La razón de la ampliación es obligatoria.');
      return;
    }
    const validExtras = extras.filter(
      (e) => e.label.trim() && e.qty > 0 && e.unit_price_usd > 0,
    );
    if (validExtras.length === 0) {
      setError('Agregá al menos un item nuevo válido para la ampliación.');
      return;
    }

    const baseSort = current_line_items.length;
    const newLineItems: QuoteLineItem[] = [
      ...current_line_items.map((it, idx) => ({ ...it, sort_order: idx })),
      ...validExtras.map((e, idx) => ({
        type: e.type,
        label: `[AMP] ${e.label}`,
        qty: e.qty,
        unit_price_usd: e.unit_price_usd,
        total_usd: Math.round(e.qty * e.unit_price_usd * 100) / 100,
        sort_order: baseSort + idx,
      })),
    ];

    setBusy(true);
    const res = await createAmendmentAction({
      project_id,
      reason,
      new_line_items: newLineItems,
      new_profit_margin_pct: profitMarginPct,
    });
    setBusy(false);

    if (!res.ok || !res.data) {
      setError(res.error ?? 'Error creando ampliación');
      return;
    }
    onCreated({
      amendment_label: res.data.amendment_number_label,
      quote_label: res.data.new_quote_number_label,
    });
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
      <header>
        <h3 className="text-base font-semibold text-white">Nueva ampliación</h3>
        <p className="text-xs text-gray-400">
          Genera un nuevo presupuesto versionado (SF-XXXX-NN+1) y registra la razón del cambio.
        </p>
      </header>

      <div>
        <label className="text-sm text-white">Razón</label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
          placeholder="Ej: El cliente pidió agregar módulo de reportes con exportación a Excel."
          className="mt-1 w-full px-3 py-2 bg-black/30 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-purple-500/50 resize-none"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-white">Items nuevos</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => addExtra('labor')}
              className="text-xs px-2 py-1 bg-white/5 text-gray-300 border border-white/10 rounded-lg hover:bg-white/10"
            >
              + Labor
            </button>
            <button
              type="button"
              onClick={() => addExtra('fixed_cost')}
              className="text-xs px-2 py-1 bg-white/5 text-gray-300 border border-white/10 rounded-lg hover:bg-white/10"
            >
              + Gasto fijo
            </button>
          </div>
        </div>
        <div className="space-y-2">
          {extras.map((e, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2 items-center">
              <span className="col-span-2 text-xs text-gray-400">
                {e.type === 'labor' ? 'Labor' : 'Fijo'}
              </span>
              <input
                type="text"
                value={e.label}
                onChange={(ev) => updateExtra(idx, { label: ev.target.value })}
                placeholder="Descripción"
                className="col-span-5 px-2 py-1.5 bg-black/30 border border-white/10 rounded-lg text-white text-xs"
              />
              <input
                type="number"
                min={0}
                step="0.5"
                value={e.qty || ''}
                onChange={(ev) => updateExtra(idx, { qty: Number(ev.target.value) || 0 })}
                placeholder={e.type === 'labor' ? 'hs' : 'meses'}
                className="col-span-2 px-2 py-1.5 bg-black/30 border border-white/10 rounded-lg text-white text-xs"
              />
              <input
                type="number"
                min={0}
                step="0.01"
                value={e.unit_price_usd || ''}
                onChange={(ev) =>
                  updateExtra(idx, { unit_price_usd: Number(ev.target.value) || 0 })
                }
                placeholder={e.type === 'labor' ? '$/h' : '$/mes'}
                className="col-span-2 px-2 py-1.5 bg-black/30 border border-white/10 rounded-lg text-white text-xs"
              />
              <button
                type="button"
                onClick={() => removeExtra(idx)}
                className="col-span-1 text-red-400 hover:text-red-300 text-xs"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className="text-sm text-white">Margen de utilidad (%)</label>
        <input
          type="number"
          min={0}
          max={100}
          step="0.5"
          value={profitMarginPct}
          onChange={(e) => setProfitMarginPct(Number(e.target.value) || 0)}
          className="mt-1 w-full px-3 py-2 bg-black/30 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-purple-500/50"
        />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
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
          {busy ? 'Creando...' : 'Crear ampliación'}
        </button>
      </div>
    </div>
  );
}
