'use client';

import { useState, useEffect } from 'react';
import { syncAllProjects } from '@/features/factory-manager/services/git-sync-action';
import { getConfig } from '@/shared/lib/config';

interface Props {
  onSyncComplete: () => void;
}

export function SyncButton({ onSyncComplete }: Props) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [rootDir, setRootDir] = useState('');
  const [result, setResult] = useState<{ synced: number; archived: number; errors: string[] } | null>(null);

  useEffect(() => {
    setRootDir(getConfig('PROJECTS_ROOT_DIR'));
  }, []);

  async function handleSync() {
    setIsSyncing(true);
    setResult(null);

    const syncResult = await syncAllProjects(rootDir);
    setResult(syncResult);
    setIsSyncing(false);
    onSyncComplete();
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={handleSync}
        disabled={isSyncing || !rootDir}
        className="px-5 py-2.5 bg-gradient-to-r from-fluya-purple to-fluya-blue text-white rounded-xl font-medium hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 transition-all duration-300 shadow-lg shadow-fluya-purple/20"
      >
        {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
      </button>

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
