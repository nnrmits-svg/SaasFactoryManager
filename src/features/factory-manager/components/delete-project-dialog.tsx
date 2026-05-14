'use client';

// Modal de borrado coordinado de un proyecto. Estilo GitHub: el founder debe
// tipear el nombre del proyecto para confirmar. 3 checkboxes (folder, repo, PDFs).
// Después del submit, polling del agent_command si aplica.

import { useState, useEffect } from 'react';
import {
  deleteProjectFullyAction,
  finalizeDeleteProjectAction,
} from '../services/delete-project-full-action';
import { createClient } from '@/lib/supabase/client';

interface DeleteProjectDialogProps {
  open: boolean;
  project: {
    id: string;
    name: string;
    localPath: string | null;
    repoUrl: string | null;
    commitCount?: number;
  } | null;
  onClose: () => void;
  onDeleted: () => void;
}

type Phase = 'idle' | 'submitting' | 'waiting-agent' | 'finalizing' | 'done' | 'error';

export function DeleteProjectDialog({
  open,
  project,
  onClose,
  onDeleted,
}: DeleteProjectDialogProps) {
  const [typedName, setTypedName] = useState('');
  const [deleteLocal, setDeleteLocal] = useState(true);
  const [deleteRepo, setDeleteRepo] = useState(true);
  const [deleteStorage, setDeleteStorage] = useState(true);
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [commandId, setCommandId] = useState<string | null>(null);
  const [agentResult, setAgentResult] = useState<Record<string, unknown> | null>(null);

  // Reset al abrir/cerrar
  useEffect(() => {
    if (!open) {
      setTypedName('');
      setPhase('idle');
      setError(null);
      setCommandId(null);
      setAgentResult(null);
    }
  }, [open]);

  // Defaults inteligentes según lo que el proyecto tiene
  useEffect(() => {
    if (!project) return;
    setDeleteLocal(!!project.localPath);
    setDeleteRepo(!!project.repoUrl);
    setDeleteStorage(true);
  }, [project]);

  // Polling del agent_command si está en waiting-agent
  useEffect(() => {
    if (phase !== 'waiting-agent' || !commandId || !project) return;
    const supabase = createClient();

    let stopped = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    async function check() {
      if (stopped) return;
      const { data } = await supabase
        .from('agent_commands')
        .select('status, result')
        .eq('id', commandId!)
        .maybeSingle();
      if (!data) {
        timeoutId = setTimeout(check, 2000);
        return;
      }
      if (data.status === 'done' || data.status === 'error') {
        setAgentResult(data.result as Record<string, unknown> | null);
        const result = data.result as { success?: boolean; error?: string } | null;
        if (data.status === 'error' || result?.success === false) {
          setError(result?.error ?? 'El Agent reportó un error');
          setPhase('error');
          return;
        }
        // Agent OK → finalizar DB delete
        setPhase('finalizing');
        const fin = await finalizeDeleteProjectAction(project!.id);
        if (!fin.ok) {
          setError(fin.error ?? 'Falló el delete final en BD');
          setPhase('error');
          return;
        }
        setPhase('done');
        onDeleted();
      } else {
        timeoutId = setTimeout(check, 2000);
      }
    }

    void check();
    return () => {
      stopped = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [phase, commandId, project, onDeleted]);

  if (!open || !project) return null;

  const nameMatches = typedName.trim() === project.name;
  const canSubmit = nameMatches && phase === 'idle';
  const needsAgent = deleteLocal || deleteRepo;

  async function handleSubmit() {
    if (!project || !nameMatches) return;
    setError(null);
    setPhase('submitting');
    const res = await deleteProjectFullyAction({
      project_id: project.id,
      delete_local_folder: deleteLocal,
      delete_github_repo: deleteRepo,
      delete_storage_files: deleteStorage,
    });
    if (!res.ok) {
      setError(res.error ?? 'Error desconocido');
      setPhase('error');
      return;
    }
    if (res.skipped_agent) {
      setPhase('done');
      onDeleted();
      return;
    }
    setCommandId(res.command_id ?? null);
    setPhase('waiting-agent');
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-fluya-bg border border-red-500/30 rounded-2xl p-6 max-w-md w-full">
        <header className="mb-4">
          <h2 className="text-lg font-semibold text-white">Eliminar proyecto</h2>
          <p className="text-xs text-red-400 mt-1">Esta acción no se puede deshacer.</p>
        </header>

        <div className="space-y-3 mb-4">
          <p className="text-sm text-gray-300">
            Vas a eliminar <span className="font-mono text-white">{project.name}</span>.
          </p>
          {project.commitCount != null && project.commitCount > 0 && (
            <p className="text-xs text-yellow-300 bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-2">
              ⚠ Este proyecto tiene {project.commitCount} commits registrados que se
              borrarán de la BD (junto con sesiones, skills, contratos y firmas).
            </p>
          )}

          <div className="space-y-2 bg-white/5 border border-white/10 rounded-xl p-3">
            <Checkbox
              checked={deleteLocal}
              disabled={!project.localPath}
              onChange={setDeleteLocal}
              label="Borrar folder local"
              detail={
                project.localPath ?? 'Sin local_path (proyecto sin crear por wizard)'
              }
            />
            <Checkbox
              checked={deleteRepo}
              disabled={!project.repoUrl}
              onChange={setDeleteRepo}
              label="Borrar repo en GitHub"
              detail={project.repoUrl ?? 'Sin repo asociado'}
            />
            <Checkbox
              checked={deleteStorage}
              onChange={setDeleteStorage}
              label="Borrar PDFs del bucket contracts/"
              detail={`contracts/${project.id}/`}
            />
          </div>

          <div>
            <label className="text-xs text-gray-400">
              Para confirmar, tipeá{' '}
              <span className="font-mono text-white">{project.name}</span>:
            </label>
            <input
              type="text"
              value={typedName}
              onChange={(e) => setTypedName(e.target.value)}
              placeholder={project.name}
              disabled={phase !== 'idle'}
              autoFocus
              className="mt-1 w-full px-3 py-2 bg-black/30 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-red-500/50 disabled:opacity-50"
            />
          </div>
        </div>

        {/* Phase status */}
        {phase === 'submitting' && (
          <p className="text-xs text-purple-300 bg-purple-500/5 border border-purple-500/20 rounded-lg p-2 mb-3">
            Disparando comando al SF Agent...
          </p>
        )}
        {phase === 'waiting-agent' && (
          <p className="text-xs text-purple-300 bg-purple-500/5 border border-purple-500/20 rounded-lg p-2 mb-3">
            ⏳ Esperando al Agent (borrando {deleteLocal ? 'folder' : ''}
            {deleteLocal && deleteRepo ? ' + ' : ''}
            {deleteRepo ? 'repo GitHub' : ''})...
          </p>
        )}
        {phase === 'finalizing' && (
          <p className="text-xs text-purple-300 bg-purple-500/5 border border-purple-500/20 rounded-lg p-2 mb-3">
            Finalizando: borrando rows en BD...
          </p>
        )}
        {phase === 'done' && (
          <p className="text-xs text-fluya-green bg-fluya-green/5 border border-fluya-green/20 rounded-lg p-2 mb-3">
            ✅ Proyecto eliminado correctamente.
          </p>
        )}
        {error && (
          <div className="text-xs text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg p-2 mb-3 space-y-1">
            <p>❌ {error}</p>
            {agentResult ? (
              <p className="text-red-400 font-mono text-[10px]">
                stage: {String((agentResult as { stage?: string }).stage ?? '—')}
              </p>
            ) : null}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={phase === 'submitting' || phase === 'waiting-agent' || phase === 'finalizing'}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          >
            {phase === 'done' ? 'Cerrar' : 'Cancelar'}
          </button>
          {phase !== 'done' && (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="px-4 py-2 bg-red-500 hover:bg-red-400 text-white rounded-xl text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {needsAgent ? 'Eliminar (con Agent)' : 'Eliminar (solo BD)'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Checkbox({
  checked,
  disabled,
  onChange,
  label,
  detail,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
  label: string;
  detail: string;
}) {
  return (
    <label
      className={`flex items-start gap-2 ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      }`}
    >
      <input
        type="checkbox"
        checked={checked && !disabled}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white">{label}</p>
        <p className="text-[11px] text-gray-500 truncate font-mono">{detail}</p>
      </div>
    </label>
  );
}
