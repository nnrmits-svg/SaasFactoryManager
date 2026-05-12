-- Sprint B.4: user_status para ABM completo del lado founder
--
-- Estados:
--   active    — usuario operativo (default)
--   suspended — bloqueado por founder (mantiene cuenta, no puede entrar)
--   pending   — invitado pero no acepto / no setea contraseña todavía

DO $$ BEGIN
  CREATE TYPE user_status AS ENUM ('active', 'suspended', 'pending');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS status user_status NOT NULL DEFAULT 'active';

CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT (SELECT status FROM public.profiles WHERE id = auth.uid()) = 'active'
$$;
