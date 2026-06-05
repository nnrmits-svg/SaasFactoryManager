-- ============================================================================
-- Cross-sprint · Mig 007 — SF Knowledge Base (Capa 1 MVP)
-- ----------------------------------------------------------------------------
-- Spec: kit-comercial/dev/docs/SF-KNOWLEDGE-BASE.md (v1.1)
-- 3 dimensiones: Desarrollos (D1) · Plataforma con el porqué (D2) ·
--                Proactivo (D3 = Radar Interno + Radar Externo/Ecosistema)
--
-- Tablas: knowledge_items · platform_versions · tracked_tools · ecosystem_updates
-- Búsqueda: full-text (tsvector español) ahora; semántica (pgvector) queda lista
--           en el schema pero el índice/embeddings se cablean en Capa 2.
-- Sin conflicts: ninguna de estas tablas existe.
-- ============================================================================

-- pgvector para futura búsqueda semántica (la columna se crea ya; el índice
-- y los embeddings se llenan en Capa 2 cuando elijamos proveedor de embeddings).
CREATE EXTENSION IF NOT EXISTS vector;

-- ── 1. knowledge_items (las 3 dimensiones) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS knowledge_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  dimension TEXT NOT NULL CHECK (dimension IN (
    'development',   -- D1: soluciones/decisiones/patrones de proyectos
    'platform',      -- D2: evolución de la SaaS Factory (skills/agents/versiones)
    'suggestion'     -- D3: mejoras sugeridas por el motor proactivo
  )),

  item_type TEXT NOT NULL CHECK (item_type IN (
    -- development
    'solution', 'decision', 'pattern', 'gotcha', 'anti_pattern',
    -- platform
    'skill_added', 'agent_added', 'version_bump', 'migration', 'skill_deprecated',
    -- suggestion
    'new_skill_suggested', 'deprecate_suggested', 'pattern_detected', 'merge_suggested'
  )),

  title TEXT NOT NULL,
  body TEXT NOT NULL,
  context TEXT,                          -- el PORQUÉ / cuándo aplica
  code_snippet TEXT,

  tags TEXT[] DEFAULT '{}',
  tech_stack TEXT[] DEFAULT '{}',
  embedding vector(1536),                -- semántica (Capa 2)

  source_type TEXT NOT NULL CHECK (source_type IN (
    'ai_harvested', 'manual_dev', 'platform_change', 'proactive_engine'
  )),
  source_project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  source_commit_sha TEXT,
  source_ref TEXT,

  status TEXT NOT NULL DEFAULT 'pending_review'
    CHECK (status IN ('pending_review', 'approved', 'rejected', 'archived')),
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,

  times_referenced INTEGER DEFAULT 0,
  last_referenced_at TIMESTAMPTZ,

  ai_confidence NUMERIC(3,2),
  ai_cost_usd NUMERIC(10,4),

  -- Full-text (español): título + cuerpo + contexto + tags
  search_tsv tsvector GENERATED ALWAYS AS (
    to_tsvector('spanish',
      coalesce(title, '') || ' ' ||
      coalesce(body, '') || ' ' ||
      coalesce(context, '') || ' ' ||
      array_to_string(tags, ' ') || ' ' ||
      array_to_string(tech_stack, ' ')
    )
  ) STORED,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_knowledge_dimension ON knowledge_items(dimension, status);
CREATE INDEX IF NOT EXISTS idx_knowledge_tags ON knowledge_items USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_knowledge_search ON knowledge_items USING GIN(search_tsv);
-- Índice vectorial (semántica) → Capa 2:
--   CREATE INDEX idx_knowledge_embedding ON knowledge_items
--     USING hnsw (embedding vector_cosine_ops);

-- ── 2. platform_versions (D2 — changelog inteligente con razones) ────────────
CREATE TABLE IF NOT EXISTS platform_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  component TEXT NOT NULL CHECK (component IN ('kit-comercial', 'sf-manager', 'sf-agent')),
  version TEXT NOT NULL,
  released_at TIMESTAMPTZ,

  skills_added TEXT[] DEFAULT '{}',
  skills_removed TEXT[] DEFAULT '{}',
  agents_added TEXT[] DEFAULT '{}',
  migrations_applied TEXT[] DEFAULT '{}',

  changelog TEXT,
  rationale TEXT,                        -- el PORQUÉ (lo clave de la D2)

  commit_sha TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(component, version)
);

