// labor-estimator.ts
// Estima las HORAS de trabajo (labor) de un proyecto a partir del brief, con IA.
// Complementa ai-estimator.ts (que estima el costo de TOKENS de IA, no las horas).
// El budget-step usa esto para pre-llenar las horas del bloque Labor (hoy se cargan a mano).
// Server-only: usa OPENROUTER_API_KEY. Salida JSON estricta validada con zod.

import { z } from 'zod';
import type { BusinessBriefInput } from './ai-estimator';
import type { ProjectComplexity } from '../types';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
// Modelo del estimador. Ajustable. Sonnet da buen balance costo/calidad para estimar horas.
const DEFAULT_MODEL = 'anthropic/claude-sonnet-4.5';

export interface LaborEstimateInput {
  brief: BusinessBriefInput;
  complexity: ProjectComplexity;
  /** Tipo de proyecto (ej. 'saas_full') — contexto opcional. */
  projectType?: string;
  /** Features ya listadas (opcional). Si no se pasan, la IA las deriva del brief. */
  mustHave?: string[];
  niceToHave?: string[];
  /** Baseline de horas del project_template (opcional, ancla la estimación). */
  baselineHoursMin?: number;
  baselineHoursMax?: number;
  model?: string;
}

export interface FeatureEstimate {
  feature: string;
  hours_min: number;
  hours_max: number;
  confidence: number; // 0..1
  complexity_notes: string;
}

export interface LaborEstimate {
  must_have: FeatureEstimate[];
  nice_to_have: FeatureEstimate[];
  qa_overhead_pct: number;
  deployment_overhead_hours: number;
  /** Horas totales must-have + QA + deploy (lo que pre-llena el bloque Labor). */
  total_hours_min: number;
  total_hours_max: number;
  overall_confidence: number;
  risk_flags: string[];
  reasoning: string;
}

const FeatureSchema = z.object({
  feature: z.string(),
  hours_min: z.number().nonnegative(),
  hours_max: z.number().nonnegative(),
  confidence: z.number().min(0).max(1),
  complexity_notes: z.string().default(''),
});

const RawSchema = z.object({
  must_have_estimations: z.array(FeatureSchema).default([]),
  nice_to_have_estimations: z.array(FeatureSchema).default([]),
  qa_overhead_pct: z.number().min(0).max(1).default(0.15),
  deployment_overhead_hours: z.number().nonnegative().default(0),
  overall_confidence: z.number().min(0).max(1).default(0.5),
  overall_risk_flags: z.array(z.string()).default([]),
});

type RawEstimate = z.infer<typeof RawSchema>;
type RawFeature = z.infer<typeof FeatureSchema>;

const SYSTEM_PROMPT = `Sos un estimador técnico senior en una software factory (stack Next.js + Supabase + Vercel).
Estimás HORAS de desarrollo con honestidad sobre la incertidumbre. Respondés SOLO con JSON válido, sin texto fuera del JSON.`;

export async function estimateLaborHours(input: LaborEstimateInput): Promise<LaborEstimate> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY no configurada');

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: input.model ?? DEFAULT_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildPrompt(input) },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 6000,
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenRouter error: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  const content: string = data?.choices?.[0]?.message?.content ?? '{}';
  const raw = RawSchema.parse(extractJson(content));

  const mustHave = raw.must_have_estimations.map(normalizeFeature);
  const niceToHave = raw.nice_to_have_estimations.map(normalizeFeature);

  const featMin = sum(mustHave.map((f) => f.hours_min));
  const featMax = sum(mustHave.map((f) => f.hours_max));
  const totalMin = Math.round(featMin * (1 + raw.qa_overhead_pct) + raw.deployment_overhead_hours);
  const totalMax = Math.round(featMax * (1 + raw.qa_overhead_pct) + raw.deployment_overhead_hours);

  return {
    must_have: mustHave,
    nice_to_have: niceToHave,
    qa_overhead_pct: raw.qa_overhead_pct,
    deployment_overhead_hours: raw.deployment_overhead_hours,
    total_hours_min: totalMin,
    total_hours_max: totalMax,
    overall_confidence: raw.overall_confidence,
    risk_flags: raw.overall_risk_flags,
    reasoning: buildReasoning(mustHave, raw, totalMin, totalMax),
  };
}

