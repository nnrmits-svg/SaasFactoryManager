'use client';

import { stageLabel, type ProjectCreationState } from '../hooks/use-project-creation';

interface Props {
  state: ProjectCreationState;
  projectName: string;
  onRetry: () => void;
  onClose: () => void;
  onGoToProject: () => void;
}

export function ProjectCreatingModal({
  state,
  projectName,
  onRetry,
  onClose,
  onGoToProject,
}: Props) {
  if (state.status === 'idle') return null;

  const isFailed = state.status === 'failed';
  const isCreated = state.status === 'created';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 p-6 bg-gray-900 border border-white/10 rounded-2xl shadow-2xl">
        <h2 className="text-lg font-semibold text-white mb-1">
          {isCreated ? 'Proyecto creado' : isFailed ? 'No se pudo crear' : 'Creando proyecto...'}
        </h2>
        <p className="text-sm text-gray-400 mb-5 truncate">{projectName}</p>

        {!isFailed && !isCreated && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-full bg-purple-500 animate-pulse" />
              <span className="text-sm text-purple-200">{stageLabel(state.stage)}</span>
            </div>
            <p className="text-xs text-gray-500">
              El agente local esta trabajando: creando carpeta, repo en GitHub e inyectando skills.
              Si tu Mac esta dormida o no hay agente online, puede tardar.
            </p>
          </div>
        )}

        {isCreated && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-full bg-green-500" />
              <span className="text-sm text-green-300">Listo</span>
            </div>
            {state.result?.local_path && (
              <p className="text-xs text-gray-400">
                Carpeta:{' '}
                <code className="text-gray-300">{state.result.local_path}</code>
              </p>
            )}
            {state.result?.github_url && (
              <p className="text-xs text-gray-400">
                Repo:{' '}
                <a
                  href={state.result.github_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-purple-300 hover:text-purple-200 underline"
                >
                  {state.result.github_url}
                </a>
              </p>
            )}
            {state.result?.applied_skills && state.result.applied_skills.length > 0 && (
              <p className="text-xs text-gray-400">
                Skills aplicados: {state.result.applied_skills.join(', ')}
              </p>
            )}
          </div>
        )}

        {isFailed && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-full bg-red-500" />
              <span className="text-sm text-red-300">Error</span>
            </div>
            <p className="text-xs text-red-200 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              {state.error ?? 'El agente reporto un error'}
            </p>
            {state.stage && (
              <p className="text-xs text-gray-500">
                Ultima etapa: {stageLabel(state.stage)}
              </p>
            )}
          </div>
        )}

        <div className="flex gap-2 mt-6 justify-end">
          {isFailed && (
            <button
              type="button"
              onClick={onRetry}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-medium"
            >
              Reintentar
            </button>
          )}
          {isCreated && (
            <button
              type="button"
              onClick={onGoToProject}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-medium"
            >
              Ver proyecto
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-sm"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
