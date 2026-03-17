'use server';

import { ScannerService } from './scanner-service';
import { resolveActualPath, resolveFactorySource } from './resolve-path';
import type { ScannedProject } from '../types';

export interface ScanActionResult {
  projects: ScannedProject[];
  totalScanned: number;
  latestVersion: string | null;
  error?: string;
}

export async function scanDirectory(formData: FormData): Promise<ScanActionResult> {
  const rootDir = formData.get('rootDir') as string;
  const factorySource = formData.get('factorySource') as string;

  if (!rootDir || rootDir.trim() === '') {
    return { projects: [], totalScanned: 0, latestVersion: null, error: 'Debes ingresar un directorio.' };
  }

  try {
    // Detect latest version from factory source (resolve path for trailing-space dirs)
    let latestVersion: string | null = null;
    if (factorySource?.trim()) {
      const resolvedSource = await resolveFactorySource(factorySource);
      latestVersion = await ScannerService.getVersion(`${resolvedSource}/CLAUDE.md`);
    }

    const resolvedRoot = await resolveActualPath(rootDir);
    const result = await ScannerService.scan({
      rootDir: resolvedRoot,
      maxDepth: 2,
    });

    return {
      projects: result.projects,
      totalScanned: result.totalScanned,
      latestVersion,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido al escanear.';
    return { projects: [], totalScanned: 0, latestVersion: null, error: message };
  }
}
