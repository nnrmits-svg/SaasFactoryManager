-- Capa M: work_sessions RLS completas (UPDATE + DELETE)
-- Aplicar en proyecto Supabase SaasFactoryManager (ref: fxlvexilnrfkkcbzwskr)
--
-- Causa raiz: el Agent pushea work_sessions con .upsert() sobre la UNIQUE
-- constraint (project_id, started_at). Para que el ON CONFLICT haga UPDATE
-- en lugar de fallar silenciosamente, Postgres necesita policy de UPDATE.
-- La policy de DELETE va por simetria + para permitir wipes manuales.
--
-- Antes de esta migracion las policies se crearon directamente via SQL Editor
-- el 2026-05-11 — esta migracion las codifica para que la BD pueda recrearse
-- desde cero sin perder el fix.
--
-- Patron a evitar a futuro: tablas con .upsert() necesitan SIEMPRE policies
-- de INSERT + UPDATE + SELECT (DELETE es opcional pero recomendado).

BEGIN;

-- Idempotente: drop si existen, recrear
DROP POLICY IF EXISTS "Authenticated users can update work_sessions"
  ON public.work_sessions;

DROP POLICY IF EXISTS "Authenticated users can delete work_sessions"
  ON public.work_sessions;

CREATE POLICY "Authenticated users can update work_sessions"
  ON public.work_sessions
  FOR UPDATE
  TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete work_sessions"
  ON public.work_sessions
  FOR DELETE
  TO authenticated
  USING (auth.role() = 'authenticated');

COMMIT;

-- ============================================================
-- POST-VERIFICACION:
-- SELECT polname, polcmd FROM pg_policy
-- WHERE polrelid = 'public.work_sessions'::regclass
-- ORDER BY polcmd;
--
-- Esperado: filas con polcmd IN ('r','a','w','d') (SELECT, INSERT, UPDATE, DELETE)
-- ============================================================
