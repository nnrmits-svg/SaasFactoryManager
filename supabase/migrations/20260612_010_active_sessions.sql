-- ============================================================================
-- Mig 010 — Sesiones activas (Mission Control Fase 2)
-- ----------------------------------------------------------------------------
-- Separa dos conceptos que antes se pisaban en pmo_sessions:
--   • pmo_active_sessions = sesiones de Claude Code EFÍMERAS (hook SessionStart
--     las prende por session_id, hook SessionEnd las apaga). Varias por repo OK.
--   • pmo_sessions        = workstreams CURADOS (estado real del proyecto).
-- Además agrega pending_task a los workstreams ("Tarea Pendiente" del tablero).
-- ============================================================================

-- 1) Tabla de sesiones activas (clave = session_id)
CREATE TABLE IF NOT EXISTS pmo_active_sessions (
  session_id   TEXT PRIMARY KEY,            -- CLAUDE_CODE_SESSION_ID
  machine      TEXT NOT NULL,               -- ComputerName
  project      TEXT NOT NULL,               -- repo basename, o "(sin proyecto)"
  client       TEXT,                        -- Claude Desktop | Terminal | Antigravity | ...
  status       TEXT NOT NULL DEFAULT 'working'
    CHECK (status IN ('working','blocked','review','idle','done')),
  current_task TEXT,
  cwd          TEXT,
  office       TEXT DEFAULT 'principal',
  started_at   TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_active_sessions_seen ON pmo_active_sessions(last_seen_at DESC);

ALTER TABLE pmo_active_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "team_reads_active_sessions" ON pmo_active_sessions;
CREATE POLICY "team_reads_active_sessions" ON pmo_active_sessions
  FOR SELECT USING (auth.uid() IS NOT NULL);
-- Las escrituras van por service-role (API), que saltea RLS.

-- 2) "Tarea Pendiente" en los workstreams curados
ALTER TABLE pmo_sessions ADD COLUMN IF NOT EXISTS pending_task TEXT;

-- 3) Refrescar el cache de PostgREST (si corrés esto desde el SQL editor)
NOTIFY pgrst, 'reload schema';

-- Verificación
SELECT 'pmo_active_sessions' AS tabla, count(*) FROM pmo_active_sessions
UNION ALL
SELECT 'pmo_sessions (pending_task ok)', count(*) FROM pmo_sessions;
