'use client';

import { useState, useEffect } from 'react';
import { syncAllProjects, registerProject } from '@/features/factory-manager/services/git-sync-action';
import { getConfig } from '@/shared/lib/config';

interface Props {
  onSyncComplete: () => void;
}

export function SyncButton({ onSyncComplete }: Props) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [rootDir, setRootDir] = useState('');
  const [result, setResult] = useState<{ synced: number; archived: number; errors: string[] } | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPath, setNewPath] = useState('');
  const [addError, setAddError] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    setRootDir(getConfig('PROJECTS_ROOT_DIR'));
  }, []);

  async function handleSync() {
    setIsSyncing(true);
    setResult(null);

    try {
      const syncResult = await syncAllProjects(rootDir);
      setResult(syncResult);
      onSyncComplete();
    } finally {
      setIsSyncing(false);
    }
  }

  async function handleAddProject() {
    if (!newPath.trim()) return;
    setIsAdding(true);
    setAddError('');

    try {
      const res = await registerProject(newPath.trim());
      if (res.success) {
        setNewPath('');
        setShowAddForm(false);
        onSyncComplete();
      } else {
        setAddError(res.error ?? 'Error desconocido');
      }
    } finally {
      setIsAdding(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2.5 bg-white/5 text-gray-300 border border-white/10 rounded-xl hover:bg-white/10 transition-all duration-300"
        >
          + Agregar
        </button>
        <button
          type="button"
          onClick={handleSync}
          disabled={isSyncing || !rootDir}
          className="px-5 py-2.5 bg-gradient-to-r from-fluya-purple to-fluya-blue text-white rounded-xl font-medium hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 transition-all duration-300 shadow-lg shadow-fluya-purple/20"
        >
          {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
        </button>
      </div>

      {showAddForm && (
        <div className="flex items-center gap-2 mt-1">
          <input
            type="text"
            value={newPath}
            onChange={(e) => setNewPath(e.target.value)}
            placeholder="/ruta/al/proyecto"
            className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-fluya-purple/50 w-72"
            onKeyDown={(e) => e.key === 'Enter' && handleAddProject()}
          />
          <button
            type="button"
            onClick={handleAddProject}
            disabled={isAdding || !newPath.trim()}
            className="px-3 py-2 bg-fluya-green/10 text-fluya-green border border-fluya-green/30 rounded-xl text-sm hover:bg-fluya-green/20 disabled:opacity-40 transition-all duration-300"
          >
            {isAdding ? '...' : 'Registrar'}
          </button>
          {addError && <p className="text-xs text-red-400">{addError}</p>}
        </div>
      )}

      {result && (
        <p className="text-sm text-gray-400">
          {result.synced} sincronizado(s)
          {result.archived > 0 && ` | ${result.archived} archivado(s)`}
          {result.errors.length > 0 && ` | ${result.errors.length} error(es)`}
        </p>
      )}
    </div>
  );
}
