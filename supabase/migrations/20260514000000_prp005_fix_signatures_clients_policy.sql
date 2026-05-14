-- Fix: la policy clients_read_signatures tenía un subquery inline a auth.users
-- que rompía cualquier INSERT a signatures con .select() (returning) por
-- "permission denied for table users". El rol authenticated no tiene grant
-- directo a auth.users. Solución: function SECURITY DEFINER que sí puede leer.

BEGIN;

CREATE OR REPLACE FUNCTION public.current_user_email()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth, pg_temp
AS $$
  SELECT email::text FROM auth.users WHERE id = auth.uid();
$$;

DROP POLICY IF EXISTS "clients_read_signatures" ON public.signatures;
CREATE POLICY "clients_read_signatures" ON public.signatures FOR SELECT
  USING (
    current_user_role() = 'client'::user_role
    AND signer_email = current_user_email()
  );

COMMIT;
