'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { UserListRow } from '@/features/auth/services/users-list-action';
import { ROLE_LABELS, type UserRole } from '@/shared/types/roles';

const STATUS_BADGES: Record<UserListRow['status'], { label: string; cls: string }> = {
  active: { label: '🟢 Activo', cls: 'bg-fluya-green/10 text-fluya-green border-fluya-green/30' },
  suspended: { label: '🟡 Suspendido', cls: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' },
  pending: { label: '🟡 Pendiente', cls: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' },
  deactivated: { label: '🔴 Desactivado', cls: 'bg-red-500/10 text-red-400 border-red-500/30' },
};

const ROLE_FILTERS: Array<{ value: 'all' | UserRole; label: string }> = [
  { value: 'all', label: 'Todos los roles' },
  { value: 'leader', label: 'Líder' },
  { value: 'dev', label: 'Desarrollador' },
  { value: 'comercial', label: 'Comercial' },
  { value: 'cliente', label: 'Cliente' },
];

function timeAgo(iso: string | null): string {
  if (!iso) return '— sin login —';
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'hace instantes';
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs} h`;
  const days = Math.floor(hrs / 24);
  return `hace ${days} d`;
}

export function UsersTable({ users }: { users: UserListRow[] }) {
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | UserListRow['status']>('all');
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (statusFilter !== 'all' && u.status !== statusFilter) return false;
      if (query && !(u.email.toLowerCase().includes(query) || (u.full_name ?? '').toLowerCase().includes(query))) return false;
      return true;
    });
  }, [users, roleFilter, statusFilter, q]);

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as 'all' | UserRole)}
          className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-fluya-purple"
        >
          {ROLE_FILTERS.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | UserListRow['status'])}
          className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-fluya-purple"
        >
          <option value="all">Todos los estados</option>
          <option value="active">Activos</option>
          <option value="pending">Pendientes</option>
          <option value="suspended">Suspendidos</option>
          <option value="deactivated">Desactivados</option>
        </select>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por email o nombre…"
          className="flex-1 min-w-[180px] px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-fluya-purple"
        />
      </div>

      {/* Tabla */}
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-xs text-gray-400">
              <th className="px-4 py-3 font-medium">Usuario</th>
              <th className="px-4 py-3 font-medium">Rol</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Último login</th>
              <th className="px-4 py-3 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-600 italic">
                  No hay usuarios que coincidan con los filtros.
                </td>
              </tr>
            ) : (
              filtered.map((u) => (
                <tr key={u.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-white">{u.full_name || u.email}</p>
                    {u.full_name && <p className="text-xs text-gray-500">{u.email}</p>}
                  </td>
                  <td className="px-4 py-3 text-gray-300">{ROLE_LABELS[u.role] ?? u.role}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] border ${STATUS_BADGES[u.status]?.cls ?? ''}`}>
                      {STATUS_BADGES[u.status]?.label ?? u.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{timeAgo(u.last_login_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/leader/usuarios/${u.id}`}
                      className="px-3 py-1 text-fluya-purple hover:text-white hover:bg-fluya-purple/20 rounded-lg transition-colors text-xs"
                    >
                      Ver detalle →
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-600">
        {filtered.length} de {users.length} usuarios
      </p>
    </div>
  );
}
