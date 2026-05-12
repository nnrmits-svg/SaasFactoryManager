// Calculo de totales del presupuesto. Idempotente: dada la misma lista de items,
// devuelve siempre lo mismo. Se llama tanto desde UI (cada keystroke) como del server.

import type { QuoteLineItem, QuoteTotals } from '../types';

export function computeQuoteTotals(
  items: QuoteLineItem[],
  profitMarginPct: number,
): QuoteTotals {
  const totals = {
    ai_total_usd: 0,
    labor_total_usd: 0,
    fixed_costs_total_usd: 0,
    overhead_total_usd: 0,
    subtotal_usd: 0,
    profit_amount_usd: 0,
    grand_total_usd: 0,
  };

  for (const item of items) {
    const itemTotal = item.total_usd ?? round2(item.qty * item.unit_price_usd);
    switch (item.type) {
      case 'ai_tokens':
        totals.ai_total_usd += itemTotal;
        break;
      case 'labor':
        totals.labor_total_usd += itemTotal;
        break;
      case 'fixed_cost':
        totals.fixed_costs_total_usd += itemTotal;
        break;
      case 'overhead':
        totals.overhead_total_usd += itemTotal;
        break;
      case 'profit':
        // El item 'profit' se ignora aca: el margen se calcula sobre el subtotal.
        // Si el founder agrega manualmente un line_item de tipo profit, lo dejamos
        // como override y suma directo al grand_total (sin doble cálculo).
        break;
    }
  }

  totals.ai_total_usd = round2(totals.ai_total_usd);
  totals.labor_total_usd = round2(totals.labor_total_usd);
  totals.fixed_costs_total_usd = round2(totals.fixed_costs_total_usd);
  totals.overhead_total_usd = round2(totals.overhead_total_usd);

  totals.subtotal_usd = round2(
    totals.ai_total_usd +
    totals.labor_total_usd +
    totals.fixed_costs_total_usd +
    totals.overhead_total_usd,
  );

  const safeMargin = Math.max(0, Math.min(100, profitMarginPct ?? 0));
  totals.profit_amount_usd = round2(totals.subtotal_usd * (safeMargin / 100));

  const profitOverrides = items
    .filter((i) => i.type === 'profit')
    .reduce((sum, i) => sum + (i.total_usd ?? round2(i.qty * i.unit_price_usd)), 0);

  totals.grand_total_usd = round2(totals.subtotal_usd + totals.profit_amount_usd + profitOverrides);

  return totals;
}

export function computeLineItemTotal(qty: number, unit_price_usd: number): number {
  return round2(qty * unit_price_usd);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
