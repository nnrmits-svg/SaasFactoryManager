'use server';

import yaml from 'js-yaml';
import type {
  CheatSheetItem,
  CheatSheetResult,
  CheatSheetCategory,
} from './cheat-sheet-types';

const REPO = 'nnrmits-svg/kit-comercial';
const BRANCH = 'main';
const SKILLS_PATH = 'dev/saas-factory/.claude/skills';
const AGENTS_PATH = 'dev/saas-factory/.claude/agents';

// Cache: 2 horas. Si querés invalidar manualmente, llamá a /api/cheat-sheet/revalidate.
const CACHE_REVALIDATE_SECONDS = 7200;

interface FrontmatterParsed {
  name?: string;
  description?: string;
  model?: string;
  tools?: string;
}

function parseFrontmatter(content: string): FrontmatterParsed | null {
  const match = content.match(/^---\r?\n([\s\S]+?)\r?\n---/);
  if (!match) return null;
  try {
    const parsed = yaml.load(match[1]) as FrontmatterParsed;
    return parsed;
  } catch {
    return null;
  }
}

function categorizeSkill(name: string): CheatSheetCategory {
  if (/procesar-lead|pipeline-comercial|onboarding-cliente|nuevo-desde-kit/.test(name)) {
    return 'discovery';
  }
  if (/nuevo-desde-cero|new-app|scaffold-from-prd/.test(name)) {
    return 'scaffold';
  }
  if (/modificacion-existente|bucle-agentico|^add-|update-sf|eject-sf/.test(name)) {
    return 'modificacion';
  }
  if (/audit-proyecto|aplicar-mejoras|sensei/.test(name)) {
    return 'audit';
  }
  if (/genera-tests|playwright/.test(name)) {
    return 'tests';
  }
  if (/mermaid|diagrama|flow-map/.test(name)) {
    return 'visualizacion';
  }
  if (/primer|bitacora|project-plan|fluya-brand|memory-manager/.test(name)) {
    return 'mantenimiento';
  }
  if (/ai|image-generation|website-3d|prp/.test(name)) {
    return 'utility';
  }
  return 'utility';
}

function categorizeAgent(name: string): CheatSheetCategory {
  if (/consulting-engine|design-labs|sensei-reviewer|security-architect/.test(name)) {
    return 'consultor';
  }
  if (/db-architect|codebase-analyst|gestor-documentacion/.test(name)) {
    return 'implementador';
  }
  if (/frontend-specialist|backend-specialist|supabase-admin|vercel-deployer/.test(name)) {
    return 'implementador';
  }
  if (/performance-engineer|security-engineer|accessibility-engineer|observability-engineer|cost-optimizer/.test(name)) {
    return 'engineer';
  }
  if (/code-reviewer|validacion-calidad/.test(name)) {
    return 'review';
  }
  return 'utility';
}

interface GitHubTreeItem {
  path: string;
  type: 'tree' | 'blob';
  sha: string;
}

interface GitHubTreeResponse {
  tree: GitHubTreeItem[];
  truncated: boolean;
}

