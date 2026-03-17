'use server';

import { SyncService, type SyncResult } from './sync-service';
import { resolveActualPath, resolveFactorySource } from './resolve-path';

export async function syncProject(factorySourceDir: string, targetProjectPath: string): Promise<SyncResult> {
  if (!factorySourceDir.trim() || !targetProjectPath.trim()) {
    return {
      success: false,
      projectName: '',
      fromVersion: null,
      toVersion: '',
      backupPaths: [],
      error: 'Faltan parametros: directorio fuente y proyecto destino.',
    };
  }

  const resolvedSource = await resolveFactorySource(factorySourceDir);
  const resolvedTarget = await resolveActualPath(targetProjectPath);

  return SyncService.sync(resolvedSource, resolvedTarget);
}
