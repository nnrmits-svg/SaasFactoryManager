-- Sprint B.2: rate_limits + user_sessions
--
-- rate_limits: ventana deslizante de N minutos, contador por (identifier, action).
--   Identifier = user_id si autenticado, IP si no.
--   Uso: SELECT check_rate_limit('user-uuid', 'login', 5, 15) → false si supera.
--
-- user_sessions: tracking de dispositivos activos, expiracion 30 dias.
--   Permite al usuario ver/revocar sus sesiones desde /settings.

CREATE TABLE IF NOT EXISTS public.rate_limits (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier   TEXT NOT NULL,
  action       TEXT NOT NULL,
  count        INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup
  ON public.rate_limits(identifier, action, window_start DESC);

CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_identifier TEXT,
  p_action TEXT,
  p_max_requests INTEGER DEFAULT 100,
  p_window_minutes INTEGER DEFAULT 15
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
  v_window_start TIMESTAMPTZ;
BEGIN
  v_window_start := now() - (p_window_minutes || ' minutes')::INTERVAL;

  SELECT COALESCE(SUM(count), 0) INTO v_count
  FROM rate_limits
  WHERE identifier = p_identifier
    AND action = p_action
    AND window_start >= v_window_start;

  IF v_count >= p_max_requests THEN
    RETURN FALSE;
  END IF;

  INSERT INTO rate_limits (identifier, action, count, window_start)
  VALUES (p_identifier, p_action, 1, now());

  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM rate_limits WHERE window_start < now() - INTERVAL '1 hour';
END;
$$;

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "founders_read_rate_limits" ON public.rate_limits;
CREATE POLICY "founders_read_rate_limits"
  ON public.rate_limits FOR SELECT USING (is_founder());

CREATE TABLE IF NOT EXISTS public.user_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_info     JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address      INET,
  user_agent      TEXT,
  last_active_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 days')
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON public.user_sessions(expires_at);

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_read_own_sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "users_delete_own_sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "users_insert_own_sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "users_update_own_sessions" ON public.user_sessions;

CREATE POLICY "users_read_own_sessions"
  ON public.user_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users_delete_own_sessions"
  ON public.user_sessions FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "users_insert_own_sessions"
  ON public.user_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users_update_own_sessions"
  ON public.user_sessions FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM user_sessions WHERE expires_at < now();
END;
$$;
