// SF Knowledge Base — Motor Proactivo (Capa 3, radar INTERNO).
// Analiza el conocimiento acumulado y detecta oportunidades de mejora:
// patrones repetidos cross-proyecto, skills que faltan, etc. → sugerencias.
// Lo dispara el cron /api/cron/proactive-engine (semanal) o manual.

import { createClient } from '@supabase/supabase-js';

const MODEL = 'google/gemini-2.5-flash';
const VALID_TYPES = ['new_skill_suggested', 'pattern_detected', 'merge_suggested', 'deprecate_suggested'];

interface Suggestion {
  item_type?: string;
  title?: string;
  body?: string;
  context?: string;
}

export interface ProactiveResult {
  itemsAnalyzed: number;
  suggestionsInserted: number;
}

export async function runProactiveEngine(): Promise<ProactiveResult> {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  const { data: items } = await supabase
    .from('knowledge_items')
    .select('title, item_type, body, tags, source_ref')
    .in('dimension', ['development', 'platform']);

  const corpus = (items ?? [])
    .map((i) => `[${i.source_ref ?? '?'}] (${i.item_type}) ${i.title} :: ${String(i.body ?? '').slice(0, 120)} #${(i.tags ?? []).join(',')}`)
    .join('\n');

  if (!corpus || !process.env.OPENROUTER_API_KEY) return { itemsAnalyzed: items?.length ?? 0, suggestionsInserted: 0 };

  const sys = `Sos el motor proactivo de una software factory. Te paso items de conocimiento de VARIOS proyectos (cada uno con su [source_ref]=proyecto). Detectá OPORTUNIDADES DE MEJORA: (1) gotchas/patrones que se REPITEN en proyectos DISTINTOS → promover a regla/skill; (2) soluciones recurrentes que justifican un skill nuevo; (3) skills/agents que faltarían. Respondé EXCLUSIVAMENTE JSON: {"suggestions":[{"item_type":"new_skill_suggested|pattern_detected|merge_suggested|deprecate_suggested","title":"corta","body":"qué proponés concretamente","context":"en qué proyectos/items se basa y por qué conviene"}]}. Máximo 5, las MÁS fuertes (evidencia en ≥2 proyectos idealmente). Si nada claro: {"suggestions":[]}.`;

  let suggestions: Suggestion[] = [];
  try {
    const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}` },
      body: JSON.stringify({ model: MODEL, messages: [{ role: 'system', content: sys }, { role: 'user', content: `ITEMS:\n${corpus.slice(0, 12000)}` }], max_tokens: 2000, response_format: { type: 'json_object' } }),
    });
    if (r.ok) {
      const j = (await r.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const p = JSON.parse(j.choices?.[0]?.message?.content ?? '{}');
      suggestions = Array.isArray(p.suggestions) ? p.suggestions : [];
    }
  } catch { /* ignore */ }

  const { data: existing } = await supabase.from('knowledge_items').select('title').eq('dimension', 'suggestion');
  const seen = new Set((existing ?? []).map((e) => String(e.title).toLowerCase().trim()));

  let inserted = 0;
  for (const sg of suggestions) {
    if (!sg.title || seen.has(sg.title.toLowerCase().trim())) continue;
    const { error } = await supabase.from('knowledge_items').insert({
      dimension: 'suggestion',
      item_type: VALID_TYPES.includes(sg.item_type ?? '') ? sg.item_type : 'pattern_detected',
      title: String(sg.title).slice(0, 200),
      body: sg.body ?? '',
      context: sg.context ?? null,
      source_type: 'proactive_engine',
      tags: [],
      tech_stack: [],
      status: 'pending_review',
    });
    if (!error) {
      inserted++;
      seen.add(sg.title.toLowerCase().trim());
    }
  }

  return { itemsAnalyzed: items?.length ?? 0, suggestionsInserted: inserted };
}