-- ── 3. tracked_tools (watch list del Radar Externo — auto desde skills) ──────
CREATE TABLE IF NOT EXISTS tracked_tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT,                         -- anti-bot, rate-limit, framework, llm, db, observability
  current_version TEXT,
  changelog_url TEXT,
  source_kind TEXT CHECK (source_kind IN ('github_releases','changelog_page','npm','rss')),

  required_by_skills TEXT[] DEFAULT '{}',
  required_by_agents TEXT[] DEFAULT '{}',
  is_core_stack BOOLEAN DEFAULT FALSE,

  last_checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name)
);

-- ── 4. ecosystem_updates (digest del Radar Externo) ─────────────────────────
CREATE TABLE IF NOT EXISTS ecosystem_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_id UUID REFERENCES tracked_tools(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('new_feature','new_version','new_tool','security','deprecation')),

  title TEXT NOT NULL,
  whats_new TEXT,
  why_relevant TEXT,                     -- el filtro de relevancia (el valor)
  suggested_action TEXT,

  affects_skills TEXT[] DEFAULT '{}',
  affects_projects UUID[] DEFAULT '{}',
  effort TEXT CHECK (effort IN ('low','medium','high')),
  impact TEXT CHECK (impact IN ('low','medium','high')),

  source_url TEXT,
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new','reviewed','actioned','dismissed'))
);

CREATE INDEX IF NOT EXISTS idx_ecosystem_status ON ecosystem_updates(status, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_tracked_tools_skills ON tracked_tools USING GIN(required_by_skills);

-- ── 5. RLS ──────────────────────────────────────────────────────────────────
ALTER TABLE knowledge_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracked_tools     ENABLE ROW LEVEL SECURITY;
ALTER TABLE ecosystem_updates ENABLE ROW LEVEL SECURITY;

-- knowledge_items: el equipo lee lo aprobado; leader+dev ven todo y gestionan
DROP POLICY IF EXISTS "team_reads_kb" ON knowledge_items;
CREATE POLICY "team_reads_kb" ON knowledge_items
  FOR SELECT USING (
    status = 'approved'
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('leader','dev'))
  );

DROP POLICY IF EXISTS "leader_dev_manage_kb" ON knowledge_items;
CREATE POLICY "leader_dev_manage_kb" ON knowledge_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('leader','dev'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('leader','dev'))
  );

-- platform_versions: lectura abierta al equipo logueado
DROP POLICY IF EXISTS "team_reads_versions" ON platform_versions;
CREATE POLICY "team_reads_versions" ON platform_versions
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "leader_dev_manage_versions" ON platform_versions;
CREATE POLICY "leader_dev_manage_versions" ON platform_versions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('leader','dev'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('leader','dev'))
  );

-- Radar de Ecosistema: el equipo lee; leader+dev gestionan
DROP POLICY IF EXISTS "team_reads_tools" ON tracked_tools;
CREATE POLICY "team_reads_tools" ON tracked_tools
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "leader_dev_manage_tools" ON tracked_tools;
CREATE POLICY "leader_dev_manage_tools" ON tracked_tools
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('leader','dev'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('leader','dev'))
  );

DROP POLICY IF EXISTS "team_reads_ecosystem" ON ecosystem_updates;
CREATE POLICY "team_reads_ecosystem" ON ecosystem_updates
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "leader_dev_manage_ecosystem" ON ecosystem_updates;
CREATE POLICY "leader_dev_manage_ecosystem" ON ecosystem_updates
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('leader','dev'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('leader','dev'))
  );

-- ── 6. Helper: búsqueda full-text con ranking (usada por /buscar-conocimiento) ─
CREATE OR REPLACE FUNCTION search_knowledge(q TEXT, max_results INT DEFAULT 10)
RETURNS SETOF knowledge_items
LANGUAGE sql STABLE
SET search_path = public
AS $$
  -- SECURITY INVOKER (default) → respeta RLS del que llama:
  -- 'cliente' ve solo approved; leader/dev ven también pending.
  SELECT *
  FROM knowledge_items
  WHERE search_tsv @@ websearch_to_tsquery('spanish', q)
  ORDER BY ts_rank(search_tsv, websearch_to_tsquery('spanish', q)) DESC,
           times_referenced DESC
  LIMIT max_results;
$$;
