// Server component: lista usuarios + ABM completo. Leader-only.

import { createClient } from '@/lib/supabase/server';
import { getCurrentUserRole, ROLE_CAPABILITIES, type UserRole } from '@/features/auth/services/permissions';
import { InviteUserForm } from './invite-user-form';
import { UserRowActions } from './user-row-actions';
import type { UserStatus } from '@/features/auth/types';

interface ProfileRow {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  status: UserStatus;
  hourly_rate_usd: number | null;
  invited_by: string | null;
  created_at: string;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

export async function UsersRolesSection() {
  const role = await getCurrentUserRole();
  if (role !== 'leader') return null;

  const supabase = await createClient();
  const { data: { user: currentUser } } = await supabase.auth.getUser();

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, status, hourly_rate_usd, invited_by, created_at')
    .order('created_at', { ascending: true });

  if (error) {
    return (
      <div className="bg-white/5 border border-red-500/20 rounded-2xl p-6">
        <p className="text-red-400 text-sm">Error al cargar usuarios: {error.message}</p>
      </div>
    );
  }

  const all = (profiles ?? []) as ProfileRow[];
  const leaders = all.filter((p) => p.role === 'leader');
  const devs = all.filter((p) => p.role === 'dev');
  const comerciales = all.filter((p) => p.role === 'comercial');
  const clientes = all.filter((p) => p.role === 'cliente');
  const currentUserId = currentUser?.id ?? '';

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white mb-1">Usuarios y Roles</h2>
        <p className="text-sm text-gray-400">
          ABM completo de usuarios. Invitá, cambiá roles, suspendé, reseteá contraseñas o borralos.
        </p>
      </div>

      <InviteUserForm />

      <div className="space-y-4">
        <UserGroup
          title="Líderes"
          description={ROLE_CAPABILITIES.leader.description}
          users={leaders}
          icon="👑"
          currentUserId={currentUserId}
        />
        <UserGroup
          title="Desarrolladores"
          description={ROLE_CAPABILITIES.dev.description}
          users={devs}
          icon="💻"
          currentUserId={currentUserId}
        />
        <UserGroup
          title="Comerciales"
          description={ROLE_CAPABILITIES.comercial.description}
          users={comerciales}
          icon="🤝"
          currentUserId={currentUserId}
        />
        <UserGroup
          title="Clientes"
          description={ROLE_CAPABILITIES.cliente.description}
          users={clientes}
          icon="👤"
          currentUserId={currentUserId}
        />
      </div>
    </section>
  );
}

function UserGroup({
  title,
  description,
  users,
  icon,
  currentUserId,
}: {
  title: string;
  description: string;
  users: ProfileRow[];
  icon: string;
  currentUserId: string;
}) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
      <div className="flex items-baseline gap-2 mb-1">
        <span>{icon}</span>
        <h3 className="text-base font-medium text-white">{title}</h3>
        <span className="text-xs text-gray-500">({users.length})</span>
      </div>
      <p className="text-xs text-gray-500 mb-4">{description}</p>
      {users.length === 0 ? (
        <p className="text-sm text-gray-600 italic">— ninguno todavía —</p>
      ) : (
        <ul className="space-y-2">
          {users.map((u) => (
            <li
              key={u.id}
              className="flex items-start justify-between py-3 px-3 bg-white/5 rounded-xl gap-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm text-white truncate">{u.full_name || u.email}</p>
                <p className="text-xs text-gray-500 truncate">
                  {u.email} · creado {formatDate(u.created_at)}
                </p>
              </div>
              <UserRowActions
                userId={u.id}
                email={u.email}
                fullName={u.full_name}
                currentRole={u.role}
                status={u.status}
                hourlyRate={u.hourly_rate_usd}
                isSelf={u.id === currentUserId}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
