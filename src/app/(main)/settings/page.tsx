import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { SettingsPage } from '@/features/settings/components/settings-page';
import { UsersRolesSection } from '@/features/auth/components/users-roles-section';
import { AuditLogViewer } from '@/features/auth/components/audit-log-viewer';
import { isFounder } from '@/features/auth/services/permissions';

export default function Settings() {
  return (
    <div className="py-8 max-w-7xl mx-auto px-6 space-y-10">
      <Suspense fallback={<div className="text-sm text-gray-500">Verificando permisos...</div>}>
        <FounderGate />
      </Suspense>
    </div>
  );
}

async function FounderGate() {
  if (!(await isFounder())) {
    redirect('/me');
  }

  return (
    <>
      <SettingsPage />

      <Suspense fallback={<SectionSkeleton title="Usuarios y Roles" />}>
        <UsersRolesSection />
      </Suspense>

      <Suspense fallback={<SectionSkeleton title="Audit Logs" />}>
        <AuditLogViewer />
      </Suspense>

      <div className="text-center text-sm text-gray-500 pb-4">
        ¿Buscás tu configuración personal? Andá a{' '}
        <Link href="/me" className="text-fluya-purple hover:text-fluya-blue transition-colors">
          Mi cuenta
        </Link>
        .
      </div>
    </>
  );
}

function SectionSkeleton({ title }: { title: string }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold text-white">{title}</h2>
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
        <p className="text-sm text-gray-500">Cargando...</p>
      </div>
    </section>
  );
}
