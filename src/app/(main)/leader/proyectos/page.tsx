import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { isLeader } from '@/features/auth/services/permissions';
import { listFactoryProjects } from '@/features/factory-manager/services/factory-sessions-action';
import { FactoryTable } from '@/features/factory-manager/components/factory-table';

export default function LeaderProyectosPage() {
  return (
    <div className="py-8 max-w-6xl mx-auto px-6">
      <Suspense fallback={<div className="text-sm text-gray-500">Cargando Factory…</div>}>
        <FactoryContent />
      </Suspense>
    </div>
  );
}

async function FactoryContent() {
  if (!(await isLeader())) {
    redirect('/dashboard');
  }

  const projects = await listFactoryProjects();

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white mb-1">📦 Factory</h1>
        <p className="text-sm text-gray-400">
          Proyectos del equipo y quién está trabajando ahora (sesiones reportadas por el SF Agent).
        </p>
      </div>
      <FactoryTable projects={projects} />
    </section>
  );
}
