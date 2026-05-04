-- Capa 8/A: Selector de github_owner — cache de orgs del usuario
-- Aplicar en proyecto Supabase SaasFactoryManager (ref: fxlvexilnrfkkcbzwskr)
-- Permite que el wizard ofrezca un dropdown "Owner: [user / org1 / org2]"
-- alimentado por el handler `list-github-orgs` del Agent (gh api /user/orgs).

BEGIN;

-- ============================================================
-- 1) Tabla user_github_orgs
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_github_orgs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_login text NOT NULL,
  avatar_url text,
  description text,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, org_login)
);

-- ============================================================
-- 2) Indice
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_user_github_orgs_user
  ON public.user_github_orgs (user_id);

-- ============================================================
-- 3) Trigger updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION public.tg_user_github_orgs_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_github_orgs_set_updated_at ON public.user_github_orgs;
CREATE TRIGGER user_github_orgs_set_updated_at
  BEFORE UPDATE ON public.user_github_orgs
  FOR EACH ROW EXECUTE FUNCTION public.tg_user_github_orgs_set_updated_at();

-- ============================================================
-- 4) RLS: el owner del row solo
-- ============================================================
ALTER TABLE public.user_github_orgs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_github_orgs_select_own" ON public.user_github_orgs;
CREATE POLICY "user_github_orgs_select_own"
  ON public.user_github_orgs FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "user_github_orgs_insert_own" ON public.user_github_orgs;
CREATE POLICY "user_github_orgs_insert_own"
  ON public.user_github_orgs FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "user_github_orgs_update_own" ON public.user_github_orgs;
CREATE POLICY "user_github_orgs_update_own"
  ON public.user_github_orgs FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "user_github_orgs_delete_own" ON public.user_github_orgs;
CREATE POLICY "user_github_orgs_delete_own"
  ON public.user_github_orgs FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================
-- 5) Permitir 'list-github-orgs' en agent_commands.command
--    Defensivo: funciona si hay check constraint y si no.
-- ============================================================
DO $$
DECLARE
  existing_constraint text;
BEGIN
  SELECT pg_get_constraintdef(oid) INTO existing_constraint
  FROM pg_constraint
  WHERE conname = 'agent_commands_command_check'
    AND conrelid = 'public.agent_commands'::regclass;

  IF existing_constraint IS NOT NULL THEN
    ALTER TABLE public.agent_commands DROP CONSTRAINT agent_commands_command_check;
    ALTER TABLE public.agent_commands ADD CONSTRAINT agent_commands_command_check
      CHECK (command IN (
        'scan', 'sync', 'apply-skill', 'push-projects',
        'create-project', 'list-github-orgs'
      ));
    RAISE NOTICE 'agent_commands_command_check actualizado con list-github-orgs';
  ELSE
    RAISE NOTICE 'agent_commands.command es libre (sin check constraint), no requiere cambios';
  END IF;
END $$;

COMMIT;

-- ============================================================
-- POST-VERIFICACION:
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_schema='public' AND table_name='user_github_orgs';
--
-- SELECT polname, polcmd FROM pg_policies WHERE tablename='user_github_orgs';
--
-- SELECT pg_get_constraintdef(oid) FROM pg_constraint
-- WHERE conname='agent_commands_command_check';
-- ============================================================
