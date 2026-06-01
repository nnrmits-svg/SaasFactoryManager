import { Suspense } from 'react';
import { redirect, notFound } from 'next/navigation';
import { isLeader } from '@/features/auth/services/permissions';
import { getUserDetailAction } from '@/features/auth/services/user-detail-action';
import { UserDetailCard } from '@/features/auth/components/user-detail-card';

export default function LeaderUsuarioDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <div className="py-8 max-w-4xl mx-auto px-6">
      <Suspense fallback={<div className="text-sm text-gray-500">Cargando…</div>}>
        <DetailContent params={params} />
      </Suspense>
    </div>
  );
}

async function DetailContent({ params }: { params: Promise<{ id: string }> }) {
  if (!(await isLeader())) {
    redirect('/dashboard');
  }

  const { id } = await params;
  const detail = await getUserDetailAction(id);
  if (!detail) notFound();

  return <UserDetailCard detail={detail} />;
}
