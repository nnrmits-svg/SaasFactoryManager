'use server';

import fs from 'node:fs/promises';
import path from 'node:path';

/** Process/meta skills — NOT installable in projects */
const META_SKILLS = new Set([
  'bucle-agentico', 'primer', 'prp', 'skill-creator', 'memory-manager',
  'autoresearch', 'playwright-cli', 'supabase', 'eject-sf', 'update-sf', 'new-app',
]);

/** Nice labels for known skills */
const LABEL_MAP: Record<string, string> = {
  'apply-design-system': 'Design System Fluya',
  'add-login': 'Autenticacion',
  'add-payments': 'Pagos (Polar)',
  'add-emails': 'Emails (Resend)',
  'add-mobile': 'PWA + Push',
  'add-subscriptions': 'CRUD Suscripciones',
  'add-alerts': 'Alertas',
  'add-admin': 'Panel Admin',
  'ai': 'IA (Chat/RAG/Vision)',
  'website-3d': 'Landing Cinematica',
  'image-generation': 'Generacion de Imagenes',
};

/** Category mapping */
const CATEGORY_MAP: Record<string, string> = {
  'add-login': 'auth',
  'add-payments': 'backend',
  'add-emails': 'backend',
  'add-mobile': 'frontend',
  'add-subscriptions': 'feature',
  'add-alerts': 'feature',
  'add-admin': 'feature',
  'apply-design-system': 'ui',
  'website-3d': 'ui',
  'ai': 'ai',
  'image-generation': 'ai',
};

export interface SkillInfo {
  name: string;
  label: string;
  description: string;
  category: string;
  hasSkillFile: boolean;
  isInjectable: boolean;
  prerequisites?: string[];
}

/** Parse YAML frontmatter from SKILL.md */
function parseFrontmatter(content: string): Record<string, string> {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};

  const result: Record<string, string> = {};
  let currentKey = '';
  let currentValue = '';

  for (const line of match[1].split('\n')) {
    const keyMatch = line.match(/^([\w-]+)\s*:\s*(.*)/);
    if (keyMatch) {
      if (currentKey) result[currentKey] = currentValue.trim();
      currentKey = keyMatch[1];
      const val = keyMatch[2].replace(/^["']|["']$/g, '');
      currentValue = val === '|' ? '' : val;
    } else if (currentKey && (line.startsWith('  ') || line.trim() === '')) {
      currentValue += ' ' + line.trim();
    }
  }
  if (currentKey) result[currentKey] = currentValue.trim();

  return result;
}

/** Extract description from blockquote after heading (skills without frontmatter) */
function extractBlockquoteDescription(content: string): string {
  const match = content.match(/^#[^\n]+\n\n>(.*(?:\n>.*)*)/m);
  if (!match) return '';
  return match[1]
    .split('\n')
    .map((l) => l.replace(/^>\s*/, '').trim())
    .filter(Boolean)
    .join(' ');
}

/** Extract prerequisites like `/add-login` from content */
function extractPrerequisites(content: string): string[] {
  const section = content.match(/## Pre-requisitos?\n\n([\s\S]*?)(?:\n##|\n$)/);
  if (!section) return [];
  const refs = section[1].match(/`\/[\w-]+`/g);
  return refs ? refs.map((r) => r.replace(/`\//g, '').replace(/`/g, '')) : [];
}

/** Convert kebab-case to Title Case */
function nameToLabel(name: string): string {
  return name
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** Discover ALL skills from .claude/skills/ directory */
export async function discoverAllSkills(): Promise<SkillInfo[]> {
  const skillsDir = path.join(process.cwd(), '.claude', 'skills');
  const results: SkillInfo[] = [];

  let entries: string[];
  try {
    entries = await fs.readdir(skillsDir);
  } catch {
    return [];
  }

  for (const entry of entries) {
    if (entry.endsWith('.md')) continue;

    const skillDir = path.join(skillsDir, entry);
    const stat = await fs.stat(skillDir).catch(() => null);
    if (!stat?.isDirectory()) continue;

    const skillFile = path.join(skillDir, 'SKILL.md');
    let content = '';
    let hasSkillFile = false;

    try {
      content = await fs.readFile(skillFile, 'utf-8');
      hasSkillFile = true;
    } catch {
      continue;
    }

    const frontmatter = parseFrontmatter(content);
    const isInjectable = !META_SKILLS.has(entry);

    let description = frontmatter.description ?? '';
    if (!description) {
      description = extractBlockquoteDescription(content);
    }
    if (description.length > 150) {
      description = description.slice(0, 147) + '...';
    }

    const label = LABEL_MAP[entry] ?? nameToLabel(entry);
    const category = CATEGORY_MAP[entry] ?? (isInjectable ? 'other' : 'meta');
    const prerequisites = extractPrerequisites(content);

    results.push({
      name: entry,
      label,
      description,
      category,
      hasSkillFile,
      isInjectable,
      prerequisites: prerequisites.length > 0 ? prerequisites : undefined,
    });
  }

  results.sort((a, b) => {
    if (a.isInjectable !== b.isInjectable) return a.isInjectable ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return results;
}

/** Get only injectable skills (backward compatible) */
export async function getApplicableSkills(): Promise<SkillInfo[]> {
  const all = await discoverAllSkills();
  return all.filter((s) => s.isInjectable);
}

/** Read full SKILL.md content */
export async function getSkillContent(skillName: string): Promise<string | null> {
  const skillFile = path.join(process.cwd(), '.claude', 'skills', skillName, 'SKILL.md');
  try {
    return await fs.readFile(skillFile, 'utf-8');
  } catch {
    return null;
  }
}

/** Check which skills are installed in a target project */
export async function getProjectSkills(projectPath: string): Promise<string[]> {
  const skillsDir = path.join(projectPath, '.claude', 'skills');

  let entries: string[];
  try {
    entries = await fs.readdir(skillsDir);
  } catch {
    return [];
  }

  const skills: string[] = [];
  for (const entry of entries) {
    if (entry.endsWith('.md')) continue;
    const entryPath = path.join(skillsDir, entry);
    const stat = await fs.stat(entryPath).catch(() => null);
    if (!stat?.isDirectory()) continue;

    try {
      await fs.access(path.join(entryPath, 'SKILL.md'));
      skills.push(entry);
    } catch {
      // No SKILL.md
    }
  }

  return skills;
}

/** Copy a skill from FM to a target project */
export async function installSkillToProject(
  skillName: string,
  targetProjectPath: string,
): Promise<{ success: boolean; error?: string }> {
  const sourceDir = path.join(process.cwd(), '.claude', 'skills', skillName);
  const targetDir = path.join(targetProjectPath, '.claude', 'skills', skillName);

  try {
    await fs.access(path.join(sourceDir, 'SKILL.md'));
  } catch {
    return { success: false, error: `Skill "${skillName}" no encontrado en el registry` };
  }

  try {
    await fs.mkdir(path.join(targetProjectPath, '.claude', 'skills'), { recursive: true });
    await copyDir(sourceDir, targetDir);
    return { success: true };
  } catch (err) {
    return { success: false, error: `Error copiando skill: ${String(err)}` };
  }
}

/** Recursive directory copy */
async function copyDir(src: string, dest: string): Promise<void> {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}
