'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { logout } from '../services/auth-service';
import type { Profile } from '../types';

const ROLE_LABEL: Record<Profile['role'], string> = {
  leader: '👑 Líder',
  dev: '💻 Desarrollador',
  comercial: '🤝 Comercial',
  cliente: '👤 Cliente',
};

interface Props {
  profile: Profile;
}

export function UserMenu({ profile }: Props) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const initials = (profile.full_name || profile.email)
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-white/10 transition-all duration-300"
      >
        {profile.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={profile.full_name || 'Avatar'}
            className="w-7 h-7 rounded-full"
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center">
            <span className="text-white text-xs font-bold">{initials}</span>
          </div>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-fluya-card border border-white/10 rounded-xl shadow-2xl shadow-black/50 overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-white/5">
            <p className="text-sm font-medium text-white truncate">
              {profile.full_name || 'Sin nombre'}
            </p>
            <p className="text-xs text-white/40 truncate">{profile.email}</p>
            <p className="text-xs text-white/50 mt-1">{ROLE_LABEL[profile.role]}</p>
          </div>
          <Link
            href="/me"
            onClick={() => setOpen(false)}
            className="block px-4 py-2.5 text-sm text-white/60 hover:text-white hover:bg-white/5 transition"
          >
            Mi cuenta
          </Link>
          {profile.role === 'leader' && (
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="block px-4 py-2.5 text-sm text-white/60 hover:text-white hover:bg-white/5 transition"
            >
              Settings (líder)
            </Link>
          )}
          <form action={logout}>
            <button
              type="submit"
              className="w-full px-4 py-2.5 text-left text-sm text-white/60 hover:text-white hover:bg-white/5 transition border-t border-white/5"
            >
              Cerrar sesion
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
