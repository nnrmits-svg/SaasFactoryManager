-- ============================================================
-- Allow agent_status='discovered' on projects.
--
-- Bug: el SF Agent (push.ts -> findOrCreateProject) inserta los
-- proyectos nuevos detectados en disco con agent_status='discovered'
-- para distinguirlos de los proyectos del wizard (pending/creating/
-- created/failed). El CHECK constraint añadido en la migración
-- 20260504104901_capa3_create_project_columns.sql no incluía
-- 'discovered', por lo que cada nuevo proyecto encontrado por el
-- Agent fallaba el INSERT con 23514 (check_violation) y el Manager
-- nunca lo veía. Los proyectos pre-existentes seguían funcionando
-- porque iban por la rama UPDATE (que no toca agent_status).
--
-- Fix: ampliar el CHECK para incluir 'discovered'.
-- ============================================================

ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS projects_agent_status_check;

ALTER TABLE public.projects
  ADD CONSTRAINT projects_agent_status_check
  CHECK (agent_status IN ('discovered', 'pending', 'creating', 'created', 'failed'));
