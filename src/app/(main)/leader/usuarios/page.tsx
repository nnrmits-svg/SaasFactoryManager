import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { isLeader } from '@/features/auth/services/permissions';
import { listUsersAction } from '@/features/auth/services/users-list-action';
import { UsersTable } from '@/features/auth/components/users-table';

export default function LeaderUsuariosPage() {
  return (
    <div className="py-8 max-w-6xl mx-auto px-6">
      <Suspense fallback={<div className="text-sm text-gray-500">Cargando usuarios…</div>}>
        <UsersContent />
      </Suspense>
    </div>
  );
}

async function UsersContent() {
  // Defense-in-depth: el middleware ya bloquea /leader/* a no-leaders,
  // pero re-chequeamos en el server component.
  if (!(await isLeader())) {
    redirect('/dashboard');
  }

  const users = await listUsersAction();

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white mb-1">👥 Usuarios</h1>
        <p className="text-sm text-gray-400">
          Lista maestra de todos los usuarios del sistema. Filtrá por rol, estado o buscá por nombre/email.
        </p>
      </div>

      <UsersTable users={users} />
    </section>
  );
}
