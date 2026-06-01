-- ============================================================================
-- Sprint A · Mig 001b — Backfill profiles + refactor helpers + tablas de acceso
-- ----------------------------------------------------------------------------
-- PRE: 001a ya commiteada (enum = {leader, dev, comercial, cliente}).
-- ============================================================================

-- 1.2 Backfill de roles (mapeo Riki 2026-05-30; email del dev SIN punto,
--     confirmado contra DB viva 2026-05-31).
--     Nota: el rename operator→dev ya dejó a los 2 operators como 'dev';
--     este UPDATE solo reclasifica a rmarchetti como comercial y fija leader.
UPDATE profiles SET role = 'leader'    WHERE email = 'ricardo@grupoits.com.ar';
UPDATE profiles SET role = 'dev'       WHERE email = 'nnrmits@gmail.com';
UPDATE profiles SET role = 'comercial' WHERE email = 'rmarchetti@grupoits.com.ar';

-- 1.3 Refactor de funciones helper.
--     Se usa ALTER FUNCTION ... RENAME (NO DROP) para PRESERVAR el OID:
--     18 policies en 16 tablas dependen de is_founder()/is_founder_or_operator().
--     Un DROP fallaría ("cannot drop because other objects depend on it").
--     El rename mantiene esas policies válidas; el CREATE OR REPLACE solo
--     actualiza el cuerpo (los literales 'founder'/'operator' en texto, que
--     tras 001a dejaron de existir, pasan a 'leader'/'dev').
ALTER FUNCTION public.is_founder() RENAME TO is_leader;
CREATE OR REPLACE FUNCTION public.is_leader()
  RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT (current_user_role() = 'leader');
$function$;

ALTER FUNCTION public.is_founder_or_operator() RENAME TO is_leader_or_dev;
CREATE OR REPLACE FUNCTION public.is_leader_or_dev()
  RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT (current_user_role() IN ('leader', 'dev'));
$function$;

-- current_user_role(), current_user_email(), is_active_user(), handle_new_user()
-- NO se tocan: no contienen literales de rol viejos (handle_new_user usa el
-- DEFAULT de la columna, que se auto-actualizó a 'cliente' por 001a).

-- 1.4 Index para filtros por rol
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- ----------------------------------------------------------------------------
-- Tabla nueva: asignaciones de proyectos a devs
-- ----------------------------------------------------------------------------
CREATE TABLE project_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_in_project TEXT NOT NULL CHECK (role_in_project IN ('lead_dev', 'dev', 'reviewer')),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES auth.users(id),
  UNIQUE(project_id, user_id)
);
CREATE INDEX idx_assignments_project ON project_assignments(project_id);
CREATE INDEX idx_assignments_user ON project_assignments(user_id);
ALTER TABLE project_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_see_own_assignments" ON project_assignments
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "leaders_see_all_assignments" ON project_assignments
  FOR SELECT USING (is_leader());
CREATE POLICY "leaders_manage_assignments" ON project_assignments
  FOR ALL USING (is_leader());

-- ----------------------------------------------------------------------------
-- Tabla nueva: relación cliente ↔ proyecto
-- ----------------------------------------------------------------------------
CREATE TABLE client_project_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  client_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  granted_by UUID REFERENCES auth.users(id),
  UNIQUE(project_id, client_user_id)
);
CREATE INDEX idx_client_access_project ON client_project_access(project_id);
CREATE INDEX idx_client_access_user ON client_project_access(client_user_id);
ALTER TABLE client_project_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clients_see_own_access" ON client_project_access
  FOR SELECT USING (client_user_id = auth.uid());
CREATE POLICY "leaders_manage_client_access" ON client_project_access
  FOR ALL USING (is_leader());

-- ----------------------------------------------------------------------------
-- Tracking de qué comercial vendió qué proyecto
-- ----------------------------------------------------------------------------
ALTER TABLE projects
  ADD COLUMN sold_by_user_id UUID REFERENCES auth.users(id),
  ADD COLUMN sold_at TIMESTAMPTZ;
CREATE INDEX idx_projects_sold_by ON projects(sold_by_user_id);
