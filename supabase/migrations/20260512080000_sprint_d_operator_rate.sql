-- Sprint D: hourly rate por operador + user_id en work_sessions
-- para calcular costo de labor (mano de obra) por proyecto.
--
-- Modelo:
--   profiles.hourly_rate_usd: tarifa que el founder configura por persona desde
--     /settings → Usuarios y Roles. NULL = no se computa labor para ese user.
--   work_sessions.user_id: quien hizo ese trabajo. Hoy NULL en filas existentes;
--     el Agent debe propagarlo en futuras escrituras (issue separada para Agent team).
--
-- Helper calc_labor_cost(project_id, [from, to]) suma duration × hourly_rate
-- por proyecto con filtro de fecha opcional. Solo cuenta filas con user_id != NULL.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS hourly_rate_usd numeric(10, 2);

ALTER TABLE public.work_sessions
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_work_sessions_user_id
  ON public.work_sessions(user_id);

CREATE OR REPLACE FUNCTION public.calc_labor_cost(
  p_project_id uuid,
  p_from timestamptz DEFAULT NULL,
  p_to   timestamptz DEFAULT NULL
)
RETURNS numeric
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(SUM(
    (ws.duration_minutes::numeric / 60) * COALESCE(p.hourly_rate_usd, 0)
  ), 0)
  FROM work_sessions ws
  LEFT JOIN profiles p ON p.id = ws.user_id
  WHERE ws.project_id = p_project_id
    AND (p_from IS NULL OR ws.ended_at >= p_from)
    AND (p_to   IS NULL OR ws.ended_at <  p_to)
    AND ws.user_id IS NOT NULL;
$$;
