import { VersionsDashboard } from '@/features/dashboard/components/versions-dashboard';

export const metadata = {
  title: 'Versiones — SaaS Factory',
  description: 'Estado de versión del kit-comercial por proyecto',
};

export default function VersionsPage() {
  return (
    <main className="min-h-screen bg-fluya-bg pt-20 pb-16">
      <VersionsDashboard />
    </main>
  );
}
