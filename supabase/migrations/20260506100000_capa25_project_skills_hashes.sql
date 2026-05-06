-- Capa 2.5: hashes en project_skills para diff local <-> registry
-- Aplicar en proyecto Supabase SaasFactoryManager (ref: fxlvexilnrfkkcbzwskr)
--
-- El SF Agent computa dos hashes por skill instalado en cada proyecto:
--   * local_hash: hash del directorio .claude/skills/<name>/ del proyecto
--   * registry_hash: hash del mismo skill en el catálogo (skills_catalog)
-- y los pushea junto con el resto del row de project_skills. El Manager
-- usa ambos para renderizar el badge en <SkillPanel>:
--   local_hash IS NULL                     -> missing  (rojo)
--   registry_hash IS NULL                  -> external (gris, skill custom)
--   local_hash = registry_hash             -> synced   (verde)
--   local_hash <> registry_hash            -> divergent (ámbar)

BEGIN;

-- ============================================================
-- 1) Columnas (idempotente)
-- ============================================================
ALTER TABLE public.project_skills
  ADD COLUMN IF NOT EXISTS local_hash text,
  ADD COLUMN IF NOT EXISTS registry_hash text;

COMMENT ON COLUMN public.project_skills.local_hash IS
  'Hash del directorio .claude/skills/<name>/ en el filesystem local del proyecto. NULL si el skill está registrado pero falta en disco.';

COMMENT ON COLUMN public.project_skills.registry_hash IS
  'Hash del mismo skill en skills_catalog al momento del último push del Agent. NULL para skills custom que no están en el catálogo.';

COMMIT;

-- ============================================================
-- POST-VERIFICACION:
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_schema='public' AND table_name='project_skills'
--   AND column_name IN ('local_hash','registry_hash');
--
-- Esperado: 2 filas, ambas text, ambas YES en is_nullable.
-- ============================================================