function getGitHubHeaders(): HeadersInit {
  const headers: HeadersInit = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  const token = process.env.GITHUB_TOKEN;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

/** Fetch protegido con try/catch que NUNCA throws — devuelve null si falla. */
async function safeFetchJson<T>(url: string, headers: HeadersInit): Promise<T | null> {
  try {
    const res = await fetch(url, {
      headers,
      next: { revalidate: CACHE_REVALIDATE_SECONDS },
    });
    if (!res.ok) {
      console.warn('[cheat-sheet] fetch JSON failed:', res.status, url);
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.error('[cheat-sheet] fetch JSON error:', url, err);
    return null;
  }
}

interface GitHubContentsResponse {
  content: string;
  encoding: 'base64';
}

/**
 * Lee el contenido de un archivo del repo via GitHub Contents API.
 * Usa el token (si está configurado) para evitar rate limit de
 * raw.githubusercontent.com que tiene su propio limit y NO acepta tokens.
 */
async function safeFetchFileContent(path: string, headers: HeadersInit): Promise<string | null> {
  const url = `https://api.github.com/repos/${REPO}/contents/${path}?ref=${BRANCH}`;
  try {
    const res = await fetch(url, {
      headers,
      next: { revalidate: CACHE_REVALIDATE_SECONDS },
    });
    if (!res.ok) {
      console.warn('[cheat-sheet] fetch file failed:', res.status, path);
      return null;
    }
    const data = (await res.json()) as GitHubContentsResponse;
    if (data.encoding === 'base64') {
      // Decode base64 → utf-8 string
      // Buffer está disponible en Node.js runtime de Vercel
      return Buffer.from(data.content, 'base64').toString('utf-8');
    }
    return null;
  } catch (err) {
    console.error('[cheat-sheet] fetch file error:', path, err);
    return null;
  }
}

/**
 * Lee el catálogo completo de skills + agents desde el repo kit-comercial via GitHub API.
 * NUNCA throws — si algo falla, devuelve items: [] con error descriptivo.
 *
 * Cache: 2 horas via Next.js `revalidate`. Si configurás GITHUB_TOKEN evitás
 * el rate limit de 60 req/h por IP (sube a 5000/h).
 */
export async function getCheatSheetCatalog(): Promise<CheatSheetResult> {
  // Top-level try/catch garantiza que NUNCA throws.
  try {
    return await fetchCheatSheetCatalogInternal();
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error('[cheat-sheet] unexpected error:', errMsg, err);
    return {
      items: [],
      source: 'fallback',
      error: `Error inesperado: ${errMsg}. Revisá logs de Vercel para detalle.`,
    };
  }
}

async function fetchCheatSheetCatalogInternal(): Promise<CheatSheetResult> {
  const headers = getGitHubHeaders();
  const hasToken = !!process.env.GITHUB_TOKEN;

  // Step 1 — Listar archivos via Trees API
  const treesUrl = `https://api.github.com/repos/${REPO}/git/trees/${BRANCH}?recursive=1`;
  const treesData = await safeFetchJson<GitHubTreeResponse>(treesUrl, headers);

  if (!treesData) {
    return {
      items: [],
      source: 'fallback',
      error: hasToken
        ? 'No se pudo conectar a GitHub. Verificá conectividad o estado de api.github.com.'
        : 'No se pudo conectar a GitHub. Probable rate limit alcanzado (60 req/h sin token). Configurar GITHUB_TOKEN en variables de entorno.',
    };
  }

  // Step 2 — Filtrar paths relevantes
  const skillFiles = treesData.tree.filter(
    (item) =>
      item.type === 'blob' &&
      item.path.startsWith(SKILLS_PATH) &&
      item.path.endsWith('/SKILL.md'),
  );

  const agentFiles = treesData.tree.filter(
    (item) =>
      item.type === 'blob' &&
      item.path.startsWith(AGENTS_PATH) &&
      item.path.endsWith('.md') &&
      !item.path.endsWith('README.md'),
  );

  // Step 3 — Fetch contenido via GitHub Contents API (usa token, evita rate limit
  // de raw.githubusercontent.com que es un CDN separado sin auth API).
  const skillPromises = skillFiles.map(async (file): Promise<CheatSheetItem | null> => {
    const content = await safeFetchFileContent(file.path, headers);
    if (!content) return null;

    const fm = parseFrontmatter(content);
    if (!fm || !fm.name) return null;

    return {
      name: fm.name,
      type: 'skill',
      description: fm.description ?? '',
      category: categorizeSkill(fm.name),
      invocation: `/${fm.name}`,
      path: file.path,
      // Link a UI: viewer en GitHub (no raw, así no expone tokens en redirects)
      rawUrl: `https://github.com/${REPO}/blob/${BRANCH}/${file.path}`,
    };
  });

  const agentPromises = agentFiles.map(async (file): Promise<CheatSheetItem | null> => {
    const content = await safeFetchFileContent(file.path, headers);
    if (!content) return null;

    const fm = parseFrontmatter(content);
    if (!fm || !fm.name) return null;

    return {
      name: fm.name,
      type: 'agent',
      description: fm.description ?? '',
      category: categorizeAgent(fm.name),
      invocation: `Invocar por nombre: "${fm.name}: <tu consigna>"`,
      path: file.path,
      rawUrl: `https://github.com/${REPO}/blob/${BRANCH}/${file.path}`,
    };
  });

  const allResults = await Promise.all([...skillPromises, ...agentPromises]);
  const items: CheatSheetItem[] = [];
  let failures = 0;

  for (const item of allResults) {
    if (item) items.push(item);
    else failures++;
  }

  // Sort: agents primero, después skills, ordenados por categoría + nombre
  items.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'agent' ? -1 : 1;
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    return a.name.localeCompare(b.name);
  });

  // Si fallaron muchos archivos, indicar al usuario
  const totalExpected = skillFiles.length + agentFiles.length;
  if (failures > 0 && failures === totalExpected) {
    return {
      items: [],
      source: 'fallback',
      error: 'GitHub respondió la lista de archivos pero no pudo cargar el contenido. Probable rate limit en raw.githubusercontent.com. Configurar GITHUB_TOKEN ayuda.',
    };
  }
  if (failures > 0) {
    return {
      items,
      source: 'partial',
      error: `Carga parcial: ${items.length} de ${totalExpected} items disponibles (${failures} fallaron, probable rate limit).`,
    };
  }

  return {
    items,
    source: 'github',
    error: null,
  };
}

