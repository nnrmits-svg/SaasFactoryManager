import { Suspense } from 'react';
import { redirect, notFound } from 'next/navigation';
import { isLeader } from '@/features/auth/services/permissions';
import { getFactoryProjectDetail } from '@/features/factory-manager/services/factory-detail-action';
import { ProjectDetailCard } from '@/features/factory-manager/components/project-detail-card';

export default function LeaderProyectoDetailPage({ params }: { params: Promise<{ id: string }> }) {
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
  const detail = await getFactoryProjectDetail(id);
  if (!detail) notFound();
  return <ProjectDetailCard detail={detail} />;
}
