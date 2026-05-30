// Tipos + constantes para el dashboard de versiones.
// IMPORTANTE: este archivo NO tiene 'use server' — puede importarse libremente
// desde componentes cliente.

export type DriftStatus =
  | 'up-to-date'
  | 'behind-patch'
  | 'behind-minor'
  | 'behind-major'
  | 'unknown'
  | 'ahead';

export interface ProjectVersionRow {
  projectId: string;
  projectName: string;
  localPath: string | null;
  /** Versión del kit-comercial detectada en .claude/.sf-version.json (via SF Agent) */
  installedVersion: string | null;
  /** Última versión publicada del repo (GitHub API) */
  upstreamVersion: string;
  /** Estado relativo a upstream */
  drift: DriftStatus;
  /** Cuántos releases atrás está (NaN si unknown) */
  releasesBehind: number;
  /** Última actualización del proyecto */
  updatedAt: string;
}

export interface VersionsDashboardData {
  /** Última versión del repo kit-comercial */
  upstreamVersion: string;
  upstreamPublishedAt: string;
  /** Versión de cada proyecto del usuario */
  projects: ProjectVersionRow[];
  /** Stats agregados */
  stats: {
    total: number;
    upToDate: number;
    behind: number;
    unknown: number;
  };
}

export const DRIFT_LABELS: Record<DriftStatus, string> = {
  'up-to-date': '✅ Al día',
  'behind-patch': '🟢 Patch atrás',
  'behind-minor': '🟡 Minor atrás',
  'behind-major': '🔴 Major atrás',
  ahead: '⚡ Adelantado',
  unknown: '⏳ Sin reportar',
};

export const DRIFT_COLORS: Record<DriftStatus, string> = {
  'up-to-date': 'text-green-400 bg-green-500/10 border-green-500/20',
  'behind-patch': 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  'behind-minor': 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  'behind-major': 'text-red-400 bg-red-500/10 border-red-500/20',
  ahead: 'text-fluya-purple bg-fluya-purple/10 border-fluya-purple/20',
  unknown: 'text-gray-400 bg-white/5 border-white/10',
};
