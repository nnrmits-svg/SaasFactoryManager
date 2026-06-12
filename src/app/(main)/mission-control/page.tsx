import { MissionControlBoard } from '@/features/mission-control/components/mission-control-board';

export const metadata = { title: 'Mission Control' };

export default function MissionControlPage() {
  return (
    <main className="min-h-screen bg-fluya-bg pt-20 pb-16">
      <MissionControlBoard />
    </main>
  );
}
