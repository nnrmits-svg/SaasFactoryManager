'use client';

import { useState, useEffect, useActionState } from 'react';
import { scanDirectory, type ScanActionResult } from '../services/scan-action';
import { syncProject } from '../services/sync-action';
import { createApp, type CreateResult } from '../services/create-action';
import { openInIDE } from '../services/open-action';
import type { ProjectStatus } from '../types';
import type { SyncResult } from '../services/sync-service';
import { DirectoryPicker } from './directory-picker';
import { getConfig } from '@/shared/lib/config';

function getStatus(version: string | null, latestVersion: string | null): ProjectStatus {
  if (!version) return 'Desconocida';
  if (!latestVersion) return 'Desconocida';
  return version === latestVersion ? 'OK' : 'Desactualizada';
}

function StatusBadge({ status }: { status: ProjectStatus }) {
  const styles: Record<ProjectStatus, string> = {
    OK: 'bg-fluya-green/10 text-fluya-green border-fluya-green/30',
    Desactualizada: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    Desconocida: 'bg-white/5 text-gray-400 border-white/10',
  };

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-lg border ${styles[status]}`}>
      {status}
    </span>
  );
}

const initialState: ScanActionResult = { projects: [], totalScanned: 0, latestVersion: null };

export function FactoryDashboard() {
  const [factorySource, setFactorySource] = useState('');
  const [rootDir, setRootDir] = useState('');
  const [syncingPath, setSyncingPath] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);

  const [newAppName, setNewAppName] = useState('');
  const [newAppParentDir, setNewAppParentDir] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createResult, setCreateResult] = useState<CreateResult | null>(null);

  useEffect(() => {
    setFactorySource(getConfig('FACTORY_SOURCE_DIR'));
    setRootDir(getConfig('PROJECTS_ROOT_DIR'));
    setNewAppParentDir(getConfig('NEW_APP_PARENT_DIR'));
  }, []);

  const [state, formAction, isPending] = useActionState(
    async (_prev: ScanActionResult, formData: FormData) => {
      setSyncResult(null);
      return scanDirectory(formData);
    },
    initialState,
  );

  async function handleSync(projectPath: string) {
    if (!factorySource.trim()) {
      setSyncResult({
        success: false,
        projectName: '',
        fromVersion: null,
        toVersion: '',
        backupPaths: [],
        error: 'Configura el directorio fuente de SaaS Factory antes de sincronizar.',
      });
      return;
    }

    setSyncingPath(projectPath);
    setSyncResult(null);

    const result = await syncProject(factorySource, projectPath);
    setSyncResult(result);
    setSyncingPath(null);
  }

  async function handleCreate() {
    if (!factorySource.trim()) {
      setCreateResult({
        success: false,
        appName: newAppName,
        appPath: '',
        error: 'Configura el directorio fuente de SaaS Factory primero.',
      });
      return;
    }

    setIsCreating(true);
    setCreateResult(null);

    const result = await createApp(newAppName, newAppParentDir, factorySource);
    setCreateResult(result);
    setIsCreating(false);

    if (result.success) {
      setNewAppName('');
    }
  }

  async function handleOpen(projectPath: string) {
    await openInIDE(projectPath);
  }

  return (
    <div className="max-w-4xl mx-auto px-6">
      <h1 className="text-2xl font-bold text-white mb-1">Factory</h1>
      <p className="text-gray-400 mb-8">
        Crea, escanea y gestiona tus proyectos SaaS Factory.
      </p>

      {/* Factory Source Config */}
      <div className="mb-6 p-5 bg-white/5 border border-white/10 rounded-2xl hover:border-fluya-purple/30 transition-all duration-300">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Directorio fuente de SaaS Factory
          {state.latestVersion && (
            <span className="ml-2 px-2 py-0.5 text-xs bg-fluya-purple/20 text-fluya-purple border border-fluya-purple/30 rounded-lg">
              {state.latestVersion} detectada
            </span>
          )}
        </label>
        <DirectoryPicker
          value={factorySource}
          onChange={setFactorySource}
          placeholder="/Users/.../saas-factory-setup/saas-factory"
        />
        <p className="mt-2 text-xs text-gray-500">
          Ruta a la carpeta que contiene el template (.claude/, CLAUDE.md). La version se detecta automaticamente.
        </p>
      </div>

      {/* Create New App */}
      <div className="mb-6 p-5 bg-fluya-green/5 border border-fluya-green/20 rounded-2xl hover:border-fluya-green/40 transition-all duration-300">
        <h2 className="text-sm font-semibold text-fluya-green mb-4">Crear Nueva App</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Nombre de la app (kebab-case)</label>
            <input
              type="text"
              value={newAppName}
              onChange={(e) => setNewAppName(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
              placeholder="mi-nueva-app"
              className="w-full px-4 py-2.5 bg-fluya-bg border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-fluya-green/50 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Directorio padre</label>
            <DirectoryPicker
              value={newAppParentDir}
              onChange={setNewAppParentDir}
              placeholder="/Users/.../AplicacionesSaas"
            />
          </div>
          <button
            type="button"
            disabled={isCreating || !newAppName.trim() || !factorySource.trim()}
            onClick={handleCreate}
            className="w-full px-4 py-2.5 bg-gradient-to-r from-fluya-purple to-fluya-blue text-white rounded-xl font-medium hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 transition-all duration-300 shadow-lg shadow-fluya-purple/20"
          >
            {isCreating ? 'Creando app + instalando dependencias...' : 'Crear App'}
          </button>
        </div>

        {createResult && (
          <div className={`mt-3 p-3 rounded-xl border text-sm ${
            createResult.success
              ? 'bg-fluya-green/10 border-fluya-green/30 text-fluya-green'
              : 'bg-red-500/10 border-red-500/20 text-red-400'
          }`}>
            {createResult.success
              ? `"${createResult.appName}" creada en ${createResult.appPath}. Antigravity abierto.`
              : createResult.error
            }
          </div>
        )}
      </div>

      {/* Scan Directory */}
      <div className="mb-6 p-5 bg-white/5 border border-white/10 rounded-2xl hover:border-fluya-purple/30 transition-all duration-300">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Directorio de proyectos a escanear
        </label>
        <DirectoryPicker
          value={rootDir}
          onChange={setRootDir}
          placeholder="/Users/.../AplicacionesSaas"
        />
      </div>

      {/* Scan Button */}
      <form action={formAction} className="mb-8">
        <input type="hidden" name="factorySource" value={factorySource} />
        <input type="hidden" name="rootDir" value={rootDir} />
        <button
          type="submit"
          disabled={isPending || !rootDir.trim()}
          className="w-full px-6 py-3 bg-fluya-purple text-white rounded-xl font-medium hover:shadow-[0_0_20px_rgba(139,92,246,0.3)] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300"
        >
          {isPending ? 'Escaneando...' : 'Escanear proyectos'}
        </button>
      </form>

      {/* Sync Result */}
      {syncResult && (
        <div className={`mb-6 p-4 rounded-xl border ${
          syncResult.success
            ? 'bg-fluya-green/10 border-fluya-green/30 text-fluya-green'
            : 'bg-red-500/10 border-red-500/20 text-red-400'
        }`}>
          {syncResult.success
            ? `"${syncResult.projectName}" sincronizado a ${syncResult.toVersion}. Re-escanea para verificar.`
            : syncResult.error
          }
        </div>
      )}

      {/* Scan Error */}
      {state.error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
          {state.error}
        </div>
      )}

      {/* Results */}
      {state.projects.length > 0 && (
        <>
          <p className="text-sm text-gray-500 mb-3">
            {state.projects.length} proyecto(s) encontrado(s) de {state.totalScanned} directorios escaneados
            {state.latestVersion && ` — version fuente: ${state.latestVersion}`}
          </p>

          <div className="overflow-hidden rounded-2xl border border-white/10">
            <table className="w-full text-left">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase">Nombre</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase">Version</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase">Estado</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {state.projects.map((project) => {
                  const status = getStatus(project.version, state.latestVersion);
                  const isSyncing = syncingPath === project.path;
                  return (
                    <tr key={project.path} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3">
                        <div className="text-white font-medium">{project.name}</div>
                        <div className="text-xs text-gray-500 truncate max-w-xs">{project.path}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-300 font-mono text-sm">
                        {project.version ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={status} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpen(project.path)}
                            className="px-3 py-1.5 text-sm bg-fluya-purple/20 text-fluya-purple border border-fluya-purple/30 rounded-lg hover:bg-fluya-purple/30 transition-all duration-300"
                          >
                            Abrir
                          </button>
                          <button
                            type="button"
                            disabled={status === 'OK' || isSyncing}
                            onClick={() => handleSync(project.path)}
                            className="px-3 py-1.5 text-sm bg-white/5 text-gray-300 border border-white/10 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300"
                          >
                            {isSyncing ? 'Sync...' : 'Sync'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Empty state */}
      {!state.error && state.totalScanned > 0 && state.projects.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No se encontraron proyectos con <code className="text-fluya-purple/60">.claude/</code> en ese directorio.
        </div>
      )}
    </div>
  );
}
