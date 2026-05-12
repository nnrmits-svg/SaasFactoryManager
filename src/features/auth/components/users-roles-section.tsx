// Server component: lista usuarios + roles. Solo visible para founders (via
// RLS — los policies de profiles ya filtran). Permite invitar nuevos y cambiar
// roles existentes via server actions.

import { createClient } from '@/lib/supabase/server';
import { getCurrentUserRole, ROLE_CAPABILITIES, type UserRole } from '@/features/auth/services/permissions';
import { InviteUserForm } from './invite-user-form';
import { ChangeRoleSelect } from './change-role-select';

interface ProfileRow {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  invited_by: string | null;
  created_at: string;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export async function UsersRolesSection() {
  const role = await getCurrentUserRole();
  if (role !== 'founder') return null;

  const supabase = await createClient();
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, invited_by, created_at')
    .order('created_at', { ascending: true });

  if (error) {
    return (
      <div className="bg-white/5 border border-red-500/20 rounded-2xl p-6">
        <p className="text-red-400 text-sm">Error al cargar usuarios: {error.message}</p>
      </div>
    );
  }

  const founders = ((profiles ?? []) as ProfileRow[]).filter((p) => p.role === 'founder');
  const operators = ((profiles ?? []) as ProfileRow[]).filter((p) => p.role === 'operator');
  const clients = ((profiles ?? []) as ProfileRow[]).filter((p) => p.role === 'client');

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white mb-1">Usuarios y Roles</h2>
        <p className="text-sm text-gray-400">
          Invitá operadores (mantenimiento) o clientes (lectura de su proyecto). El sistema
          de roles controla qué puede ver y hacer cada uno.
        </p>
      </div>

      <InviteUserForm />

      <div className="space-y-4">
        <UserGroup
          title="Founders"
          description={ROLE_CAPABILITIES.founder.description}
          users={founders}
          icon="👑"
        />
        <UserGroup
          title="Operadores"
          description={ROLE_CAPABILITIES.operator.description}
          users={operators}
          icon="🔧"
          showRoleEditor
        />
        <UserGroup
          title="Clientes"
          description={ROLE_CAPABILITIES.client.description}
          users={clients}
          icon="👤"
          showRoleEditor
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
  showRoleEditor = false,
}: {
  title: string;
  description: string;
  users: ProfileRow[];
  icon: string;
  showRoleEditor?: boolean;
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
              className="flex items-center justify-between py-2 px-3 bg-white/5 rounded-xl"
            >
              <div>
                <p className="text-sm text-white">{u.full_name || u.email}</p>
                <p className="text-xs text-gray-500">
                  {u.email} · creado {formatDate(u.created_at)}
                </p>
              </div>
              {showRoleEditor && <ChangeRoleSelect userId={u.id} currentRole={u.role} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
