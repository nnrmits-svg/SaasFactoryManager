-- Capa 2.5: hashes en project_skills para detectar synced/divergent
-- Aplicar en proyecto Supabase SaasFactoryManager (ref: fxlvexilnrfkkcbzwskr)
--
-- El Agent computa dos hashes por skill instalado en un proyecto:
--   - local_hash: hash del skill como esta en .claude/skills/ del proyecto
--   - registry_hash: hash del mismo skill en el catalogo central (.claude/skills/
--                   o .claude/skills-catalog/ del Agent)
--
-- Logica de status (la calcula el Manager en el read):
--   - local_hash IS NULL                    -> "missing" (skill borrado del proyecto pero
--                                              fila quedo huerfana — caso raro)
--   - registry_hash IS NULL                  -> "external" (skill custom del proyecto que
--                                              no existe en catalogo)
--   - local_hash = registry_hash             -> "synced"
--   - local_hash <> registry_hash            -> "divergent"

BEGIN;

-- ============================================================
-- 1) Columnas nuevas en project_skills
-- ============================================================
ALTER TABLE public.project_skills
  ADD COLUMN IF NOT EXISTS local_hash text,
  ADD COLUMN IF NOT EXISTS registry_hash text,
  ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;

-- ============================================================
-- 2) Indice para query "skills divergentes" (vista futura del Manager)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_project_skills_divergent
  ON public.project_skills (project_id)
  WHERE local_hash IS NOT NULL
    AND registry_hash IS NOT NULL
    AND local_hash <> registry_hash;

COMMIT;

-- ============================================================
-- POST-VERIFICACION:
-- SELECT column_name, data_type, is_nullable FROM information_schema.columns
-- WHERE table_schema='public' AND table_name='project_skills'
-- ORDER BY ordinal_position;
-- ============================================================
