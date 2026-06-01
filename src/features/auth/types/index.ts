export type UserRole = 'leader' | 'dev' | 'comercial' | 'cliente';
export type UserStatus = 'active' | 'suspended' | 'pending';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  status: UserStatus;
  hourly_rate_usd: number | null;
  invited_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuthState {
  user: Profile | null;
  loading: boolean;
}
