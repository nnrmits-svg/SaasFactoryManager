-- ============================================================================
-- BACKUP / ROLLBACK — SF Manager, estado PRE Sprint A (mig 001)
-- Fecha: 2026-05-31 · DB: fxlvexilnrfkkcbzwskr (prod)
-- Generado por sesión MANAGER antes de aplicar 20260530_001a/b.
--
-- NOTA: pg_dump NO está disponible en este entorno (binario ausente + no
-- tengo la DB password directa, solo service_role + REST URL). Este archivo
-- es un BACKUP LÓGICO DE ROLLBACK: captura el estado reversible exacto que
-- toca la mig 001 (enum user_role, funciones helper, datos de profiles).
-- La mig 001 es 100% reversible con este script EXCEPTO el ADD VALUE
-- 'comercial' (Postgres no soporta DROP de un enum value sin recrear el tipo).
-- ============================================================================

-- ---- ESTADO ENUM user_role (antes) -----------------------------------------
-- user_role = { founder, operator, client }

-- ---- DATOS profiles (antes) ------------------------------------------------
-- ricardo@grupoits.com.ar     | founder   | 2026-03-20
-- nnrmits@gmail.com           | operator  | 2026-03-20  (sin punto, confirmado)
-- rmarchetti@grupoits.com.ar  | operator  | (operator)

-- ============================================================================
-- ROLLBACK (correr en este orden si hay que revertir la mig 001)
-- ============================================================================

-- 1) Revertir backfill de roles (a valores renombrados, antes de revertir enum)
--    [no estrictamente necesario si se revierte el enum, OID-based]

-- 2) Revertir nombres del enum (los OIDs se preservan, los datos vuelven solos)
ALTER TYPE user_role RENAME VALUE 'leader'  TO 'founder';
ALTER TYPE user_role RENAME VALUE 'dev'     TO 'operator';
ALTER TYPE user_role RENAME VALUE 'cliente' TO 'client';
-- ⚠️ 'comercial' NO se puede borrar (DROP VALUE no existe en PG). Queda como
--    valor huérfano sin filas. Para eliminarlo de verdad hay que recrear el tipo.

-- 3) Restaurar funciones helper originales
ALTER FUNCTION is_leader() RENAME TO is_founder;
CREATE OR REPLACE FUNCTION public.is_founder()
  RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'founder');
$$;

ALTER FUNCTION is_leader_or_dev() RENAME TO is_founder_or_operator;
CREATE OR REPLACE FUNCTION public.is_founder_or_operator()
  RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('founder', 'operator'));
$$;

-- 4) Drop de tablas/columnas nuevas (si llegaron a crearse)
DROP TABLE IF EXISTS public.project_assignments CASCADE;
DROP TABLE IF EXISTS public.client_project_access CASCADE;
ALTER TABLE public.projects DROP COLUMN IF EXISTS sold_by_user_id;
ALTER TABLE public.projects DROP COLUMN IF EXISTS sold_at;
DROP INDEX IF EXISTS idx_profiles_role;

-- handle_new_user() ya usaba 'cliente' en su cuerpo ANTES de esta mig (latente);
-- tras revertir el enum a 'client' quedaría roto. Si se revierte, recrear con 'client':
-- CREATE OR REPLACE FUNCTION public.handle_new_user() ... VALUES (..., 'client');
