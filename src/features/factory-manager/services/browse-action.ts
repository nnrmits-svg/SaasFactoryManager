'use server';

import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { resolveActualPath } from './resolve-path';

export interface DirectoryEntry {
  name: string;
  path: string;
  isDirectory: boolean;
}

export interface BrowseResult {
  currentPath: string;
  parentPath: string | null;
  entries: DirectoryEntry[];
  error?: string;
}

export async function browseDirectory(dirPath?: string): Promise<BrowseResult> {
  const targetPath = await resolveActualPath(dirPath || os.homedir());

  try {
    const stat = await fs.stat(targetPath);
    if (!stat.isDirectory()) {
      return {
        currentPath: targetPath,
        parentPath: null,
        entries: [],
        error: 'La ruta no es un directorio.',
      };
    }

    const rawEntries = await fs.readdir(targetPath, { withFileTypes: true });

    const entries: DirectoryEntry[] = rawEntries
      .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((e) => ({
        name: e.name,
        path: path.join(targetPath, e.name),
        isDirectory: true,
      }));

    const parent = path.dirname(targetPath);

    return {
      currentPath: targetPath,
      parentPath: parent !== targetPath ? parent : null,
      entries,
    };
  } catch {
    return {
      currentPath: targetPath,
      parentPath: null,
      entries: [],
      error: `No se puede acceder a: ${targetPath}`,
    };
  }
}