function normalizeFeature(f: RawFeature): FeatureEstimate {
  const min = Math.min(f.hours_min, f.hours_max);
  const max = Math.max(f.hours_min, f.hours_max);
  return {
    feature: f.feature,
    hours_min: round2(min),
    hours_max: round2(max),
    confidence: clamp01(f.confidence),
    complexity_notes: f.complexity_notes,
  };
}

function buildPrompt(input: LaborEstimateInput): string {
  const briefText =
    Object.entries(input.brief)
      .filter(([, v]) => v && String(v).trim())
      .map(([k, v]) => `- ${k}: ${String(v).trim()}`)
      .join('\n') || '(sin brief detallado)';

  const baseline =
    input.baselineHoursMin != null && input.baselineHoursMax != null
      ? `\nBaseline del template (referencia): ${input.baselineHoursMin}-${input.baselineHoursMax}h.`
      : '';

  const features = input.mustHave?.length
    ? `\nFEATURES MUST-HAVE a estimar:\n${input.mustHave.map((f) => `- ${f}`).join('\n')}` +
      (input.niceToHave?.length
        ? `\nFEATURES NICE-TO-HAVE:\n${input.niceToHave.map((f) => `- ${f}`).join('\n')}`
        : '')
    : '\nNo se listaron features: DERIVALAS vos del brief (separá must-have vs nice-to-have).';

  return `Tipo de proyecto: ${input.projectType ?? 'saas_full'} · Complejidad declarada: ${input.complexity}.${baseline}

BRIEF:
${briefText}
${features}

INSTRUCCIONES:
Estimá las features must-have PRINCIPALES (no más de ~10). Para cada una devolvé hours_min (optimista), hours_max (si se complica), confidence (0.0=no idea, 1.0=lo hice muchas veces) y complexity_notes BREVE (máx ~10 palabras).
Las nice-to-have estimalas igual (se harían en fase 2).
REGLAS:
- Feature vaga ("dashboard completo") → confidence ≤ 0.3.
- Integración con sistema externo sin specs → confidence ≤ 0.4.
- Boilerplate conocido (login Supabase, CRUD estándar) → confidence ≥ 0.9.
- El junior tarda ~1.5x lo que un mid en lo mismo.
- NO incluyas QA/testing en las features: va aparte como qa_overhead_pct (fracción del total, ej 0.15).
- deployment_overhead_hours: horas de setup de deploy, aparte.
- overall_risk_flags: red flags del brief (budget bajo, specs ambiguas, deadline irreal, integración sin specs, etc.).

Respondé SOLO este JSON (sin texto alrededor):
{
  "must_have_estimations": [{"feature":"...","hours_min":0,"hours_max":0,"confidence":0.0,"complexity_notes":"..."}],
  "nice_to_have_estimations": [],
  "qa_overhead_pct": 0.15,
  "deployment_overhead_hours": 0,
  "overall_confidence": 0.0,
  "overall_risk_flags": []
}`;
}

function buildReasoning(
  features: FeatureEstimate[],
  raw: RawEstimate,
  totalMin: number,
  totalMax: number,
): string {
  const low = features.filter((f) => f.confidence < 0.7).map((f) => f.feature);
  const parts = [
    `${features.length} features must-have: ${totalMin}-${totalMax}h (incluye QA ${Math.round(raw.qa_overhead_pct * 100)}% + deploy ${raw.deployment_overhead_hours}h).`,
    `Confianza global: ${Math.round(raw.overall_confidence * 100)}%.`,
  ];
  if (low.length) parts.push(`Baja confianza en: ${low.join(', ')} — conviene clarificar con el cliente.`);
  if (raw.overall_risk_flags.length) parts.push(`Red flags: ${raw.overall_risk_flags.join('; ')}.`);
  return parts.join(' ');
}

function extractJson(text: string): unknown {
  // Claude suele envolver el JSON en ```json ... ``` aunque pidamos json_object.
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        /* cae al parse de zod, que tira error claro */
      }
    }
    return {};
  }
}

function sum(arr: number[]): number {
  return arr.reduce((s, n) => s + n, 0);
}
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}
