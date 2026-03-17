'use client';

import { useState, useActionState } from 'react';
import { scanDirectory, type ScanActionResult } from '../services/scan-action';
import { syncProject } from '../services/sync-action';
import { createApp, type CreateResult } from '../services/create-action';
import { openInIDE } from '../services/open-action';
import type { ProjectStatus } from '../types';
import type { SyncResult } from '../services/sync-service';
import { DirectoryPicker } from './directory-picker';

const DEFAULT_PARENT_DIR = '/Users/ricardomarchetti/ProyectosIA/AplicacionesSaas';

function getStatus(version: string | null, latestVersion: string | null): ProjectStatus {
  if (!version) return 'Desconocida';
  if (!latestVersion) return 'Desconocida';
  return version === latestVersion ? 'OK' : 'Desactualizada';
}

function StatusBadge({ status }: { status: ProjectStatus }) {
  const styles: Record<ProjectStatus, string> = {
    OK: 'bg-green-900/50 text-green-400 border-green-700',
    Desactualizada: 'bg-yellow-900/50 text-yellow-400 border-yellow-700',
    Desconocida: 'bg-gray-900/50 text-gray-400 border-gray-700',
  };

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded border ${styles[status]}`}>
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

  // Create app state
  const [newAppName, setNewAppName] = useState('');
  const [newAppParentDir, setNewAppParentDir] = useState(DEFAULT_PARENT_DIR);
  const [isCreating, setIsCreating] = useState(false);
  const [createResult, setCreateResult] = useState<CreateResult | null>(null);

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
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-white mb-2">Factory Manager</h1>
      <p className="text-gray-400 mb-6">
        Crea, escanea y gestiona tus proyectos SaaS Factory.
      </p>

      {/* Factory Source Config */}
      <div className="mb-6 p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
        <label className="block text-sm font-medium text-gray-400 mb-2">
          Directorio fuente de SaaS Factory
          {state.latestVersion && (
            <span className="ml-2 px-2 py-0.5 text-xs bg-purple-900/50 text-purple-400 border border-purple-700 rounded">
              {state.latestVersion} detectada
            </span>
          )}
        </label>
        <DirectoryPicker
          value={factorySource}
          onChange={setFactorySource}
          placeholder="/Users/.../saas-factory-setup/saas-factory"
        />
        <p className="mt-1 text-xs text-gray-500">
          Ruta a la carpeta que contiene el template (.claude/, CLAUDE.md). La version se detecta automaticamente.
        </p>
      </div>

      {/* Create New App */}
      <div className="mb-6 p-4 bg-emerald-950/30 border border-emerald-800 rounded-lg">
        <h2 className="text-sm font-medium text-emerald-400 mb-3">Crear Nueva App</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Nombre de la app (kebab-case)</label>
            <input
              type="text"
              value={newAppName}
              onChange={(e) => setNewAppName(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
              placeholder="mi-nueva-app"
              className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Directorio padre</label>
            <DirectoryPicker
              value={newAppParentDir}
              onChange={setNewAppParentDir}
              placeholder={DEFAULT_PARENT_DIR}
            />
          </div>
          <button
            type="button"
            disabled={isCreating || !newAppName.trim() || !factorySource.trim()}
            onClick={handleCreate}
            className="w-full px-4 py-2.5 bg-emerald-700 text-white rounded-lg font-medium hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isCreating ? 'Creando app + instalando dependencias...' : 'Crear App'}
          </button>
        </div>

        {createResult && (
          <div className={`mt-3 p-3 rounded-lg border text-sm ${
            createResult.success
              ? 'bg-green-900/30 border-green-700 text-green-400'
              : 'bg-red-900/30 border-red-700 text-red-400'
          }`}>
            {createResult.success
              ? `"${createResult.appName}" creada en ${createResult.appPath}. Antigravity abierto.`
              : createResult.error
            }
          </div>
        )}
      </div>

      {/* Scan Directory */}
      <div className="mb-6 p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
        <label className="block text-sm font-medium text-gray-400 mb-2">
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
          className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? 'Escaneando...' : 'Escanear proyectos'}
        </button>
      </form>

      {/* Sync Result */}
      {syncResult && (
        <div className={`mb-6 p-4 rounded-lg border ${
          syncResult.success
            ? 'bg-green-900/30 border-green-700 text-green-400'
            : 'bg-red-900/30 border-red-700 text-red-400'
        }`}>
          {syncResult.success
            ? `"${syncResult.projectName}" sincronizado a ${syncResult.toVersion}. Re-escanea para verificar.`
            : syncResult.error
          }
        </div>
      )}

      {/* Scan Error */}
      {state.error && (
        <div className="mb-6 p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-400">
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

          <div className="overflow-hidden rounded-lg border border-gray-700">
            <table className="w-full text-left">
              <thead className="bg-gray-800/80">
                <tr>
                  <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase">Nombre</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase">Version</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase">Estado</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {state.projects.map((project) => {
                  const status = getStatus(project.version, state.latestVersion);
                  const isSyncing = syncingPath === project.path;
                  return (
                    <tr key={project.path} className="bg-gray-900/50 hover:bg-gray-800/50 transition-colors">
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
                            className="px-3 py-1 text-sm bg-indigo-700 text-white rounded hover:bg-indigo-600 transition-colors"
                          >
                            Abrir
                          </button>
                          <button
                            type="button"
                            disabled={status === 'OK' || isSyncing}
                            onClick={() => handleSync(project.path)}
                            className="px-3 py-1 text-sm bg-gray-700 text-gray-300 rounded hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
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
          No se encontraron proyectos con <code className="text-gray-400">.claude/</code> en ese directorio.
        </div>
      )}
    </div>
  );
}
