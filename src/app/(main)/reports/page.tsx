import { CostReportTable } from '@/features/dashboard/components/cost-report-table';

export default function ReportsPage() {
  return (
    <main className="max-w-7xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white tracking-tight">Costeo de Proyectos</h1>
        <p className="text-gray-400 mt-1">
          Horas trabajadas por proyecto, listas para exportar a tu Business OS.
        </p>
      </div>
      <CostReportTable />
    </main>
  );
}
