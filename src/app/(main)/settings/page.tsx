import { Suspense } from 'react';
import { SettingsPage } from '@/features/settings/components/settings-page';
import { UsersRolesSection } from '@/features/auth/components/users-roles-section';

export default function Settings() {
  return (
    <div className="py-8 max-w-7xl mx-auto px-6 space-y-10">
      <SettingsPage />
      <Suspense fallback={<div className="text-gray-500 text-sm">Cargando usuarios...</div>}>
        <UsersRolesSection />
      </Suspense>
    </div>
  );
}
