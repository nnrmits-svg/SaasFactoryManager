import fs from 'node:fs/promises';
import path from 'node:path';

/** Files/dirs to sync from factory source to target project */
const SYNC_ITEMS = ['.claude', 'CLAUDE.md', 'GEMINI.md'];

/** Items inside .claude/ to preserve in the target (user-specific data) */
const PRESERVE_IN_CLAUDE = ['memory'];

/**
 * Copies a directory recursively.
 */
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

/**
 * Backs up a directory or file by renaming it with a .bak suffix.
 */
async function backup(targetPath: string): Promise<string | null> {
  try {
    await fs.access(targetPath);
    const bakPath = `${targetPath}.bak-${Date.now()}`;
    await fs.rename(targetPath, bakPath);
    return bakPath;
  } catch {
    return null;
  }
}

/**
 * Moves preserved items from backup back into the new .claude/ directory.
 */
async function restorePreserved(backupPath: string, newClaudeDir: string): Promise<void> {
  for (const item of PRESERVE_IN_CLAUDE) {
    const srcPath = path.join(backupPath, item);
    const destPath = path.join(newClaudeDir, item);

    try {
      const stat = await fs.stat(srcPath);
      if (stat.isDirectory()) {
        await copyDir(srcPath, destPath);
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    } catch {
      // Item didn't exist in backup, skip
    }
  }
}

export interface SyncResult {
  success: boolean;
  projectName: string;
  fromVersion: string | null;
  toVersion: string;
  backupPaths: string[];
  error?: string;
}

/**
 * SyncService - Syncs factory assets from V4 source to a target project.
 *
 * What gets synced: .claude/, CLAUDE.md, GEMINI.md
 * What gets preserved: .claude/memory/ (user data)
 * What is NOT touched: src/, package.json, node_modules, etc.
 */
export const SyncService = {
  /**
   * Syncs a target project with the factory source.
   */
  async sync(factorySourceDir: string, targetProjectDir: string): Promise<SyncResult> {
    const backupPaths: string[] = [];

    try {
      // Validate source exists
      const sourceClaudeDir = path.join(factorySourceDir, '.claude');
      const sourceClaudeMd = path.join(factorySourceDir, 'CLAUDE.md');

      try {
        await fs.access(sourceClaudeDir);
        await fs.access(sourceClaudeMd);
      } catch {
        return {
          success: false,
          projectName: path.basename(targetProjectDir),
          fromVersion: null,
          toVersion: 'V4',
          backupPaths: [],
          error: `Directorio fuente invalido. No se encontro .claude/ o CLAUDE.md en: ${factorySourceDir}`,
        };
      }

      // Backup and sync each item
      for (const item of SYNC_ITEMS) {
        const srcPath = path.join(factorySourceDir, item);
        const destPath = path.join(targetProjectDir, item);

        // Check if source item exists
        try {
          await fs.access(srcPath);
        } catch {
          continue; // GEMINI.md might not exist, skip
        }

        // Backup existing
        const bakPath = await backup(destPath);
        if (bakPath) backupPaths.push(bakPath);

        // Copy from source
        const stat = await fs.stat(srcPath);
        if (stat.isDirectory()) {
          await copyDir(srcPath, destPath);
        } else {
          await fs.copyFile(srcPath, destPath);
        }
      }

      // Restore preserved items from .claude/ backup
      const claudeBackup = backupPaths.find((p) => p.includes('.claude.bak-'));
      if (claudeBackup) {
        const newClaudeDir = path.join(targetProjectDir, '.claude');
        await restorePreserved(claudeBackup, newClaudeDir);
      }

      return {
        success: true,
        projectName: path.basename(targetProjectDir),
        fromVersion: null,
        toVersion: 'V4',
        backupPaths,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido durante sync.';
      return {
        success: false,
        projectName: path.basename(targetProjectDir),
        fromVersion: null,
        toVersion: 'V4',
        backupPaths,
        error: message,
      };
    }
  },
};
