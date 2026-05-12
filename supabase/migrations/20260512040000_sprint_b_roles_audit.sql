-- Sprint B (Capas 1 + 4): Roles founder/operator/client + audit logs
-- Aplicar en proyecto Supabase SaasFactoryManager (ref: fxlvexilnrfkkcbzwskr)
--
-- Modelo de roles:
--   - founder: acceso total, puede invitar operadores/clientes, cambiar roles,
--              borrar proyectos, cambiar pricing
--   - operator: puede ver todo, sincronizar skills, levantar tracking, aplicar
--               skills, pero NO puede borrar proyectos ni cambiar configuracion
--               critica
--   - client: ve SOLO sus proyectos (filtrado por user_id), no puede crear ni
--             borrar, solo lectura + interactuar con su proyecto
--
-- Pre-existente: todos los usuarios se bootstrappean a founder. El founder asigna
-- roles posteriores via UI de Settings.

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('founder', 'operator', 'client');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role user_role NOT NULL DEFAULT 'client';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Bootstrap: usuarios existentes pasan a founder
INSERT INTO public.profiles (id, email, role)
SELECT u.id, u.email, 'founder'
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

UPDATE public.profiles SET role = 'founder'
WHERE id IN (SELECT id FROM auth.users)
  AND role = 'client'
  AND created_at < now();

-- Funciones helper SECURITY DEFINER (evita recursion en policies)
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_founder()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (current_user_role() = 'founder');
$$;

CREATE OR REPLACE FUNCTION public.is_founder_or_operator()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (current_user_role() IN ('founder', 'operator'));
$$;

-- RLS profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_read_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "users_update_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "founders_read_all_profiles" ON public.profiles;
DROP POLICY IF EXISTS "founders_manage_profiles" ON public.profiles;
DROP POLICY IF EXISTS "founders_insert_profiles" ON public.profiles;

CREATE POLICY "users_read_own_profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "founders_read_all_profiles"
  ON public.profiles FOR SELECT
  USING (is_founder());

CREATE POLICY "users_update_own_profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "founders_manage_profiles"
  ON public.profiles FOR UPDATE
  USING (is_founder());

CREATE POLICY "founders_insert_profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (is_founder() OR auth.uid() = id);

-- audit_logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email   TEXT,
  user_role    user_role,
  action       TEXT NOT NULL,
  resource     TEXT NOT NULL,
  resource_id  TEXT,
  details      JSONB DEFAULT '{}'::jsonb,
  ip_address   INET,
  user_agent   TEXT,
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON public.audit_logs(resource, resource_id);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "founders_read_audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "anyone_insert_audit_logs" ON public.audit_logs;

CREATE POLICY "founders_read_audit_logs"
  ON public.audit_logs FOR SELECT
  USING (is_founder());

CREATE POLICY "anyone_insert_audit_logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- RLS projects: scoped por role
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_see_own_projects" ON public.projects;
DROP POLICY IF EXISTS "founders_see_all_projects" ON public.projects;
DROP POLICY IF EXISTS "operators_see_all_projects" ON public.projects;
DROP POLICY IF EXISTS "founders_manage_projects" ON public.projects;
DROP POLICY IF EXISTS "operators_update_projects" ON public.projects;
DROP POLICY IF EXISTS "users_insert_own_projects" ON public.projects;
DROP POLICY IF EXISTS "founders_operators_see_all_projects" ON public.projects;
DROP POLICY IF EXISTS "clients_see_own_projects" ON public.projects;
DROP POLICY IF EXISTS "founders_insert_projects" ON public.projects;

CREATE POLICY "founders_operators_see_all_projects"
  ON public.projects FOR SELECT
  USING (is_founder_or_operator());

CREATE POLICY "clients_see_own_projects"
  ON public.projects FOR SELECT
  USING (current_user_role() = 'client' AND user_id = auth.uid());

CREATE POLICY "founders_manage_projects"
  ON public.projects FOR ALL
  USING (is_founder())
  WITH CHECK (is_founder());

CREATE POLICY "operators_update_projects"
  ON public.projects FOR UPDATE
  USING (current_user_role() = 'operator')
  WITH CHECK (current_user_role() = 'operator');

CREATE POLICY "founders_insert_projects"
  ON public.projects FOR INSERT
  WITH CHECK (is_founder());
