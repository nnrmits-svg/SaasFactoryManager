-- Capa 3: create-project end-to-end (SF Manager <-> SF Agent)
-- Aplicar en proyecto Supabase SaasFactoryManager (ref: fxlvexilnrfkkcbzwskr)
-- Defensivo: idempotente y compatible con check constraints existentes en agent_commands.

BEGIN;

-- ============================================================
-- 1) PROJECTS: nuevas columnas para tracking de creacion async
-- ============================================================
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS local_path text,
  ADD COLUMN IF NOT EXISTS github_repo_url text,
  ADD COLUMN IF NOT EXISTS github_owner text,
  ADD COLUMN IF NOT EXISTS agent_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS agent_error text,
  ADD COLUMN IF NOT EXISTS skills_to_apply jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS created_by_command_id uuid;

-- ============================================================
-- 2) CHECK constraint para agent_status (enum logico)
-- ============================================================
ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS projects_agent_status_check;

ALTER TABLE public.projects
  ADD CONSTRAINT projects_agent_status_check
  CHECK (agent_status IN ('pending', 'creating', 'created', 'failed'));

-- ============================================================
-- 3) Indice para query del modal "esperando creacion"
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_projects_user_agent_status
  ON public.projects(user_id, agent_status);

-- ============================================================
-- 4) FK opcional: projects.created_by_command_id -> agent_commands(id)
--    ON DELETE SET NULL para no perder proyecto si se borra el comando.
-- ============================================================
ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS projects_created_by_command_id_fkey;

ALTER TABLE public.projects
  ADD CONSTRAINT projects_created_by_command_id_fkey
  FOREIGN KEY (created_by_command_id)
  REFERENCES public.agent_commands(id)
  ON DELETE SET NULL;

-- ============================================================
-- 5) Permitir 'create-project' en agent_commands.command
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
    -- Hay check constraint: lo reemplazamos incluyendo 'create-project'
    ALTER TABLE public.agent_commands DROP CONSTRAINT agent_commands_command_check;
    ALTER TABLE public.agent_commands ADD CONSTRAINT agent_commands_command_check
      CHECK (command IN ('scan', 'sync', 'apply-skill', 'push-projects', 'create-project'));
    RAISE NOTICE 'agent_commands_command_check actualizado con create-project';
  ELSE
    RAISE NOTICE 'agent_commands.command es libre (sin check constraint), no requiere cambios';
  END IF;
END $$;

COMMIT;

-- ============================================================
-- POST-VERIFICACION (correr aparte para confirmar):
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_schema='public' AND table_name='projects'
--   AND column_name IN ('local_path','github_repo_url','github_owner','agent_status',
--                        'agent_error','skills_to_apply','created_by_command_id');
--
-- SELECT conname, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conname IN ('projects_agent_status_check','agent_commands_command_check');
-- ============================================================
