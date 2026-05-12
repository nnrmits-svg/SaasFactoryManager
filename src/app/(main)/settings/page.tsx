import { Suspense } from 'react';
import { SettingsPage } from '@/features/settings/components/settings-page';
import { UsersRolesSection } from '@/features/auth/components/users-roles-section';
import { AuditLogViewer } from '@/features/auth/components/audit-log-viewer';
import { MfaSetup } from '@/features/auth/components/mfa-setup';
import { ActiveSessions } from '@/features/auth/components/active-sessions';

export default function Settings() {
  return (
    <div className="py-8 max-w-7xl mx-auto px-6 space-y-10">
      <SettingsPage />

      <Suspense fallback={<SectionSkeleton title="Usuarios y Roles" />}>
        <UsersRolesSection />
      </Suspense>

      <MfaSetup />
      <ActiveSessions />

      <Suspense fallback={<SectionSkeleton title="Audit Logs" />}>
        <AuditLogViewer />
      </Suspense>
    </div>
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
