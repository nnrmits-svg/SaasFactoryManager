'use client';

import { useEffect, useMemo, useState } from 'react';
import { getVersionsDashboardData } from '@/features/factory-manager/services/versions-dashboard-action';
import {
  DRIFT_LABELS,
  DRIFT_COLORS,
  type VersionsDashboardData,
} from '@/features/factory-manager/services/versions-dashboard-types';

type VersionsDataWithError = VersionsDashboardData & { error: string | null };

export function VersionsDashboard() {
  const [data, setData] = useState<VersionsDataWithError | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [ownerFilter, setOwnerFilter] = useState<string>('all');

  useEffect(() => {
    let cancelled = false;
    getVersionsDashboardData()
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setIsLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setRenderError(String(err?.message ?? 'Error inesperado al cargar versiones'));
        setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-6">
        <p className="text-gray-500">Cargando versiones...</p>
      </div>
    );
  }

  if (renderError || !data) {
    return (
      <div className="max-w-6xl mx-auto px-6">
        <div className="p-4 rounded-xl border border-yellow-500/30 bg-yellow-500/5 text-sm text-yellow-300">
          <p className="font-semibold">No se pudieron cargar los datos</p>
          <p className="mt-1 opacity-80">{renderError ?? 'Error desconocido'}</p>
          <details className="mt-3 text-xs opacity-70">
            <summary className="cursor-pointer">Cómo arreglarlo</summary>
            <p className="mt-2 leading-relaxed">
              Probable rate limit de GitHub. Configurar{' '}
              <code className="px-1 py-0.5 rounded bg-black/30 font-mono">GITHUB_TOKEN</code> en
              variables de entorno de Vercel.
            </p>
          </details>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6">
      {/* Warning si hay error parcial */}
      {data.error && (
        <div className="mb-4 p-3 rounded-xl border border-yellow-500/30 bg-yellow-500/5 text-xs text-yellow-300">
          ⚠ {data.error}
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Versiones de SaaS Factory</h1>
        <p className="text-gray-400 mt-1 text-sm">
          Comparación de versiones del kit-comercial instaladas vs upstream del repo.
        </p>
      </div>

      {/* Upstream banner */}
      <div className="mb-6 p-4 rounded-xl border border-fluya-purple/30 bg-fluya-purple/5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider">Upstream actual</p>
            <p className="text-2xl font-mono text-white mt-1">{data.upstreamVersion}</p>
            {data.upstreamPublishedAt && (
              <p className="text-xs text-gray-500 mt-1">
                Publicado:{' '}
                {new Date(data.upstreamPublishedAt).toLocaleDateString('es-AR', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            )}
          </div>
          <a
            href={`https://github.com/nnrmits-svg/kit-comercial/releases/tag/${data.upstreamVersion}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-lg bg-fluya-purple/20 hover:bg-fluya-purple/30 text-fluya-purple text-xs"
          >
            Ver Release en GitHub →
          </a>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="p-3 rounded-xl border border-white/10 bg-white/5">
          <p className="text-xs text-gray-400">Total proyectos</p>
          <p className="text-2xl font-bold text-white mt-1">{data.stats.total}</p>
        </div>
        <div className="p-3 rounded-xl border border-green-500/20 bg-green-500/5">
          <p className="text-xs text-green-300">Al día</p>
          <p className="text-2xl font-bold text-green-400 mt-1">{data.stats.upToDate}</p>
        </div>
        <div className="p-3 rounded-xl border border-yellow-500/20 bg-yellow-500/5">
          <p className="text-xs text-yellow-300">Atrasados</p>
          <p className="text-2xl font-bold text-yellow-400 mt-1">{data.stats.behind}</p>
        </div>
        <div className="p-3 rounded-xl border border-white/10 bg-white/5">
          <p className="text-xs text-gray-400">Sin reportar</p>
          <p className="text-2xl font-bold text-gray-300 mt-1">{data.stats.unknown}</p>
        </div>
      </div>

      {/* Filtro por owner */}
      {(() => {
        const owners = Array.from(
          new Set(
            data.projects
              .map((p) => p.ownerHint)
              .filter((o): o is string => Boolean(o)),
          ),
        ).sort();

        if (owners.length <= 1) return null;

        return (
          <div className="mb-4 flex items-center gap-2">
            <span className="text-xs text-gray-400">Filtrar por usuario/máquina:</span>
            <div className="flex gap-1 p-1 rounded-xl bg-white/5 border border-white/10">
              <button
                onClick={() => setOwnerFilter('all')}
                className={`px-3 py-1 rounded-lg text-xs transition-colors ${
                  ownerFilter === 'all'
                    ? 'bg-fluya-purple text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Todos ({data.projects.length})
              </button>
              {owners.map((owner) => {
                const count = data.projects.filter((p) => p.ownerHint === owner).length;
                return (
                  <button
                    key={owner}
                    onClick={() => setOwnerFilter(owner)}
                    className={`px-3 py-1 rounded-lg text-xs transition-colors ${
                      ownerFilter === owner
                        ? 'bg-fluya-purple text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {owner} ({count})
                  </button>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Tabla */}
      {data.projects.length === 0 ? (
        <div className="p-6 rounded-xl border border-white/10 bg-white/5 text-center">
          <p className="text-sm text-gray-400">
            Aún no hay proyectos detectados. El SF Agent debería escanear tu workspace y reportarlos.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-xs text-gray-400 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">Proyecto</th>
                <th className="px-4 py-3 text-left">Usuario</th>
                <th className="px-4 py-3 text-left">Instalado</th>
                <th className="px-4 py-3 text-left">Estado</th>
                <th className="px-4 py-3 text-left">Actualizado</th>
                <th className="px-4 py-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {data.projects
                .filter((row) => ownerFilter === 'all' || row.ownerHint === ownerFilter)
                .map((row) => (
                <tr key={row.projectId} className="hover:bg-white/5">
                  <td className="px-4 py-3">
                    <div className="text-white font-medium">{row.projectName}</div>
                    {row.localPath && (
                      <code className="text-[10px] text-gray-500 font-mono break-all">
                        {row.localPath}
                      </code>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {row.ownerHint ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 font-mono">
                        {row.ownerHint}
                      </span>
                    ) : (
                      <span className="text-gray-500 italic text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {row.installedVersion ? (
                      <code className="font-mono text-white">{row.installedVersion}</code>
                    ) : (
                      <span className="text-gray-500 italic">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs border ${
                        DRIFT_COLORS[row.drift]
                      }`}
                    >
                      {DRIFT_LABELS[row.drift]}
                      {!isNaN(row.releasesBehind) && row.releasesBehind > 0 && (
                        <span className="ml-1 opacity-70">(-{row.releasesBehind})</span>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {row.updatedAt
                      ? new Date(row.updatedAt).toLocaleDateString('es-AR', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {row.drift === 'unknown' ? (
                      <span className="text-xs text-gray-500" title="El SF Agent aún no reportó">
                        Esperando SF Agent
                      </span>
                    ) : row.drift === 'up-to-date' ? (
                      <span className="text-xs text-gray-500">—</span>
                    ) : (
                      <button
                        className="px-3 py-1 rounded-lg bg-fluya-purple/20 hover:bg-fluya-purple/30 text-fluya-purple text-xs"
                        title="Próximamente: enviar comando al SF Agent local"
                      >
                        Actualizar (próx.)
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Nota explicativa */}
      <div className="mt-6 p-4 rounded-xl border border-blue-500/20 bg-blue-500/5">
        <p className="text-xs text-blue-300 leading-relaxed">
          <strong>¿Por qué algunos proyectos están "Sin reportar"?</strong>
          <br />
          La versión se detecta a partir de un archivo <code className="font-mono">.claude/.sf-version.json</code>{' '}
          que <code className="font-mono">init.sh</code> escribe desde v1.8.0 del kit-comercial. El SF Agent debe leer ese
          archivo y reportarlo a Supabase en su próximo scan. Si un proyecto fue instalado antes de v1.8.0, no tiene el
          archivo aún; correr <code className="font-mono">init.sh opción 0</code> con merge regenera el manifiesto.
        </p>
      </div>
    </div>
  );
}
