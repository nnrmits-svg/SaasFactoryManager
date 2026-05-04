'use client';

import Link from 'next/link';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { UserMenu } from '@/features/auth/components/user-menu';

export function Navbar() {
  const { user, profile, loading } = useAuth();

  return (
    <nav className="fixed top-0 inset-x-0 z-50 bg-fluya-bg/80 backdrop-blur-xl border-b border-white/5 px-6 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 w-fit group">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-pink-500 via-purple-500 to-purple-700 shadow-lg shadow-purple-500/30 group-hover:shadow-purple-500/50 transition-shadow">
            <span className="text-white font-black text-sm leading-none">F</span>
          </div>
          <span className="text-lg font-bold tracking-tight">
            <span className="text-white">Fluya</span>{' '}
            <span className="bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
              Studio
            </span>
          </span>
        </Link>

        <div className="flex items-center gap-1">
          {user && (
            <>
              <Link
                href="/dashboard"
                className="px-3 py-1.5 text-sm text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-300"
              >
                Portfolio
              </Link>
              <Link
                href="/factory"
                className="px-3 py-1.5 text-sm text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-300"
              >
                Factory
              </Link>
              <Link
                href="/skills"
                className="px-3 py-1.5 text-sm text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-300"
              >
                Skills
              </Link>
              <Link
                href="/reports"
                className="px-3 py-1.5 text-sm text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-300"
              >
                Reports
              </Link>
              <Link
                href="/settings"
                className="px-3 py-1.5 text-sm text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-300"
              >
                Settings
              </Link>
              <div className="ml-2 pl-2 border-l border-white/10">
                <UserMenu
                  profile={
                    profile ?? {
                      id: user.id,
                      email: user.email ?? '',
                      full_name: null,
                      avatar_url: null,
                      created_at: user.created_at,
                      updated_at: user.created_at,
                    }
                  }
                />
              </div>
            </>
          )}
          {!user && !loading && (
            <Link
              href="/login"
              className="px-4 py-1.5 text-sm bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white rounded-lg transition-all duration-300 shadow-lg shadow-purple-500/20"
            >
              Iniciar Sesion
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
