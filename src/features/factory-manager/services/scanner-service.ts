import fs from 'node:fs/promises';
import path from 'node:path';
import type { ScannedProject, ScanResult, ScannerConfig } from '../types';

const DEFAULT_IGNORE_DIRS = [
  'node_modules',
  '.git',
  '.next',
  'dist',
  'build',
  '.cache',
  '.claude',
];

const VERSION_PATTERN = /SaaS Factory\s+(V\d+(?:\.\d+)*)/i;

function extractVersion(content: string): string | null {
  const match = content.match(VERSION_PATTERN);
  return match ? match[1] : null;
}

async function isDirectory(dirPath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(dirPath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

async function readFileSafe(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch {
    return null;
  }
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/** Check if package.json has "next" as a dependency */
async function isNextJsProject(projectPath: string): Promise<boolean> {
  const content = await readFileSafe(path.join(projectPath, 'package.json'));
  if (!content) return false;
  try {
    const pkg = JSON.parse(content);
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    return 'next' in deps;
  } catch {
    return false;
  }
}

/**
 * Scans a single project directory.
 * Detects SF-managed projects (.claude/) AND Next.js projects (package.json with next).
 */
async function scanProject(projectPath: string): Promise<ScannedProject | null> {
  const claudeDir = path.join(projectPath, '.claude');
  const claudeMdPath = path.join(projectPath, 'CLAUDE.md');

  const hasClaudeDir = await isDirectory(claudeDir);
  const claudeMdContent = await readFileSafe(claudeMdPath);
  const hasClaudeMd = claudeMdContent !== null;
  const version = hasClaudeMd ? extractVersion(claudeMdContent) : null;

  if (hasClaudeDir) {
    return {
      path: projectPath,
      name: path.basename(projectPath),
      version,
      hasClaudeMd,
      hasClaudeDir,
      projectType: 'sf-managed',
    };
  }

  // Not SF-managed — check if it's a Next.js project
  const isNextJs = await isNextJsProject(projectPath);
  if (isNextJs) {
    return {
      path: projectPath,
      name: path.basename(projectPath),
      version: null,
      hasClaudeMd,
      hasClaudeDir: false,
      projectType: 'nextjs',
    };
  }

  return null;
}

async function collectDirectories(
  dirPath: string,
  currentDepth: number,
  maxDepth: number,
  ignoreDirs: string[],
): Promise<string[]> {
  if (currentDepth > maxDepth) return [];

  const results: string[] = [];

  if (currentDepth > 0) {
    results.push(dirPath);
  }

  if (currentDepth >= maxDepth) return results;

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const subdirs = entries.filter(
      (entry) => entry.isDirectory() && !ignoreDirs.includes(entry.name),
    );

    const nested = await Promise.all(
      subdirs.map((entry) =>
        collectDirectories(
          path.join(dirPath, entry.name),
          currentDepth + 1,
          maxDepth,
          ignoreDirs,
        ),
      ),
    );

    results.push(...nested.flat());
  } catch {
    // Permission denied or other FS error — skip silently
  }

  return results;
}

/**
 * ScannerService - Scans for SF-managed AND Next.js projects.
 */
export const ScannerService = {
  async scan(config: ScannerConfig): Promise<ScanResult> {
    const { rootDir, maxDepth = 1, ignoreDirs = DEFAULT_IGNORE_DIRS } = config;

    const rootExists = await isDirectory(rootDir);
    if (!rootExists) {
      throw new Error(`Root directory does not exist: ${rootDir}`);
    }

    const directories = await collectDirectories(rootDir, 0, maxDepth, ignoreDirs);

    const scanResults = await Promise.all(
      directories.map((dir) => scanProject(dir)),
    );

    const projects = scanResults.filter(
      (result): result is ScannedProject => result !== null,
    );

    return {
      rootDir,
      projects,
      totalScanned: directories.length,
      scannedAt: new Date(),
    };
  },

  async scanSingle(projectPath: string): Promise<ScannedProject | null> {
    return scanProject(projectPath);
  },

  async getVersion(claudeMdPath: string): Promise<string | null> {
    const content = await readFileSafe(claudeMdPath);
    if (!content) return null;
    return extractVersion(content);
  },

  /** Register a project manually by path */
  async scanManual(projectPath: string): Promise<ScannedProject | null> {
    const exists = await isDirectory(projectPath);
    if (!exists) return null;

    // Try normal scan first
    const scanned = await scanProject(projectPath);
    if (scanned) return scanned;

    // If not detected by scan, check if it has package.json at least
    const hasPkg = await fileExists(path.join(projectPath, 'package.json'));
    if (!hasPkg) return null;

    return {
      path: projectPath,
      name: path.basename(projectPath),
      version: null,
      hasClaudeMd: false,
      hasClaudeDir: false,
      projectType: 'manual',
    };
  },
};
