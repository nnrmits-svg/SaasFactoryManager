-- ============================================================================
-- Mig 009 — PMO Board / Mission Control (tablero central de sesiones)
-- ----------------------------------------------------------------------------
-- Tablero org-agnóstico: cualquier máquina/oficina reporta acá (cloud central).
-- El skill /tablero hace upsert; el CLI sf-board lo lee.
-- ============================================================================

CREATE TABLE IF NOT EXISTS pmo_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine TEXT NOT NULL,                 -- hostname (ej: MB-Air-NNRM-2025)
  project TEXT NOT NULL,                 -- nombre del proyecto / workstream
  role TEXT NOT NULL DEFAULT 'executor'  -- executor | hub | agent
    CHECK (role IN ('executor','hub','agent')),
  status TEXT NOT NULL DEFAULT 'working' -- working | blocked | review | idle | done
    CHECK (status IN ('working','blocked','review','idle','done')),
  current_task TEXT,                     -- qué está haciendo ahora
  next_task TEXT,                        -- qué sigue (opcional)
  office TEXT DEFAULT 'principal',       -- oficina/red (para multi-oficina)
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(machine, project)
);

CREATE INDEX IF NOT EXISTS idx_pmo_updated ON pmo_sessions(updated_at DESC);

ALTER TABLE pmo_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "team_reads_pmo" ON pmo_sessions;
CREATE POLICY "team_reads_pmo" ON pmo_sessions FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "leaderdev_manage_pmo" ON pmo_sessions;
CREATE POLICY "leaderdev_manage_pmo" ON pmo_sessions FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('leader','dev'))
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('leader','dev'))
);

-- Seed con tus workstreams ACTUALES
INSERT INTO pmo_sessions (machine, project, role, status, current_task) VALUES
  ('MB-Air-NNRM-2025','arca-gestion','executor','working','Desarrollo (vinculado a Applysys)'),
  ('MB-Air-NNRM-2025','Applysys-scraping','executor','working','Scraping (vinculado a arca-gestion)'),
  ('MB-Air-NNRM-2025','youtube-listas','executor','working','Proyecto independiente'),
  ('MacBookPro-2016','SF-Agent','agent','working','Fix sync (wip) + estrategia A'),
  ('NNRM-iMac-275','SuscriptionMgmt','executor','idle','—'),
  ('NNRM-iMac-275','SF-Manager','hub','working','PMO/Arquitecto + KB')
ON CONFLICT (machine, project) DO UPDATE SET current_task = EXCLUDED.current_task, updated_at = NOW();

SELECT machine, project, role, status, current_task FROM pmo_sessions ORDER BY machine, project;
