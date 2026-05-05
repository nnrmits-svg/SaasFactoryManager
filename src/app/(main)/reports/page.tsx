import { CostReportTable } from '@/features/dashboard/components/cost-report-table';

export default function ReportsPage() {
  return (
    <main className="max-w-7xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white tracking-tight">Reports</h1>
        <p className="text-gray-400 mt-1">
          Actividad de Claude por proyecto: tokens, costo y modelo más usado.
        </p>
      </div>
      <CostReportTable />
    </main>
  );
}
