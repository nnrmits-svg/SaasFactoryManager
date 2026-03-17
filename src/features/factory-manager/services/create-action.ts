'use server';

import fs from 'node:fs/promises';
import path from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { resolveActualPath, resolveFactorySource } from './resolve-path';

const execAsync = promisify(exec);

const APP_NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export interface CreateResult {
  success: boolean;
  appName: string;
  appPath: string;
  error?: string;
}

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

export async function createApp(
  appName: string,
  parentDir: string,
  factorySource: string,
): Promise<CreateResult> {
  const trimmedName = appName.trim();

  if (!trimmedName) {
    return { success: false, appName: trimmedName, appPath: '', error: 'Ingresa un nombre para la app.' };
  }

  if (!APP_NAME_PATTERN.test(trimmedName)) {
    return {
      success: false,
      appName: trimmedName,
      appPath: '',
      error: 'El nombre debe ser kebab-case (ej: mi-nueva-app). Solo letras minusculas, numeros y guiones.',
    };
  }

  if (!factorySource.trim()) {
    return { success: false, appName: trimmedName, appPath: '', error: 'Configura el directorio fuente de SaaS Factory.' };
  }

  if (!parentDir.trim()) {
    return { success: false, appName: trimmedName, appPath: '', error: 'Selecciona el directorio padre donde crear la app.' };
  }

  try {
    // Resolve paths
    const resolvedParent = await resolveActualPath(parentDir);
    const resolvedSource = await resolveFactorySource(factorySource);
    const appPath = path.join(resolvedParent, trimmedName);

    // Check if directory already exists
    try {
      await fs.stat(appPath);
      return { success: false, appName: trimmedName, appPath, error: `Ya existe un directorio "${trimmedName}" en ${resolvedParent}` };
    } catch {
      // Good - doesn't exist yet
    }

    // Create directory and copy full template
    await copyDir(resolvedSource, appPath);

    // Run npm install
    await execAsync('npm install', { cwd: appPath, timeout: 120_000 });

    // Open in Antigravity IDE (non-blocking)
    exec(`open -a Antigravity "${appPath}"`);

    return { success: true, appName: trimmedName, appPath };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido al crear la app.';
    return { success: false, appName: trimmedName, appPath: '', error: message };
  }
}
