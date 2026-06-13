-- ============================================================================
-- Mig 011 — Feed de actividad de Mission Control (vista por proyecto)
-- ----------------------------------------------------------------------------
-- Log append-only: cada reporte de estado (/tablero, sf-report) deja una entrada.
-- El tablero por-proyecto muestra las últimas N de cada uno → un manager lee la
-- HISTORIA, no solo el estado actual. "Última vez activo" se computa del max ts.
-- ============================================================================

CREATE TABLE IF NOT EXISTS pmo_activity (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project    TEXT NOT NULL,
  machine    TEXT,
  action     TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pmo_activity_project_at ON pmo_activity(project, created_at DESC);

ALTER TABLE pmo_activity ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "team_reads_activity" ON pmo_activity;
CREATE POLICY "team_reads_activity" ON pmo_activity FOR SELECT USING (auth.uid() IS NOT NULL);
-- Escrituras por service-role (API), que saltea RLS.

NOTIFY pgrst, 'reload schema';

SELECT 'pmo_activity' AS tabla, count(*) FROM pmo_activity;
