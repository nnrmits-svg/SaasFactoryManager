'use server';

import { exec } from 'node:child_process';
import { resolveActualPath } from './resolve-path';

export interface OpenResult {
  success: boolean;
  error?: string;
}

export async function openInIDE(projectPath: string): Promise<OpenResult> {
  if (!projectPath.trim()) {
    return { success: false, error: 'Ruta de proyecto vacia.' };
  }

  const resolved = await resolveActualPath(projectPath);

  return new Promise((resolve) => {
    exec(`open -a Antigravity "${resolved}"`, (error) => {
      if (error) {
        resolve({ success: false, error: `No se pudo abrir Antigravity: ${error.message}` });
      } else {
        resolve({ success: true });
      }
    });
  });
}
