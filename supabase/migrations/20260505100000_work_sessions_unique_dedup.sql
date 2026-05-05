-- Capa 1.5: Dedup work_sessions + UNIQUE constraint
-- Aplicar en proyecto Supabase SaasFactoryManager (ref: fxlvexilnrfkkcbzwskr)
--
-- Causa raiz del bug "9.5 anios trabajados en SuscriptionsMgmt":
--   1. push.ts hacia DELETE + INSERT no atomico → bajo concurrencia
--      (MBP + iMac), un Agent inserta despues que el otro borra → duplicados.
--   2. git-reader calculateSessions() sumaba 30 min por commit manual y
--      contaba los wip:/update: del Agent como manuales (porque solo
--      reconocia el prefijo [auto] que nunca se uso). Las dos cosas juntas
--      explican 5990 sesiones con 4.9M minutos.
--
-- Esta migration:
--   1. Borra todas las work_sessions actuales — el Agent las recalcula
--      en el proximo push con el algoritmo arreglado y las repuebla limpio.
--   2. Agrega UNIQUE (project_id, started_at) para que el nuevo UPSERT
--      del Agent sea idempotente bajo concurrencia.

BEGIN;

-- ============================================================
-- 1) Wipe de la data inflada
-- ============================================================
DELETE FROM public.work_sessions;

-- ============================================================
-- 2) UNIQUE constraint que habilita UPSERT idempotente
-- ============================================================
ALTER TABLE public.work_sessions
  DROP CONSTRAINT IF EXISTS work_sessions_project_started_key;

ALTER TABLE public.work_sessions
  ADD CONSTRAINT work_sessions_project_started_key
  UNIQUE (project_id, started_at);

COMMIT;

-- ============================================================
-- POST-VERIFICACION:
-- SELECT COUNT(*) FROM work_sessions;  -- esperado 0 hasta proximo push del Agent
-- SELECT conname, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conrelid = 'public.work_sessions'::regclass;
-- ============================================================
