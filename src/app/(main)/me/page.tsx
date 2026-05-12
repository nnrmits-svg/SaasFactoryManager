import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { UserRole } from '@/features/auth/services/permissions';
import { ProfileEditor } from '@/features/auth/components/profile-editor';
import { ChangePasswordForm } from '@/features/auth/components/change-password-form';
import { MfaSetup } from '@/features/auth/components/mfa-setup';
import { ActiveSessions } from '@/features/auth/components/active-sessions';

export const metadata = {
  title: 'Mi cuenta — Fluya Studio',
};

export default function MePage() {
  return (
    <div className="py-8 max-w-3xl mx-auto px-6 space-y-10">
      <header>
        <h1 className="text-3xl font-bold text-white mb-2">Mi cuenta</h1>
        <p className="text-sm text-gray-400">
          Configuración personal. Lo que cambies acá solo te afecta a vos.
        </p>
      </header>

      <Suspense fallback={<div className="text-sm text-gray-500">Cargando perfil...</div>}>
        <ProfileSection />
      </Suspense>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-white">Seguridad</h2>
        <ChangePasswordForm />
      </section>

      <MfaSetup />
      <ActiveSessions />
    </div>
  );
}

async function ProfileSection() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, role')
    .eq('id', user.id)
    .maybeSingle();

  const fullName = (profile?.full_name as string | null) ?? null;
  const email = (profile?.email as string | undefined) ?? user.email ?? '';
  const role = ((profile?.role as UserRole | undefined) ?? 'client');

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold text-white">Perfil</h2>
      <ProfileEditor initialFullName={fullName} email={email} role={role} />
    </section>
  );
}
