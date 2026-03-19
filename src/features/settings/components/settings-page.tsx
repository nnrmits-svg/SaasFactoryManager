'use client';

import { useState, useEffect } from 'react';
import { getConfig, setConfig } from '@/shared/lib/config';
import { deleteArchivedProjects, getPortfolioProjects } from '@/features/factory-manager/services/git-sync-action';

export function SettingsPage() {
  const [projectsRootDir, setProjectsRootDir] = useState('');
  const [factorySourceDir, setFactorySourceDir] = useState('');
  const [newAppParentDir, setNewAppParentDir] = useState('');
  const [saved, setSaved] = useState(false);

  const [archivedCount, setArchivedCount] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteResult, setDeleteResult] = useState<string | null>(null);

  useEffect(() => {
    setProjectsRootDir(getConfig('PROJECTS_ROOT_DIR'));
    setFactorySourceDir(getConfig('FACTORY_SOURCE_DIR'));
    setNewAppParentDir(getConfig('NEW_APP_PARENT_DIR'));
    loadArchivedCount();
  }, []);

  async function loadArchivedCount() {
    const projects = await getPortfolioProjects();
    setArchivedCount(projects.filter((p) => p.status === 'archived').length);
  }

  function handleSave() {
    setConfig('PROJECTS_ROOT_DIR', projectsRootDir);
    setConfig('FACTORY_SOURCE_DIR', factorySourceDir);
    setConfig('NEW_APP_PARENT_DIR', newAppParentDir);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleDeleteArchived() {
    setIsDeleting(true);
    setDeleteResult(null);
    const result = await deleteArchivedProjects();
    setDeleteResult(`${result.deleted} proyecto(s) eliminado(s)`);
    setIsDeleting(false);
    setArchivedCount(0);
  }

  return (
    <div className="max-w-2xl mx-auto px-6">
      <h1 className="text-2xl font-bold text-white mb-1">Settings</h1>
      <p className="text-gray-400 mb-8">Configuracion global del Factory Manager.</p>

      {/* Directorios */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-4">Directorios por Defecto</h2>
        <div className="space-y-4">
          <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Directorio de proyectos (scan/sync)
            </label>
            <input
              type="text"
              value={projectsRootDir}
              onChange={(e) => setProjectsRootDir(e.target.value)}
              className="w-full px-3 py-2 bg-fluya-bg border border-white/10 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-fluya-purple/50 transition-colors"
            />
            <p className="mt-1 text-xs text-gray-600">Usado en Dashboard (sync) y Factory (scan).</p>
          </div>

          <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Directorio fuente SaaS Factory
            </label>
            <input
              type="text"
              value={factorySourceDir}
              onChange={(e) => setFactorySourceDir(e.target.value)}
              className="w-full px-3 py-2 bg-fluya-bg border border-white/10 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-fluya-purple/50 transition-colors"
              placeholder="/Users/.../saas-factory-setup/saas-factory"
            />
            <p className="mt-1 text-xs text-gray-600">Ruta al template de SaaS Factory (contiene .claude/ y CLAUDE.md).</p>
          </div>

          <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Directorio padre para nuevas apps
            </label>
            <input
              type="text"
              value={newAppParentDir}
              onChange={(e) => setNewAppParentDir(e.target.value)}
              className="w-full px-3 py-2 bg-fluya-bg border border-white/10 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-fluya-purple/50 transition-colors"
            />
            <p className="mt-1 text-xs text-gray-600">Donde se crean las nuevas apps por defecto.</p>
          </div>

          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2.5 bg-gradient-to-r from-fluya-purple to-fluya-blue text-white rounded-xl font-medium hover:-translate-y-0.5 transition-all duration-300 shadow-lg shadow-fluya-purple/20"
          >
            {saved ? 'Guardado' : 'Guardar Directorios'}
          </button>
        </div>
      </section>

      {/* Limpiar archivados */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-4">Limpieza de Datos</h2>
        <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-300">Proyectos archivados</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {archivedCount > 0
                  ? `${archivedCount} proyecto(s) marcados como archivados. Borrarlos limpia commits y sesiones asociadas.`
                  : 'No hay proyectos archivados.'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleDeleteArchived}
              disabled={isDeleting || archivedCount === 0}
              className="px-4 py-2 text-sm bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl hover:bg-red-500/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300"
            >
              {isDeleting ? 'Borrando...' : 'Borrar Archivados'}
            </button>
          </div>
          {deleteResult && (
            <p className="mt-2 text-sm text-fluya-green">{deleteResult}</p>
          )}
        </div>
      </section>
    </div>
  );
}
