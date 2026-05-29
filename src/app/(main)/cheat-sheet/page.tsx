import { CheatSheetDashboard } from '@/features/dashboard/components/cheat-sheet-dashboard';

export const metadata = {
  title: 'Cheat Sheet — SaaS Factory',
  description: 'Catálogo vivo de skills y agents del Kit Grupo ITS',
};

export default function CheatSheetPage() {
  return (
    <main className="min-h-screen bg-fluya-bg pt-20 pb-16">
      <CheatSheetDashboard />
    </main>
  );
}
