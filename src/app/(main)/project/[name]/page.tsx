import { Suspense } from 'react';
import { getProjectDetail } from '@/features/factory-manager/services/project-detail-action';
import { ProjectDetailView } from '@/features/dashboard/components/project-detail-view';
import Link from 'next/link';

interface Props {
  params: Promise<{ name: string }>;
}

async function ProjectContent({ params }: Props) {
  const { name } = await params;
  const decodedName = decodeURIComponent(name);
  const detail = await getProjectDetail(decodedName);

  if (!detail) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-8 text-center">
        <h1 className="text-2xl font-bold text-white mb-4">Proyecto no encontrado</h1>
        <p className="text-gray-400 mb-6">
          &quot;{decodedName}&quot; no existe en la base de datos. Sincroniza desde el Dashboard primero.
        </p>
        <Link
          href="/dashboard"
          className="px-5 py-2.5 bg-fluya-purple text-white rounded-xl hover:shadow-[0_0_20px_rgba(139,92,246,0.3)] transition-all duration-300"
        >
          Ir al Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="py-8">
      <ProjectDetailView detail={detail} />
    </div>
  );
}

export default function ProjectPage({ params }: Props) {
  return (
    <Suspense fallback={
      <div className="max-w-4xl mx-auto px-6 py-8 text-center">
        <div className="animate-pulse">
          <div className="h-8 bg-white/10 rounded w-1/3 mx-auto mb-4" />
          <div className="h-4 bg-white/10 rounded w-2/3 mx-auto" />
        </div>
      </div>
    }>
      <ProjectContent params={params} />
    </Suspense>
  );
}
