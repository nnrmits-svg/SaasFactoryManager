'use client';

// BudgetStep: paso final del wizard de creacion de proyecto.
// Bloques: AI tokens · Labor · Gastos fijos · Estructura (overhead) · Utilidad.
// Indicadores en linea actualizados con cada cambio.
// El BusinessBrief llega como prop (ya capturado en steps previos).

import { useState, useEffect, useMemo } from 'react';
import { computeQuoteTotals, computeLineItemTotal } from '../services/pricing';
import { estimateAiCost } from '../services/ai-estimator';
import { getOperatorsAction, type Operator } from '../services/get-operators-action';
import type {
  QuoteLineItem,
  ProjectComplexity,
  QuoteTotals,
} from '../types';

interface BudgetStepProps {
  brief: {
    dolor: string;
    costo: string;
    solucion: string;
    flujo: string;
    usuario: string;
    datos: string;
    kpi: string;
    monetizacion: string;
    diseno: string;
  };
  onChange: (payload: BudgetPayload) => void;
}

export interface BudgetPayload {
  complexity: ProjectComplexity;
  line_items: QuoteLineItem[];
  profit_margin_pct: number;
  totals: QuoteTotals;
  notes: string;
}

interface LaborRow {
  user_id: string | null;
  user_label: string;
  hourly_rate_usd: number;
  estimated_hours: number;
}

interface FixedRow {
  label: string;
  monthly_cost_usd: number;
  months: number;
}

const COMPLEXITY_OPTIONS: { value: ProjectComplexity; label: string; desc: string }[] = [
  { value: 'simple', label: 'Simple', desc: 'CRUD basico, 1 feature core' },
  { value: 'medium', label: 'Medio', desc: 'Multi-feature, integraciones' },
  { value: 'complex', label: 'Complejo', desc: 'Multi-tenant, workflows' },
  { value: 'enterprise', label: 'Enterprise', desc: 'Compliance, escala alta' },
];

