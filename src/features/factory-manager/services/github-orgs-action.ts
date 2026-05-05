'use server';

import { createClient } from '@/lib/supabase/server';
import type { UserGithubOrg } from '../types';

/** Reads the user's cached GitHub orgs (table populated by the SF Agent's
 *  `list-github-orgs` command). RLS scopes by user_id, but we also short-
 *  circuit on no-session. */
export async function getUserGithubOrgs(): Promise<UserGithubOrg[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('user_github_orgs')
    .select('id, org_login, avatar_url, description, is_default, updated_at')
    .eq('user_id', user.id)
    .order('is_default', { ascending: false })
    .order('org_login', { ascending: true });

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id as string,
    orgLogin: row.org_login as string,
    avatarUrl: (row.avatar_url as string | null) ?? null,
    description: (row.description as string | null) ?? null,
    isDefault: (row.is_default as boolean | null) ?? false,
    updatedAt: row.updated_at as string,
  }));
}
