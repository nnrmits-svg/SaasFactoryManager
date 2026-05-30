'use server';

import { getPortfolioProjects } from './git-sync-action';
import type { Project } from '../types';

export type DriftStatus = 'up-to-date' | 'behind-patch' | 'behind-minor' | 'behind-major' | 'unknown' | 'ahead';

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

const REPO = 'nnrmits-svg/kit-comercial';

interface GitHubReleaseResponse {
  tag_name: string;
  published_at: string;
}

/** Parse "v1.8.0" → { major: 1, minor: 8, patch: 0 } */
function parseSemver(version: string): { major: number; minor: number; patch: number } | null {
  const clean = version.replace(/^v/, '');
  const parts = clean.split('.');
  if (parts.length < 2) return null;
  const major = Number(parts[0]);
  const minor = Number(parts[1]);
  const patch = Number(parts[2] ?? '0');
  if (isNaN(major) || isNaN(minor) || isNaN(patch)) return null;
  return { major, minor, patch };
}

function compareVersions(
  installed: string | null,
  upstream: string,
): { drift: DriftStatus; releasesBehind: number } {
  if (!installed) {
    return { drift: 'unknown', releasesBehind: NaN };
  }

  const inst = parseSemver(installed);
  const up = parseSemver(upstream);

  if (!inst || !up) {
    return { drift: 'unknown', releasesBehind: NaN };
  }

  // Calcular si está adelante
  if (inst.major > up.major) return { drift: 'ahead', releasesBehind: 0 };
  if (inst.major === up.major && inst.minor > up.minor) return { drift: 'ahead', releasesBehind: 0 };
  if (
    inst.major === up.major &&
    inst.minor === up.minor &&
    inst.patch > up.patch
  ) {
    return { drift: 'ahead', releasesBehind: 0 };
  }

  // Up to date
  if (inst.major === up.major && inst.minor === up.minor && inst.patch === up.patch) {
    return { drift: 'up-to-date', releasesBehind: 0 };
  }

  // Behind
  if (inst.major < up.major) {
    return { drift: 'behind-major', releasesBehind: up.major - inst.major };
  }
  if (inst.minor < up.minor) {
    return { drift: 'behind-minor', releasesBehind: up.minor - inst.minor };
  }
  return { drift: 'behind-patch', releasesBehind: up.patch - inst.patch };
}

/**
 * Fetch dashboard de versiones por proyecto + upstream del kit-comercial.
 *
 * Estrategia:
 * 1. Leer projects.sf_version de Supabase (lo populariza el SF Agent al boot)
 * 2. Leer último Release del repo via GitHub API
 * 3. Comparar y armar status por proyecto
 *
 * Robustez: NUNCA throws. Si GitHub falla o Supabase falla, devuelve data parcial
 * con error message. El componente decide cómo mostrar.
 */
export async function getVersionsDashboardData(): Promise<
  VersionsDashboardData & { error: string | null }
> {
  // Top-level try/catch garantiza que NUNCA throws (último resort).
  try {
    let error: string | null = null;

    // Fetch upstream (GitHub) y projects (Supabase) en paralelo, ambos seguros
    const [upstream, projectsResult] = await Promise.all([
      fetchLatestRelease(),
      safeGetProjects(),
    ]);

    if (upstream.tag_name === 'unknown') {
      error = process.env.GITHUB_TOKEN
        ? 'No se pudo obtener la última versión del repo. Verificá conectividad a GitHub.'
        : 'No se pudo obtener la última versión del repo. Probable rate limit de GitHub (60 req/h sin token). Configurar GITHUB_TOKEN ayuda.';
    }

    if (projectsResult.error) {
      error = error
        ? `${error} Además: ${projectsResult.error}`
        : projectsResult.error;
    }

    const projects = projectsResult.projects;

    const rows: ProjectVersionRow[] = projects.map((p) => {
      const installed = p.sfVersion;
      const { drift, releasesBehind } = compareVersions(installed, upstream.tag_name);

      return {
        projectId: p.id,
        projectName: p.name,
        localPath: p.localPath ?? p.path ?? null,
        installedVersion: installed,
        upstreamVersion: upstream.tag_name,
        drift,
        releasesBehind,
        updatedAt: p.updatedAt ?? p.createdAt ?? '',
      };
    });

    // Stats
    const upToDate = rows.filter((r) => r.drift === 'up-to-date').length;
    const behind = rows.filter(
      (r) => r.drift === 'behind-patch' || r.drift === 'behind-minor' || r.drift === 'behind-major',
    ).length;
    const unknown = rows.filter((r) => r.drift === 'unknown').length;

    return {
      upstreamVersion: upstream.tag_name,
      upstreamPublishedAt: upstream.published_at,
      projects: rows,
      stats: {
        total: rows.length,
        upToDate,
        behind,
        unknown,
      },
      error,
    };
  } catch (err) {
    // Último resort: si algo inesperado throw, devolver respuesta vacía con error.
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error('[versions] unexpected error in getVersionsDashboardData:', errMsg, err);
    return {
      upstreamVersion: 'unknown',
      upstreamPublishedAt: '',
      projects: [],
      stats: { total: 0, upToDate: 0, behind: 0, unknown: 0 },
      error: `Error inesperado: ${errMsg}. Revisá logs de Vercel para más detalle.`,
    };
  }
}

async function fetchLatestRelease(): Promise<GitHubReleaseResponse> {
  const headers: HeadersInit = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  const token = process.env.GITHUB_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
      headers,
      next: { revalidate: 600 }, // 10 min
    });

    if (!res.ok) {
      console.warn('[versions] fetchLatestRelease failed:', res.status);
      return { tag_name: 'unknown', published_at: '' };
    }

    return (await res.json()) as GitHubReleaseResponse;
  } catch (err) {
    console.error('[versions] fetchLatestRelease error:', err);
    return { tag_name: 'unknown', published_at: '' };
  }
}

/** Wrap getPortfolioProjects con try/catch para que NUNCA throw. */
async function safeGetProjects(): Promise<{ projects: Project[]; error: string | null }> {
  try {
    const projects = await getPortfolioProjects();
    return { projects, error: null };
  } catch (err) {
    console.error('[versions] safeGetProjects error:', err);
    return {
      projects: [],
      error: 'No se pudieron cargar los proyectos desde Supabase. Verificá la conexión o sesión.',
    };
  }
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
