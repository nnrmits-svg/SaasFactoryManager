'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  listKnowledge,
  searchKnowledge,
  setKnowledgeStatus,
  type KnowledgeData,
  type KnowledgeItem,
} from '@/features/knowledge/services/knowledge-actions';

type TabKey = 'development' | 'platform' | 'suggestions' | 'versions' | 'ecosystem';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'development', label: 'Desarrollos' },
  { key: 'platform', label: 'Plataforma' },
  { key: 'suggestions', label: 'Sugerencias' },
  { key: 'versions', label: 'Versiones' },
  { key: 'ecosystem', label: 'Ecosistema' },
];

const TYPE_ICON: Record<string, string> = {
  solution: '🔧', decision: '💡', pattern: '🧩', gotcha: '⚠️', anti_pattern: '🚫',
  skill_added: '🆕', agent_added: '🤖', version_bump: '🏷️', migration: '🗃️', skill_deprecated: '🗑️',
  new_skill_suggested: '✨', deprecate_suggested: '📉', pattern_detected: '🔁', merge_suggested: '🔀',
};

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    approved: 'bg-fluya-green/10 text-fluya-green border-fluya-green/20',
    pending_review: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    rejected: 'bg-red-500/10 text-red-400 border-red-500/20',
    archived: 'bg-white/5 text-gray-500 border-white/10',
  };
  const label: Record<string, string> = {
    approved: 'aprobado', pending_review: 'pendiente', rejected: 'rechazado', archived: 'archivado',
  };
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-lg border ${map[status] ?? map.archived}`}>
      {label[status] ?? status}
    </span>
  );
}

function ItemCard({ item, onReview }: { item: KnowledgeItem; onReview: (id: string, s: 'approved' | 'rejected') => void }) {
  return (
    <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-white flex items-center gap-2">
            <span>{TYPE_ICON[item.item_type] ?? '📄'}</span>
            <span className="truncate">{item.title}</span>
          </p>
          <p className="text-xs text-gray-400 mt-1">{item.body}</p>
        </div>
        <StatusBadge status={item.status} />
      </div>

      {item.context && <p className="text-xs text-gray-500 mt-2 italic">{item.context}</p>}

      {item.code_snippet && (
        <pre className="mt-2 p-2 bg-black/40 border border-white/5 rounded-lg text-[11px] text-gray-300 overflow-x-auto whitespace-pre-wrap">
          {item.code_snippet}
        </pre>
      )}

      <div className="flex items-center justify-between mt-3">
        <div className="flex flex-wrap gap-1">
          {item.tags?.map((t) => (
            <span key={t} className="text-[10px] px-1.5 py-0.5 bg-white/5 text-gray-400 rounded">#{t}</span>
          ))}
          {item.times_referenced > 0 && (
            <span className="text-[10px] text-gray-600">· usado {item.times_referenced}x</span>
          )}
        </div>
        {item.status === 'pending_review' && (
          <div className="flex gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => onReview(item.id, 'approved')}
              className="text-[11px] px-2 py-1 bg-fluya-green/10 text-fluya-green border border-fluya-green/20 rounded-lg hover:bg-fluya-green/20 transition-all"
            >
              Aprobar
            </button>
            <button
              type="button"
              onClick={() => onReview(item.id, 'rejected')}
              className="text-[11px] px-2 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-all"
            >
              Rechazar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function KnowledgeDashboard() {
  const [data, setData] = useState<KnowledgeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>('development');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<KnowledgeItem[] | null>(null);
  const [searching, setSearching] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setData(await listKnowledge());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) { setResults(null); return; }
    setSearching(true);
    setResults(await searchKnowledge(q));
    setSearching(false);
  }

  async function handleReview(id: string, status: 'approved' | 'rejected') {
    const res = await setKnowledgeStatus(id, status);
    if (res.ok) {
      await load();
      if (results) setResults((r) => r?.filter((i) => i.id !== id) ?? null);
    } else {
      alert(`Error: ${res.error}`);
    }
  }

  const counts = data
    ? {
        development: data.development.length,
        platform: data.platform.length,
        suggestions: data.suggestions.length,
        versions: data.versions.length,
        ecosystem: data.ecosystem.length,
      }
    : null;

  return (
    <div className="max-w-4xl mx-auto px-6">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold text-white">📚 Base de Conocimiento</h1>
        {data && data.pendingCount > 0 && (
          <span className="text-xs px-2 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg">
            {data.pendingCount} pendiente(s) de revisar
          </span>
        )}
      </div>
      <p className="text-gray-400 mb-6 text-sm">
        Conocimiento vivo de la SaaS Factory: desarrollos, plataforma y novedades del ecosistema.
      </p>

      {/* Buscador */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar en la KB (ej: rls policy supabase)..."
          className="flex-1 px-4 py-2 bg-black/30 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/30"
        />
        <button type="submit" className="px-4 py-2 text-sm bg-purple-500/20 text-purple-300 rounded-xl hover:bg-purple-500/30 transition-all">
          {searching ? '...' : 'Buscar'}
        </button>
        {results !== null && (
          <button type="button" onClick={() => { setResults(null); setQuery(''); }} className="px-3 py-2 text-sm text-gray-500 hover:text-white">
            ✕
          </button>
        )}
      </form>

      {/* Resultados de búsqueda */}
      {results !== null ? (
        <div className="space-y-3">
          <p className="text-xs text-gray-500">{results.length} resultado(s) para &quot;{query}&quot;</p>
          {results.map((i) => <ItemCard key={i.id} item={i} onReview={handleReview} />)}
          {results.length === 0 && <p className="text-sm text-gray-500">Sin resultados. Si lo resolvés, capturalo con /capturar-conocimiento.</p>}
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="flex gap-1 mb-5 border-b border-white/5 overflow-x-auto">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`px-3 py-2 text-sm whitespace-nowrap transition-colors border-b-2 ${
                  tab === t.key ? 'text-white border-purple-500' : 'text-gray-500 border-transparent hover:text-gray-300'
                }`}
              >
                {t.label}{counts ? ` (${counts[t.key]})` : ''}
              </button>
            ))}
          </div>

          {loading ? (
            <p className="text-gray-500 text-sm">Cargando...</p>
          ) : (
            <div className="space-y-3">
              {tab === 'development' && data?.development.map((i) => <ItemCard key={i.id} item={i} onReview={handleReview} />)}
              {tab === 'platform' && data?.platform.map((i) => <ItemCard key={i.id} item={i} onReview={handleReview} />)}
              {tab === 'suggestions' && data?.suggestions.map((i) => <ItemCard key={i.id} item={i} onReview={handleReview} />)}

              {tab === 'versions' && (data?.versions.length ? data.versions.map((v) => (
                <div key={v.id} className="p-4 bg-white/5 border border-white/10 rounded-2xl">
                  <p className="text-sm font-medium text-white">{v.component} · {v.version}</p>
                  {v.rationale && <p className="text-xs text-gray-400 mt-1">{v.rationale}</p>}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {v.skills_added?.map((s) => <span key={s} className="text-[10px] px-1.5 py-0.5 bg-purple-500/10 text-purple-300 rounded">+{s}</span>)}
                    {v.agents_added?.map((a) => <span key={a} className="text-[10px] px-1.5 py-0.5 bg-blue-500/10 text-blue-300 rounded">🤖 {a}</span>)}
                  </div>
                </div>
              )) : <p className="text-sm text-gray-500">Sin versiones registradas todavía.</p>)}

              {tab === 'ecosystem' && (data?.ecosystem.length ? data.ecosystem.map((e) => (
                <div key={e.id} className="p-4 bg-white/5 border border-white/10 rounded-2xl">
                  <p className="text-sm font-medium text-white">🛰️ {e.title}</p>
                  {e.why_relevant && <p className="text-xs text-gray-400 mt-1"><span className="text-gray-500">Por qué te sirve: </span>{e.why_relevant}</p>}
                  {e.suggested_action && <p className="text-xs text-gray-400 mt-1"><span className="text-gray-500">Acción: </span>{e.suggested_action}</p>}
                  <div className="flex items-center gap-2 mt-2">
                    {e.effort && <span className="text-[10px] px-1.5 py-0.5 bg-white/5 text-gray-400 rounded">esfuerzo: {e.effort}</span>}
                    {e.impact && <span className="text-[10px] px-1.5 py-0.5 bg-white/5 text-gray-400 rounded">impacto: {e.impact}</span>}
                    {e.affects_skills?.map((s) => <span key={s} className="text-[10px] px-1.5 py-0.5 bg-purple-500/10 text-purple-300 rounded">{s}</span>)}
                  </div>
                </div>
              )) : <p className="text-sm text-gray-500">Sin novedades del ecosistema todavía (el Radar las llena en Capa 2).</p>)}

              {((tab === 'development' && !data?.development.length) ||
                (tab === 'platform' && !data?.platform.length) ||
                (tab === 'suggestions' && !data?.suggestions.length)) && (
                <p className="text-sm text-gray-500">Sin items todavía. Capturá con /capturar-conocimiento desde Claude Code.</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
