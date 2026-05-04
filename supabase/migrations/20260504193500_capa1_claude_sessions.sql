-- Capa 1: Tracking fino de sesiones Claude (tokens, costo, modelo)
-- Aplicar en proyecto Supabase SaasFactoryManager (ref: fxlvexilnrfkkcbzwskr)
-- Idempotente. Lectura: solo el owner del row.

BEGIN;

-- ============================================================
-- 1) Tabla claude_sessions
-- ============================================================
CREATE TABLE IF NOT EXISTS public.claude_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  work_session_id uuid REFERENCES public.work_sessions(id) ON DELETE SET NULL,
  session_id text NOT NULL,
  cwd text NOT NULL,
  hostname text,
  entrypoint text,
  model text,
  started_at timestamptz NOT NULL,
  ended_at timestamptz,
  tokens_input bigint NOT NULL DEFAULT 0,
  tokens_output bigint NOT NULL DEFAULT 0,
  tokens_cached bigint NOT NULL DEFAULT 0,
  tokens_cache_creation bigint NOT NULL DEFAULT 0,
  cost_usd numeric(10,4) NOT NULL DEFAULT 0,
  prompt_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, session_id)
);

-- ============================================================
-- 2) Indices
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_claude_sessions_project_started
  ON public.claude_sessions (project_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_claude_sessions_user_started
  ON public.claude_sessions (user_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_claude_sessions_work_session
  ON public.claude_sessions (work_session_id);

-- ============================================================
-- 3) Trigger updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION public.tg_claude_sessions_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS claude_sessions_set_updated_at ON public.claude_sessions;
CREATE TRIGGER claude_sessions_set_updated_at
  BEFORE UPDATE ON public.claude_sessions
  FOR EACH ROW EXECUTE FUNCTION public.tg_claude_sessions_set_updated_at();

-- ============================================================
-- 4) RLS: el owner del row solo
-- ============================================================
ALTER TABLE public.claude_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "claude_sessions_select_own" ON public.claude_sessions;
CREATE POLICY "claude_sessions_select_own"
  ON public.claude_sessions FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "claude_sessions_insert_own" ON public.claude_sessions;
CREATE POLICY "claude_sessions_insert_own"
  ON public.claude_sessions FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "claude_sessions_update_own" ON public.claude_sessions;
CREATE POLICY "claude_sessions_update_own"
  ON public.claude_sessions FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "claude_sessions_delete_own" ON public.claude_sessions;
CREATE POLICY "claude_sessions_delete_own"
  ON public.claude_sessions FOR DELETE
  USING (user_id = auth.uid());

COMMIT;

-- ============================================================
-- POST-VERIFICACION:
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_schema='public' AND table_name='claude_sessions';
--
-- SELECT polname, polcmd FROM pg_policies WHERE tablename='claude_sessions';
-- ============================================================
