import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Resolves a path that may have lost trailing whitespace during serialization.
 * React Server Actions can strip trailing spaces from strings, causing ENOENT
 * for directories like "Arq Saas Factory " (with trailing space).
 *
 * Strategy: if the path doesn't exist, check the parent directory for an entry
 * whose trimmed name matches.
 */
export async function resolveActualPath(targetPath: string): Promise<string> {
  try {
    await fs.stat(targetPath);
    return targetPath;
  } catch {
    const parentDir = path.dirname(targetPath);
    const baseName = path.basename(targetPath);

    try {
      const entries = await fs.readdir(parentDir);
      const match = entries.find((e) => e !== baseName && e.trimEnd() === baseName);
      if (match) {
        return path.join(parentDir, match);
      }
    } catch {
      // Parent doesn't exist either
    }

    return targetPath;
  }
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.stat(p);
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolves the factory source directory to the actual template location.
 *
 * The saas-factory-setup repo structure is:
 *   saas-factory-setup V4/
 *   ├── README.md, CLAUDE.md (repo-level)
 *   └── saas-factory/          ← template with .claude/ and CLAUDE.md
 *
 * If the user selects the repo root, we auto-detect and use the saas-factory/ subdirectory.
 */
export async function resolveFactorySource(dirPath: string): Promise<string> {
  const resolved = await resolveActualPath(dirPath);

  // Check if this directory has the template files directly
  const hasTemplate =
    await pathExists(path.join(resolved, '.claude')) &&
    await pathExists(path.join(resolved, 'CLAUDE.md'));

  if (hasTemplate) return resolved;

  // Look for saas-factory/ subdirectory (the standard repo structure)
  const subDir = path.join(resolved, 'saas-factory');
  const subHasTemplate =
    await pathExists(path.join(subDir, '.claude')) &&
    await pathExists(path.join(subDir, 'CLAUDE.md'));

  if (subHasTemplate) return subDir;

  // Return as-is (will fail validation downstream with a clear error)
  return resolved;
}
