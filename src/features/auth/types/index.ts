export type UserRole = 'founder' | 'operator' | 'client';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  invited_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuthState {
  user: Profile | null;
  loading: boolean;
}