export function BudgetStep({ brief, onChange }: BudgetStepProps) {
  const [complexity, setComplexity] = useState<ProjectComplexity>('medium');
  const [aiEstimateUsd, setAiEstimateUsd] = useState<number>(0);
  const [aiEstimateTokens, setAiEstimateTokens] = useState<number>(0);
  const [aiReasoning, setAiReasoning] = useState<string>('');
  const [aiOverride, setAiOverride] = useState<string>(''); // empty = use estimate
  const [labors, setLabors] = useState<LaborRow[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [fixedItems, setFixedItems] = useState<FixedRow[]>([]);
  const [overheadPct, setOverheadPct] = useState<number>(10);
  const [profitMarginPct, setProfitMarginPct] = useState<number>(20);
  const [notes, setNotes] = useState<string>('');

  // Cargar operadores al montar
  useEffect(() => {
    getOperatorsAction().then((res) => {
      if (res.ok && res.data) setOperators(res.data);
    });
  }, []);

  // Recalcular AI estimate cuando cambia complexity o brief
  useEffect(() => {
    const est = estimateAiCost({ brief, complexity });
    setAiEstimateUsd(est.cost_usd_estimated);
    setAiEstimateTokens(est.total_tokens_estimated);
    setAiReasoning(est.reasoning);
  }, [complexity, brief]);

  const aiFinalUsd = aiOverride.trim() === '' ? aiEstimateUsd : Number(aiOverride) || 0;

  // Armar line items derivados
  const lineItems: QuoteLineItem[] = useMemo(() => {
    const items: QuoteLineItem[] = [];

    if (aiFinalUsd > 0) {
      items.push({
        type: 'ai_tokens',
        label: `Tokens AI (~${formatTokens(aiEstimateTokens)} · complejidad ${complexity})`,
        qty: 1,
        unit_price_usd: aiFinalUsd,
        total_usd: aiFinalUsd,
        metadata: { tokens_estimated: aiEstimateTokens, complexity },
        sort_order: 0,
      });
    }

    labors.forEach((l, idx) => {
      if (l.hourly_rate_usd > 0 && l.estimated_hours > 0) {
        const total = computeLineItemTotal(l.estimated_hours, l.hourly_rate_usd);
        items.push({
          type: 'labor',
          label: `Labor — ${l.user_label}`,
          qty: l.estimated_hours,
          unit_price_usd: l.hourly_rate_usd,
          total_usd: total,
          metadata: { user_id: l.user_id },
          sort_order: 10 + idx,
        });
      }
    });

    fixedItems.forEach((f, idx) => {
      if (f.monthly_cost_usd > 0 && f.months > 0 && f.label.trim()) {
        const total = computeLineItemTotal(f.months, f.monthly_cost_usd);
        items.push({
          type: 'fixed_cost',
          label: f.label,
          qty: f.months,
          unit_price_usd: f.monthly_cost_usd,
          total_usd: total,
          recurrence_months: f.months,
          sort_order: 100 + idx,
        });
      }
    });

    // Overhead se calcula sobre subtotal de AI + Labor + Fixed
    const overheadable = items
      .filter((i) => ['ai_tokens', 'labor', 'fixed_cost'].includes(i.type))
      .reduce((s, i) => s + i.total_usd, 0);
    if (overheadPct > 0 && overheadable > 0) {
      const overheadAmount = round2((overheadable * overheadPct) / 100);
      items.push({
        type: 'overhead',
        label: `Estructura empresarial (${overheadPct}%)`,
        qty: 1,
        unit_price_usd: overheadAmount,
        total_usd: overheadAmount,
        sort_order: 1000,
      });
    }

    return items;
  }, [aiFinalUsd, aiEstimateTokens, complexity, labors, fixedItems, overheadPct]);

  const totals = useMemo(
    () => computeQuoteTotals(lineItems, profitMarginPct),
    [lineItems, profitMarginPct],
  );

  // Notificar al wizard cada cambio (debounce no necesario: setState es sync)
  useEffect(() => {
    onChange({
      complexity,
      line_items: lineItems,
      profit_margin_pct: profitMarginPct,
      totals,
      notes,
    });
  }, [complexity, lineItems, profitMarginPct, totals, notes, onChange]);

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-lg font-semibold text-white">Presupuesto</h2>
        <p className="text-sm text-purple-400">
          Estimación inicial · podés editarla en cualquier momento desde el proyecto.
        </p>
      </header>

      {/* Complexity */}
      <section className="space-y-2">
        <label className="text-sm font-medium text-white">Complejidad del proyecto</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {COMPLEXITY_OPTIONS.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setComplexity(c.value)}
              className={`px-3 py-2 rounded-xl border text-left transition-all ${
                complexity === c.value
                  ? 'border-purple-500 bg-purple-500/10'
                  : 'border-white/10 bg-black/30 hover:border-white/30'
              }`}
            >
              <div className="text-sm font-medium text-white">{c.label}</div>
              <div className="text-xs text-gray-400">{c.desc}</div>
            </button>
          ))}
        </div>
      </section>

      {/* AI block */}
      <section className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2">
        <div className="flex items-baseline justify-between">
          <h3 className="text-sm font-medium text-white">AI Tokens</h3>
          <span className="text-xs text-gray-500">
            Auto-estimado · {formatTokens(aiEstimateTokens)} tokens
          </span>
        </div>
        <p className="text-xs text-gray-400">{aiReasoning}</p>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-xs text-gray-400">USD</span>
          <input
            type="number"
            min={0}
            step="0.01"
            value={aiOverride}
            onChange={(e) => setAiOverride(e.target.value)}
            placeholder={String(aiEstimateUsd)}
            className="flex-1 px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500/50"
          />
          <span className="text-sm font-mono text-white tabular-nums">
            ${aiFinalUsd.toFixed(2)}
          </span>
        </div>
        <p className="text-[11px] text-gray-500">
          Dejá vacío para usar el estimado. Editá manualmente para override.
        </p>
      </section>

      {/* Labor block */}
      <section className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
        <div className="flex items-baseline justify-between">
          <h3 className="text-sm font-medium text-white">Labor (operadores)</h3>
          <button
            type="button"
            onClick={() =>
              setLabors([
                ...labors,
                { user_id: null, user_label: '', hourly_rate_usd: 0, estimated_hours: 0 },
              ])
            }
            className="text-xs px-2 py-1 bg-white/5 text-gray-300 border border-white/10 rounded-lg hover:bg-white/10"
          >
            + Agregar operador
          </button>
        </div>
        {labors.length === 0 && (
          <p className="text-xs text-gray-500">Sin operadores asignados. Click "+ Agregar".</p>
        )}
        {labors.map((l, idx) => (
          <div key={idx} className="grid grid-cols-12 gap-2 items-center">
            <select
              value={l.user_id ?? ''}
              onChange={(e) => {
                const op = operators.find((o) => o.id === e.target.value);
                const next = [...labors];
                next[idx] = {
                  ...next[idx],
                  user_id: op?.id ?? null,
                  user_label: op?.full_name ?? op?.email ?? '',
                  hourly_rate_usd: op?.hourly_rate_usd ?? 0,
                };
                setLabors(next);
              }}
              className="col-span-5 px-2 py-1.5 bg-black/30 border border-white/10 rounded-lg text-white text-xs"
            >
              <option value="">— elegir operador —</option>
              {operators.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.full_name ?? o.email}
                  {o.hourly_rate_usd ? ` · $${o.hourly_rate_usd}/h` : ' · sin tarifa'}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={0}
              step="0.5"
              value={l.estimated_hours || ''}
              onChange={(e) => {
                const next = [...labors];
                next[idx] = { ...next[idx], estimated_hours: Number(e.target.value) || 0 };
                setLabors(next);
              }}
              placeholder="hs"
              className="col-span-2 px-2 py-1.5 bg-black/30 border border-white/10 rounded-lg text-white text-xs"
            />
            <input
              type="number"
              min={0}
              step="0.01"
              value={l.hourly_rate_usd || ''}
              onChange={(e) => {
                const next = [...labors];
                next[idx] = { ...next[idx], hourly_rate_usd: Number(e.target.value) || 0 };
                setLabors(next);
              }}
              placeholder="$/h"
              className="col-span-2 px-2 py-1.5 bg-black/30 border border-white/10 rounded-lg text-white text-xs"
            />
            <span className="col-span-2 text-right text-xs font-mono text-white tabular-nums">
              ${(l.hourly_rate_usd * l.estimated_hours).toFixed(2)}
            </span>
            <button
              type="button"
              onClick={() => setLabors(labors.filter((_, i) => i !== idx))}
              className="col-span-1 text-red-400 hover:text-red-300 text-xs"
              title="Quitar"
            >
              ✕
            </button>
          </div>
        ))}
      </section>

      {/* Fixed costs block */}
      <section className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
        <div className="flex items-baseline justify-between">
          <h3 className="text-sm font-medium text-white">Gastos fijos (licencias, APIs)</h3>
          <button
            type="button"
            onClick={() =>
              setFixedItems([...fixedItems, { label: '', monthly_cost_usd: 0, months: 12 }])
            }
            className="text-xs px-2 py-1 bg-white/5 text-gray-300 border border-white/10 rounded-lg hover:bg-white/10"
          >
            + Agregar item
          </button>
        </div>
        {fixedItems.length === 0 && (
          <p className="text-xs text-gray-500">Sin items. Click "+ Agregar" para sumar costos fijos.</p>
        )}
        {fixedItems.map((f, idx) => (
          <div key={idx} className="grid grid-cols-12 gap-2 items-center">
            <input
              type="text"
              value={f.label}
              onChange={(e) => {
                const next = [...fixedItems];
                next[idx] = { ...next[idx], label: e.target.value };
                setFixedItems(next);
              }}
              placeholder="Ej: Vercel Pro, OpenAI API"
              className="col-span-5 px-2 py-1.5 bg-black/30 border border-white/10 rounded-lg text-white text-xs"
            />
            <input
              type="number"
              min={0}
              step="0.01"
              value={f.monthly_cost_usd || ''}
              onChange={(e) => {
                const next = [...fixedItems];
                next[idx] = { ...next[idx], monthly_cost_usd: Number(e.target.value) || 0 };
                setFixedItems(next);
              }}
              placeholder="$/mes"
              className="col-span-2 px-2 py-1.5 bg-black/30 border border-white/10 rounded-lg text-white text-xs"
            />
            <input
              type="number"
              min={1}
              value={f.months || ''}
              onChange={(e) => {
                const next = [...fixedItems];
                next[idx] = { ...next[idx], months: Number(e.target.value) || 1 };
                setFixedItems(next);
              }}
              placeholder="meses"
              className="col-span-2 px-2 py-1.5 bg-black/30 border border-white/10 rounded-lg text-white text-xs"
            />
            <span className="col-span-2 text-right text-xs font-mono text-white tabular-nums">
              ${(f.monthly_cost_usd * f.months).toFixed(2)}
            </span>
            <button
              type="button"
              onClick={() => setFixedItems(fixedItems.filter((_, i) => i !== idx))}
              className="col-span-1 text-red-400 hover:text-red-300 text-xs"
              title="Quitar"
            >
              ✕
            </button>
          </div>
        ))}
      </section>

      {/* Overhead + Profit margin row */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <label className="text-sm font-medium text-white">Estructura (overhead)</label>
          <p className="text-xs text-gray-400 mb-2">Aplicado sobre AI + Labor + Gastos fijos.</p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={100}
              step="0.5"
              value={overheadPct}
              onChange={(e) => setOverheadPct(Number(e.target.value) || 0)}
              className="flex-1 px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500/50"
            />
            <span className="text-sm text-gray-400">%</span>
          </div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <label className="text-sm font-medium text-white">Utilidad aplicada</label>
          <p className="text-xs text-gray-400 mb-2">Margen sobre el costo total.</p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={100}
              step="0.5"
              value={profitMarginPct}
              onChange={(e) => setProfitMarginPct(Number(e.target.value) || 0)}
              className="flex-1 px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500/50"
            />
            <span className="text-sm text-gray-400">%</span>
          </div>
        </div>
      </section>

      {/* Totals (sticky-ish, prominent) */}
      <section className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-2xl p-4 space-y-2">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <span className="text-gray-400">AI Tokens</span>
          <span className="text-right font-mono text-white tabular-nums">
            ${totals.ai_total_usd.toFixed(2)}
          </span>
          <span className="text-gray-400">Labor</span>
          <span className="text-right font-mono text-white tabular-nums">
            ${totals.labor_total_usd.toFixed(2)}
          </span>
          <span className="text-gray-400">Gastos fijos</span>
          <span className="text-right font-mono text-white tabular-nums">
            ${totals.fixed_costs_total_usd.toFixed(2)}
          </span>
          <span className="text-gray-400">Overhead</span>
          <span className="text-right font-mono text-white tabular-nums">
            ${totals.overhead_total_usd.toFixed(2)}
          </span>
          <span className="text-gray-300 font-medium pt-2 border-t border-white/10">Subtotal</span>
          <span className="text-right font-mono text-white tabular-nums pt-2 border-t border-white/10">
            ${totals.subtotal_usd.toFixed(2)}
          </span>
          <span className="text-fluya-green">Utilidad ({profitMarginPct}%)</span>
          <span className="text-right font-mono text-fluya-green tabular-nums">
            ${totals.profit_amount_usd.toFixed(2)}
          </span>
        </div>
        <div className="pt-2 border-t border-white/10 flex items-baseline justify-between">
          <span className="text-base font-semibold text-white">Total al cliente</span>
          <span className="text-2xl font-mono font-bold bg-clip-text text-transparent bg-gradient-to-r from-fluya-purple to-fluya-blue tabular-nums">
            ${totals.grand_total_usd.toFixed(2)}
          </span>
        </div>
      </section>

      {/* Notes */}
      <section>
        <label className="text-sm font-medium text-white">Notas (opcional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Ej: precio promocional, descuento por volumen, asunciones..."
          className="mt-1 w-full px-3 py-2 bg-black/30 border border-white/10 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500/50 resize-none"
        />
      </section>
    </div>
  );
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
