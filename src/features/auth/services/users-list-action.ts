// Server action: lista master de usuarios para el ABM del leader (/leader/usuarios).
// Solo leader (RLS leaders_read_all_profiles + gate explícito).

'use server';

import { createClient } from '@/lib/supabase/server';
import { requireRole, type UserRole } from './permissions';

export interface UserListRow {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  status: 'active' | 'suspended' | 'pending' | 'deactivated';
  last_login_at: string | null;
  hourly_rate_usd: number | null;
  created_at: string;
}

export async function listUsersAction(): Promise<UserListRow[]> {
  await requireRole(['leader']);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, status, last_login_at, hourly_rate_usd, created_at')
    .order('role', { ascending: true })
    .order('created_at', { ascending: true });

  if (error || !data) return [];
  return data as UserListRow[];
}
