-- Capa 2: skills_catalog poblada por el Agent
-- Aplicar en proyecto Supabase SaasFactoryManager (ref: fxlvexilnrfkkcbzwskr)
--
-- Catalogo de skills disponibles, propiedad del Agent (lee
-- .claude/skills/ y .claude/skills-catalog/ del filesystem) y pusheado
-- a Supabase para que el Manager pueda mostrar <SkillRegistryDashboard>
-- sin tocar el filesystem del Lambda (que no existe en Vercel).

BEGIN;

-- ============================================================
-- 1) Tabla skills_catalog
-- ============================================================
CREATE TABLE IF NOT EXISTS public.skills_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  skill_name text NOT NULL,
  source text NOT NULL CHECK (source IN ('official', 'catalog')),
  description text,
  hash text,
  mtime timestamptz,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, skill_name, source)
);

-- ============================================================
-- 2) Indices
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_skills_catalog_user
  ON public.skills_catalog (user_id);

CREATE INDEX IF NOT EXISTS idx_skills_catalog_user_last_seen
  ON public.skills_catalog (user_id, last_seen_at DESC);

-- ============================================================
-- 3) Trigger updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION public.tg_skills_catalog_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS skills_catalog_set_updated_at ON public.skills_catalog;
CREATE TRIGGER skills_catalog_set_updated_at
  BEFORE UPDATE ON public.skills_catalog
  FOR EACH ROW EXECUTE FUNCTION public.tg_skills_catalog_set_updated_at();

-- ============================================================
-- 4) RLS: el owner del row solo
-- ============================================================
ALTER TABLE public.skills_catalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "skills_catalog_select_own" ON public.skills_catalog;
CREATE POLICY "skills_catalog_select_own"
  ON public.skills_catalog FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "skills_catalog_insert_own" ON public.skills_catalog;
CREATE POLICY "skills_catalog_insert_own"
  ON public.skills_catalog FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "skills_catalog_update_own" ON public.skills_catalog;
CREATE POLICY "skills_catalog_update_own"
  ON public.skills_catalog FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "skills_catalog_delete_own" ON public.skills_catalog;
CREATE POLICY "skills_catalog_delete_own"
  ON public.skills_catalog FOR DELETE
  USING (user_id = auth.uid());

COMMIT;

-- ============================================================
-- POST-VERIFICACION:
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_schema='public' AND table_name='skills_catalog';
--
-- SELECT polname, polcmd FROM pg_policies WHERE tablename='skills_catalog';
-- ============================================================
