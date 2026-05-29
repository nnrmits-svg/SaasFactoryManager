'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  getCheatSheetCatalog,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  type CheatSheetItem,
  type CheatSheetCategory,
  type CheatSheetItemType,
} from '@/features/factory-manager/services/cheat-sheet-action';

type TypeFilter = 'all' | CheatSheetItemType;

export function CheatSheetDashboard() {
  const [items, setItems] = useState<CheatSheetItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<CheatSheetCategory | 'all'>('all');
  const [selectedItem, setSelectedItem] = useState<CheatSheetItem | null>(null);

  useEffect(() => {
    let cancelled = false;
    getCheatSheetCatalog()
      .then((data) => {
        if (cancelled) return;
        setItems(data);
        setIsLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(String(err?.message ?? 'Error al cargar el cheat sheet'));
        setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (typeFilter !== 'all' && item.type !== typeFilter) return false;
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
      );
    });
  }, [items, query, typeFilter, categoryFilter]);

  const groupedByCategory = useMemo(() => {
    const map = new Map<CheatSheetCategory, CheatSheetItem[]>();
    for (const item of filtered) {
      const arr = map.get(item.category) ?? [];
      arr.push(item);
      map.set(item.category, arr);
    }
    return map;
  }, [filtered]);

  const stats = useMemo(() => {
    return {
      total: items.length,
      skills: items.filter((i) => i.type === 'skill').length,
      agents: items.filter((i) => i.type === 'agent').length,
      shown: filtered.length,
    };
  }, [items, filtered]);

  function copyToClipboard(text: string) {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-6">
        <p className="text-gray-500">Cargando cheat sheet desde GitHub...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-6">
        <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/5 text-sm text-red-300">
          <p className="font-semibold">Error al cargar el cheat sheet</p>
          <p className="mt-1 opacity-80">{error}</p>
          <p className="mt-2 text-xs opacity-60">
            Verificá conectividad a GitHub. Si el rate limit está alcanzado, configurar
            <code className="ml-1 px-1 py-0.5 rounded bg-black/30 font-mono">GITHUB_TOKEN</code>{' '}
            en variables de entorno.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Cheat Sheet — Skills + Agents</h1>
        <p className="text-gray-400 mt-1 text-sm">
          {stats.total} items en catálogo &bull; {stats.skills} skills &bull; {stats.agents} agents
          {stats.shown !== stats.total && (
            <span className="ml-2 text-fluya-purple">({stats.shown} mostrados)</span>
          )}
        </p>
        <p className="text-gray-500 mt-1 text-xs">
          Fuente:{' '}
          <a
            href="https://github.com/nnrmits-svg/kit-comercial"
            target="_blank"
            rel="noopener noreferrer"
            className="text-fluya-purple hover:underline"
          >
            github.com/nnrmits-svg/kit-comercial
          </a>{' '}
          · Cache 1 hora
        </p>
      </div>

      {/* Filtros */}
      <div className="mb-6 space-y-3">
        <input
          type="text"
          placeholder="Buscar por nombre, descripción o categoría..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-fluya-purple/50 text-sm"
        />

        <div className="flex flex-wrap gap-2">
          {/* Tipo */}
          <div className="flex gap-1 p-1 rounded-xl bg-white/5 border border-white/10">
            {(['all', 'skill', 'agent'] as TypeFilter[]).map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-1 rounded-lg text-xs transition-colors ${
                  typeFilter === t
                    ? 'bg-fluya-purple text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {t === 'all' ? 'Todos' : t === 'skill' ? 'Skills' : 'Agents'}
              </button>
            ))}
          </div>

          {/* Categoría */}
          <select
            value={categoryFilter}
            onChange={(e) =>
              setCategoryFilter(e.target.value as CheatSheetCategory | 'all')
            }
            className="px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-fluya-purple/50"
          >
            <option value="all">Todas las categorías</option>
            {CATEGORY_ORDER.map((cat) => (
              <option key={cat} value={cat}>
                {CATEGORY_LABELS[cat]}
              </option>
            ))}
          </select>

          {/* Reset */}
          {(query || typeFilter !== 'all' || categoryFilter !== 'all') && (
            <button
              onClick={() => {
                setQuery('');
                setTypeFilter('all');
                setCategoryFilter('all');
              }}
              className="px-3 py-1 rounded-xl text-xs text-gray-400 hover:text-white"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Listado agrupado */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista */}
        <div className="lg:col-span-2 space-y-4">
          {CATEGORY_ORDER.filter((cat) => groupedByCategory.has(cat)).map((cat) => {
            const itemsInCat = groupedByCategory.get(cat) ?? [];
            return (
              <section key={cat}>
                <h2 className="text-sm font-semibold text-gray-300 mb-2 sticky top-0 bg-fluya-bg/95 backdrop-blur py-1">
                  {CATEGORY_LABELS[cat]}
                  <span className="ml-2 text-xs text-gray-500">({itemsInCat.length})</span>
                </h2>
                <div className="space-y-2">
                  {itemsInCat.map((item) => {
                    const isSelected = selectedItem?.name === item.name;
                    return (
                      <button
                        key={`${item.type}-${item.name}`}
                        onClick={() => setSelectedItem(item)}
                        className={`w-full text-left p-3 rounded-xl border transition-colors ${
                          isSelected
                            ? 'border-fluya-purple/60 bg-fluya-purple/10'
                            : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                                item.type === 'agent'
                                  ? 'bg-cyan-500/20 text-cyan-300'
                                  : 'bg-fluya-purple/20 text-fluya-purple'
                              }`}
                            >
                              {item.type}
                            </span>
                            <code className="text-sm font-mono text-white">{item.name}</code>
                          </div>
                        </div>
                        <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                          {item.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}

          {filtered.length === 0 && (
            <div className="p-6 rounded-xl border border-white/10 bg-white/5 text-center text-sm text-gray-400">
              No hay resultados con esos filtros.
            </div>
          )}
        </div>

        {/* Panel detalle */}
        <aside className="lg:col-span-1">
          <div className="sticky top-6">
            {selectedItem ? (
              <div className="p-4 rounded-xl border border-white/10 bg-white/5">
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-mono ${
                      selectedItem.type === 'agent'
                        ? 'bg-cyan-500/20 text-cyan-300'
                        : 'bg-fluya-purple/20 text-fluya-purple'
                    }`}
                  >
                    {selectedItem.type}
                  </span>
                  <span className="text-xs text-gray-400">
                    {CATEGORY_LABELS[selectedItem.category]}
                  </span>
                </div>

                <h3 className="text-lg font-mono text-white mb-2">{selectedItem.name}</h3>

                <p className="text-sm text-gray-300 mb-4">{selectedItem.description}</p>

                <div className="mb-4">
                  <p className="text-xs font-semibold text-gray-400 mb-1">Cómo invocarlo</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 rounded-lg bg-black/30 text-sm font-mono text-fluya-purple break-all">
                      {selectedItem.invocation}
                    </code>
                    <button
                      onClick={() => copyToClipboard(selectedItem.invocation)}
                      className="px-2 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-gray-400 hover:text-white"
                      title="Copiar al clipboard"
                    >
                      📋
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-2 text-xs">
                  <a
                    href={`https://github.com/nnrmits-svg/kit-comercial/blob/main/${selectedItem.path}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-fluya-purple hover:underline"
                  >
                    Ver código fuente en GitHub →
                  </a>
                  <a
                    href={selectedItem.rawUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-500 hover:text-gray-300"
                  >
                    Raw .md
                  </a>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-dashed border-white/10 bg-white/5 text-center text-sm text-gray-500">
                Click en un skill o agent para ver detalles
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
