-- Capa 2.5: hashes en project_skills para detectar synced/divergent
-- Aplicar en proyecto Supabase SaasFactoryManager (ref: fxlvexilnrfkkcbzwskr)
--
-- El SF Agent computa dos hashes por skill instalado en cada proyecto:
--   * local_hash: hash del directorio .claude/skills/<name>/ del proyecto
--   * registry_hash: hash del mismo skill en skills_catalog
-- y los pushea junto con el resto del row de project_skills.
--
-- Logica de status (calculada por el Manager en el read, usada por SkillPanel):
--   local_hash IS NULL                     -> missing   (rojo, skill borrado del proyecto pero fila huerfana)
--   registry_hash IS NULL                  -> external  (gris, skill custom no en catalogo)
--   local_hash = registry_hash             -> synced    (verde)
--   local_hash <> registry_hash            -> divergent (ambar)

BEGIN;

-- ============================================================
-- 1) Columnas (idempotente)
-- ============================================================
ALTER TABLE public.project_skills
  ADD COLUMN IF NOT EXISTS local_hash text,
  ADD COLUMN IF NOT EXISTS registry_hash text,
  ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;

COMMENT ON COLUMN public.project_skills.local_hash IS
  'Hash del directorio .claude/skills/<name>/ en el filesystem local del proyecto. NULL si el skill esta registrado pero falta en disco (estado missing).';

COMMENT ON COLUMN public.project_skills.registry_hash IS
  'Hash del mismo skill en skills_catalog al momento del ultimo push del Agent. NULL para skills custom que no estan en el catalogo (estado external).';

COMMENT ON COLUMN public.project_skills.last_synced_at IS
  'Timestamp del ultimo push del Agent que actualizo esta fila. Usado por el Manager para mostrar "Hace Xm" en SkillPanel.';

-- ============================================================
-- 2) Indice para query "skills divergentes" (usado por el dashboard del Manager)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_project_skills_divergent
  ON public.project_skills (project_id)
  WHERE local_hash IS NOT NULL
    AND registry_hash IS NOT NULL
    AND local_hash <> registry_hash;

COMMIT;

-- ============================================================
-- POST-VERIFICACION:
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_schema='public' AND table_name='project_skills'
--   AND column_name IN ('local_hash','registry_hash','last_synced_at')
-- ORDER BY ordinal_position;
--
-- Esperado: 3 filas, dos text + una timestamptz, todas YES en is_nullable.
--
-- SELECT indexname FROM pg_indexes WHERE indexname = 'idx_project_skills_divergent';
-- Esperado: 1 fila.
-- ============================================================
