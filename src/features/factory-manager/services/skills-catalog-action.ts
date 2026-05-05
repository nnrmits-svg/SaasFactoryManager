'use server';

import { createClient } from '@/lib/supabase/server';

export type SkillSource = 'official' | 'catalog';

export interface CatalogSkill {
  id: string;
  skillName: string;
  source: SkillSource;
  description: string | null;
  hash: string | null;
  mtime: string | null;
  lastSeenAt: string;
}

/** Reads `skills_catalog` for the current user. Only "live" rows are returned
 *  (last_seen_at within the last 24 hours) — the SF Agent re-pushes the
 *  catalog at every boot, so anything stale represents a skill that was
 *  removed or a machine that hasn't booted recently. */
export async function getSkillsCatalog(): Promise<CatalogSkill[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const cutoffIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('skills_catalog')
    .select('id, skill_name, source, description, hash, mtime, last_seen_at')
    .eq('user_id', user.id)
    .gte('last_seen_at', cutoffIso)
    .order('skill_name', { ascending: true });

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id as string,
    skillName: row.skill_name as string,
    source: row.source as SkillSource,
    description: (row.description as string | null) ?? null,
    hash: (row.hash as string | null) ?? null,
    mtime: (row.mtime as string | null) ?? null,
    lastSeenAt: row.last_seen_at as string,
  }));
}
