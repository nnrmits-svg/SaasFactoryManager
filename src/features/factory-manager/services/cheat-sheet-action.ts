'use server';

import yaml from 'js-yaml';

export type CheatSheetItemType = 'skill' | 'agent';

export type CheatSheetCategory =
  | 'discovery'
  | 'scaffold'
  | 'modificacion'
  | 'audit'
  | 'tests'
  | 'visualizacion'
  | 'mantenimiento'
  | 'consultor'
  | 'implementador'
  | 'engineer'
  | 'review'
  | 'utility';

export interface CheatSheetItem {
  name: string;
  type: CheatSheetItemType;
  description: string;
  category: CheatSheetCategory;
  invocation: string;
  path: string;
  rawUrl: string;
}

const REPO = 'nnrmits-svg/kit-comercial';
const BRANCH = 'main';
const SKILLS_PATH = 'dev/saas-factory/.claude/skills';
const AGENTS_PATH = 'dev/saas-factory/.claude/agents';

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

function categorizeSkill(name: string, description: string): CheatSheetCategory {
  const lower = `${name} ${description}`.toLowerCase();

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

/**
 * Lee el catálogo completo de skills + agents desde el repo kit-comercial via GitHub API.
 *
 * Estrategia:
 * 1. Trees API recursivo para listar todos los archivos
 * 2. Filtrar paths que matchean SKILL.md de skills o .md de agents
 * 3. Fetch raw content para cada uno
 * 4. Parsear YAML frontmatter
 *
 * Cache: revalidate cada 1 hora (Cache Components de Next 16).
 * Si querés invalidar manualmente: updateTag('cheat-sheet').
 */
export async function getCheatSheetCatalog(): Promise<CheatSheetItem[]> {
  'use cache';

  // List all files via GitHub Trees API
  const treesUrl = `https://api.github.com/repos/${REPO}/git/trees/${BRANCH}?recursive=1`;
  const headers: HeadersInit = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };

  // Opcional: si hay token GitHub configurado, usarlo para evitar rate limit
  const token = process.env.GITHUB_TOKEN;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const treesRes = await fetch(treesUrl, { headers });
  if (!treesRes.ok) {
    console.error('[cheat-sheet] Failed to fetch trees:', treesRes.status, await treesRes.text());
    return [];
  }

  const treesData = (await treesRes.json()) as GitHubTreeResponse;

  // Skills: paths como dev/saas-factory/.claude/skills/{name}/SKILL.md
  const skillFiles = treesData.tree.filter(
    (item) =>
      item.type === 'blob' &&
      item.path.startsWith(SKILLS_PATH) &&
      item.path.endsWith('/SKILL.md'),
  );

  // Agents: paths como dev/saas-factory/.claude/agents/{name}.md
  const agentFiles = treesData.tree.filter(
    (item) =>
      item.type === 'blob' &&
      item.path.startsWith(AGENTS_PATH) &&
      item.path.endsWith('.md') &&
      !item.path.endsWith('README.md'),
  );

  const items: CheatSheetItem[] = [];

  // Fetch + parse skills en paralelo
  const skillPromises = skillFiles.map(async (file): Promise<CheatSheetItem | null> => {
    const rawUrl = `https://raw.githubusercontent.com/${REPO}/${BRANCH}/${file.path}`;
    const res = await fetch(rawUrl);
    if (!res.ok) return null;
    const content = await res.text();
    const fm = parseFrontmatter(content);
    if (!fm || !fm.name) return null;

    const name = fm.name;
    const description = fm.description ?? '';
    const category = categorizeSkill(name, description);

    return {
      name,
      type: 'skill',
      description,
      category,
      invocation: `/${name}`,
      path: file.path,
      rawUrl,
    };
  });

  // Fetch + parse agents en paralelo
  const agentPromises = agentFiles.map(async (file): Promise<CheatSheetItem | null> => {
    const rawUrl = `https://raw.githubusercontent.com/${REPO}/${BRANCH}/${file.path}`;
    const res = await fetch(rawUrl);
    if (!res.ok) return null;
    const content = await res.text();
    const fm = parseFrontmatter(content);
    if (!fm || !fm.name) return null;

    const name = fm.name;
    const description = fm.description ?? '';
    const category = categorizeAgent(name);

    return {
      name,
      type: 'agent',
      description,
      category,
      invocation: `Invocar por nombre: "${name}: <tu consigna>"`,
      path: file.path,
      rawUrl,
    };
  });

  const allResults = await Promise.all([...skillPromises, ...agentPromises]);
  for (const item of allResults) {
    if (item) items.push(item);
  }

  // Sort: agents primero por categoría, después skills por categoría
  return items.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'agent' ? -1 : 1;
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    return a.name.localeCompare(b.name);
  });
}

export const CATEGORY_LABELS: Record<CheatSheetCategory, string> = {
  discovery: '🎯 Discovery / Lead',
  scaffold: '🆕 Apps nuevas',
  modificacion: '🔧 Modificar apps',
  audit: '🔍 Audit y mejoras',
  tests: '🧪 Tests',
  visualizacion: '📊 Diagramas',
  mantenimiento: '🧰 Mantenimiento',
  consultor: '🎓 Consultor estratégico',
  implementador: '🛠️ Implementador técnico',
  engineer: '🔬 Quality Engineer',
  review: '👀 Review',
  utility: '⚙️ Utility',
};

export const CATEGORY_ORDER: CheatSheetCategory[] = [
  // Agents
  'consultor',
  'implementador',
  'engineer',
  'review',
  // Skills
  'discovery',
  'scaffold',
  'modificacion',
  'audit',
  'tests',
  'visualizacion',
  'mantenimiento',
  'utility',
];
