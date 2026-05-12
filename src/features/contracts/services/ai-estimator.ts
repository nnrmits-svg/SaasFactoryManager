// Estimacion de costo de AI tokens para un proyecto nuevo.
// Combina: (1) baseline por complejidad declarada + (2) ajuste por contenido del brief
// + (3) calibracion contra histórico real de claude_sessions.

import type { ProjectComplexity } from '../types';

export interface BusinessBriefInput {
  dolor?: string;
  costo?: string;
  solucion?: string;
  flujo?: string;
  usuario?: string;
  datos?: string;
  kpi?: string;
  monetizacion?: string;
  diseno?: string;
}

export interface AiEstimateInput {
  brief: BusinessBriefInput;
  complexity: ProjectComplexity;
  /** Modelo target. Default 'claude-opus-4-7'. */
  model?: string;
  /** Histórico opcional para calibrar — array de costo USD por sesión real. */
  historicalCostsUsd?: number[];
}

export interface AiEstimateOutput {
  total_tokens_estimated: number;
  cost_usd_estimated: number;
  complexity_multiplier: number;
  brief_signal_multiplier: number;
  reasoning: string;
}

// Baseline tokens por nivel de complejidad (input + output combinados).
const BASELINE_TOKENS: Record<ProjectComplexity, number> = {
  simple: 100_000,
  medium: 500_000,
  complex: 2_000_000,
  enterprise: 10_000_000,
};

// Pricing USD/million tokens — modelo claude-opus-4-7 (2026 list).
// Asumimos mix tipico: 70% input, 30% output.
const PRICING_PER_MTOK: Record<string, { input: number; output: number }> = {
  'claude-opus-4-7': { input: 15, output: 75 },
  'claude-opus-4-6': { input: 15, output: 75 },
  'claude-sonnet-4-6': { input: 3, output: 15 },
  'claude-haiku-4-5': { input: 0.8, output: 4 },
};

const INPUT_OUTPUT_MIX = { input: 0.7, output: 0.3 };

export function estimateAiCost(input: AiEstimateInput): AiEstimateOutput {
  const model = input.model ?? 'claude-opus-4-7';
  const baselineTokens = BASELINE_TOKENS[input.complexity];

  const briefMultiplier = signalMultiplierFromBrief(input.brief);

  const estimatedTokens = Math.round(baselineTokens * briefMultiplier);
  const blendedRatePerMtok =
    (PRICING_PER_MTOK[model]?.input ?? PRICING_PER_MTOK['claude-opus-4-7'].input) *
      INPUT_OUTPUT_MIX.input +
    (PRICING_PER_MTOK[model]?.output ?? PRICING_PER_MTOK['claude-opus-4-7'].output) *
      INPUT_OUTPUT_MIX.output;

  let costUsd = round2((estimatedTokens / 1_000_000) * blendedRatePerMtok);

  // Calibracion con historico real (si hay data suficiente).
  if (input.historicalCostsUsd && input.historicalCostsUsd.length >= 3) {
    const avgHistorical = avg(input.historicalCostsUsd);
    const expectedForComplexity = BASELINE_TOKENS[input.complexity] / BASELINE_TOKENS.medium;
    const calibratedFromHistory = avgHistorical * expectedForComplexity * briefMultiplier;
    // Promediamos el cálculo nominal con la calibracion historica (60/40 a favor del histórico).
    costUsd = round2(calibratedFromHistory * 0.6 + costUsd * 0.4);
  }

  return {
    total_tokens_estimated: estimatedTokens,
    cost_usd_estimated: costUsd,
    complexity_multiplier:
      BASELINE_TOKENS[input.complexity] / BASELINE_TOKENS.medium,
    brief_signal_multiplier: briefMultiplier,
    reasoning: explain(input.complexity, briefMultiplier, !!input.historicalCostsUsd?.length),
  };
}

// Heuristicas simples sobre el brief: más texto + keywords técnicas → multiplicador mayor.
function signalMultiplierFromBrief(brief: BusinessBriefInput): number {
  const allText = Object.values(brief).filter(Boolean).join(' ').toLowerCase();
  if (!allText) return 1.0;

  const lengthSignal = Math.min(2.0, allText.length / 800);

  const techKeywords = [
    'integraci', 'integration', 'webhook', 'api', 'realtime', 'sincroniz',
    'workflow', 'multi-tenant', 'multitenant', 'rls', 'rol', 'roles',
    'permis', 'audit', 'compliance', 'fact', 'pago', 'stripe', 'polar',
    'docusign', 'firma', 'pdf', 'ia', 'ai', 'ml', 'rag', 'embedding',
    'reportes', 'analytics', 'dashboard', 'export', 'import',
  ];
  const hits = techKeywords.filter((k) => allText.includes(k)).length;
  const techSignal = 1 + hits * 0.08;

  return round2(Math.min(3.0, (lengthSignal * 0.5 + 0.5) * techSignal));
}

function avg(arr: number[]): number {
  return arr.reduce((s, n) => s + n, 0) / arr.length;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function explain(c: ProjectComplexity, m: number, calibrated: boolean): string {
  const parts = [
    `Complejidad declarada: ${c}.`,
    `Multiplicador por contenido del brief: ×${m.toFixed(2)}.`,
  ];
  if (calibrated) parts.push('Calibrado con histórico de claude_sessions (60/40 hist/nominal).');
  return parts.join(' ');
}
