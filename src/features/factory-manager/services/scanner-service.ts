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

/**
 * Extracts the SaaS Factory version from CLAUDE.md content.
 * Looks for patterns like "SaaS Factory V3" or "SaaS Factory V3.1".
 */
function extractVersion(content: string): string | null {
  const match = content.match(VERSION_PATTERN);
  return match ? match[1] : null;
}

/**
 * Checks if a path exists and is a directory.
 */
async function isDirectory(dirPath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(dirPath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Reads file content safely, returning null on failure.
 */
async function readFileSafe(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch {
    return null;
  }
}

/**
 * Scans a single project directory and extracts its metadata.
 */
async function scanProject(projectPath: string): Promise<ScannedProject | null> {
  const claudeDir = path.join(projectPath, '.claude');
  const claudeMdPath = path.join(projectPath, 'CLAUDE.md');

  const hasClaudeDir = await isDirectory(claudeDir);
  if (!hasClaudeDir) return null;

  const claudeMdContent = await readFileSafe(claudeMdPath);
  const hasClaudeMd = claudeMdContent !== null;
  const version = hasClaudeMd ? extractVersion(claudeMdContent) : null;

  return {
    path: projectPath,
    name: path.basename(projectPath),
    version,
    hasClaudeMd,
    hasClaudeDir,
  };
}

/**
 * Recursively collects directories up to a given depth.
 */
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
 * ScannerService - Scans a root directory for projects managed by SaaS Factory.
 *
 * A project is considered "managed" if it contains a `.claude/` directory.
 * For each managed project, the service extracts the version from CLAUDE.md.
 */
export const ScannerService = {
  /**
   * Scans the configured root directory and returns all SaaS Factory projects.
   */
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

  /**
   * Scans a single directory to check if it's a SaaS Factory project.
   */
  async scanSingle(projectPath: string): Promise<ScannedProject | null> {
    return scanProject(projectPath);
  },

  /**
   * Extracts version from a CLAUDE.md file path.
   */
  async getVersion(claudeMdPath: string): Promise<string | null> {
    const content = await readFileSafe(claudeMdPath);
    if (!content) return null;
    return extractVersion(content);
  },
};
