-- Auto-blindaje PRP-005 Fase 1: SET search_path en funciones nuevas
-- Mitiga WARN 0011_function_search_path_mutable del linter Supabase
-- Aplicar en proyecto Supabase SaasFactoryManager (ref: fxlvexilnrfkkcbzwskr)

BEGIN;

CREATE OR REPLACE FUNCTION public.tg_projects_set_number()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  IF NEW.project_number IS NULL THEN
    NEW.project_number := nextval('public.projects_number_seq');
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.format_quote_number(p_project_number int, p_version int)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public, pg_temp AS $$
  SELECT 'SF-' || p_project_number::text || '-' || lpad(p_version::text, 2, '0');
$$;

CREATE OR REPLACE FUNCTION public.tg_contracts_set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_my_project(p_project_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (SELECT 1 FROM public.projects WHERE id = p_project_id AND user_id = auth.uid());
$$;

COMMIT;
