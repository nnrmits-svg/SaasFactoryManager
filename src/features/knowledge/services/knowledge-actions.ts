'use server';

// SF Knowledge Base — server actions (Capa 1).
// Lectura con el cliente autenticado (RLS: leader/dev ven todo; resto solo approved).

import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/features/auth/services/permissions';

export interface KnowledgeItem {
  id: string;
  dimension: 'development' | 'platform' | 'suggestion';
  item_type: string;
  title: string;
  body: string;
  context: string | null;
  code_snippet: string | null;
  tags: string[];
  tech_stack: string[];
  source_type: string;
  status: 'pending_review' | 'approved' | 'rejected' | 'archived';
  times_referenced: number;
  created_at: string | null;
}

export interface PlatformVersion {
  id: string;
  component: string;
  version: string;
  released_at: string | null;
  skills_added: string[];
  agents_added: string[];
  rationale: string | null;
  changelog: string | null;
}

export interface EcosystemUpdate {
  id: string;
  kind: string;
  title: string;
  whats_new: string | null;
  why_relevant: string | null;
  suggested_action: string | null;
  affects_skills: string[];
  effort: string | null;
  impact: string | null;
  source_url: string | null;
  status: string;
  detected_at: string | null;
}

export interface KnowledgeData {
  development: KnowledgeItem[];
  platform: KnowledgeItem[];
  suggestions: KnowledgeItem[];
  versions: PlatformVersion[];
  ecosystem: EcosystemUpdate[];
  pendingCount: number;
}

const ITEM_COLS =
  'id, dimension, item_type, title, body, context, code_snippet, tags, tech_stack, source_type, status, times_referenced, created_at';

export async function listKnowledge(): Promise<KnowledgeData> {
  const supabase = await createClient();

  const [itemsRes, versionsRes, ecoRes] = await Promise.all([
    supabase.from('knowledge_items').select(ITEM_COLS).order('created_at', { ascending: false }),
    supabase
      .from('platform_versions')
      .select('id, component, version, released_at, skills_added, agents_added, rationale, changelog')
      .order('released_at', { ascending: false, nullsFirst: false }),
    supabase
      .from('ecosystem_updates')
      .select('id, kind, title, whats_new, why_relevant, suggested_action, affects_skills, effort, impact, source_url, status, detected_at')
      .order('detected_at', { ascending: false }),
  ]);

  const items = (itemsRes.data ?? []) as KnowledgeItem[];

  return {
    development: items.filter((i) => i.dimension === 'development'),
    platform: items.filter((i) => i.dimension === 'platform'),
    suggestions: items.filter((i) => i.dimension === 'suggestion'),
    versions: (versionsRes.data ?? []) as PlatformVersion[],
    ecosystem: (ecoRes.data ?? []) as EcosystemUpdate[],
    pendingCount: items.filter((i) => i.status === 'pending_review').length,
  };
}

export async function searchKnowledge(q: string): Promise<KnowledgeItem[]> {
  const query = q.trim();
  if (!query) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('search_knowledge', { q: query, max_results: 20 });
  if (error) return [];
  return (data ?? []) as KnowledgeItem[];
}

export async function setKnowledgeStatus(
  id: string,
  status: 'approved' | 'rejected' | 'archived',
): Promise<{ ok: boolean; error?: string }> {
  await requireRole(['leader', 'dev']);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from('knowledge_items')
    .update({ status, reviewed_at: new Date().toISOString(), reviewed_by: user?.id ?? null })
    .eq('id', id);

  return error ? { ok: false, error: error.message } : { ok: true };
}

/** Cuenta lo que necesita atención: items pending + novedades del radar sin revisar. */
export async function getKnowledgeBadgeCount(): Promise<number> {
  const supabase = await createClient();
  const [pendRes, ecoRes] = await Promise.all([
    supabase.from('knowledge_items').select('id', { count: 'exact', head: true }).eq('status', 'pending_review'),
    supabase.from('ecosystem_updates').select('id', { count: 'exact', head: true }).eq('status', 'new'),
  ]);
  return (pendRes.count ?? 0) + (ecoRes.count ?? 0);
}

/** Aprueba TODOS los items pendientes (curación en lote). Leader/dev only. */
export async function approveAllPending(): Promise<{ ok: boolean; count: number; error?: string }> {
  await requireRole(['leader', 'dev']);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('knowledge_items')
    .update({ status: 'approved', reviewed_at: new Date().toISOString(), reviewed_by: user?.id ?? null })
    .eq('status', 'pending_review')
    .select('id');

  return error ? { ok: false, count: 0, error: error.message } : { ok: true, count: data?.length ?? 0 };
}
