-- Mig 008 — Fix: signup público fallaba con "Database error saving new user"
--
-- CAUSA: la Mig 003 agregó la tabla `user_capabilities` (RLS on, sin policy de
--   INSERT para usuarios normales ni GRANT para supabase_auth_admin) + el trigger
--   `trigger_init_capabilities` → `init_user_capabilities()` AFTER INSERT ON profiles.
--   Esa función quedó como SECURITY INVOKER. Al registrarse un usuario nuevo, el
--   trigger corre en el contexto de `supabase_auth_admin` (el rol que ejecuta
--   handle_new_user), que NO tiene bypass-RLS ni privilegio sobre la tabla nueva
--   → el INSERT a user_capabilities se rechaza → aborta TODO el signup.
--
-- FIX: la función pasa a SECURITY DEFINER con search_path fijo (mismo patrón que
--   handle_new_user). Así corre como su owner (postgres), que tiene privilegio y
--   bypass-RLS sobre user_capabilities. Además se agrega ELSE al CASE para que un
--   rol inesperado no deje max_concurrent_projects en NULL.
--
-- IDEMPOTENTE: CREATE OR REPLACE. No toca el trigger (sigue apuntando a la misma
--   función por nombre). Seguro de re-correr.

CREATE OR REPLACE FUNCTION init_user_capabilities()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO user_capabilities (
    user_id, can_create_project, can_create_preproject,
    can_transfer_project, can_archive_project, max_concurrent_projects
  ) VALUES (
    NEW.id,
    NEW.role IN ('dev', 'leader'),
    NEW.role IN ('comercial', 'leader'),
    NEW.role IN ('leader'),
    NEW.role IN ('leader'),
    CASE NEW.role
      WHEN 'leader' THEN 999
      WHEN 'dev' THEN 5
      WHEN 'comercial' THEN 20
      WHEN 'cliente' THEN 10
      ELSE 5
    END
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;
