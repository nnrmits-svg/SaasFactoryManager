-- Sprint B.2: RLS profunda en tablas relacionadas — scope por client.
--
-- Helper owns_project(uuid): true si el usuario es dueño del proyecto dado.
-- Patron por tabla: founders/operators ven todo, clients ven solo lo que
-- pertenece a sus proyectos. CRUD de mutacion casi siempre solo founder.

CREATE OR REPLACE FUNCTION public.owns_project(p_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = p_id AND user_id = auth.uid()
  );
$$;

-- project_skills
ALTER TABLE public.project_skills ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "founders_operators_see_all_project_skills" ON public.project_skills;
DROP POLICY IF EXISTS "clients_see_own_project_skills" ON public.project_skills;
DROP POLICY IF EXISTS "founders_manage_project_skills" ON public.project_skills;
DROP POLICY IF EXISTS "operators_update_project_skills" ON public.project_skills;
DROP POLICY IF EXISTS "anyone_authenticated_insert_project_skills" ON public.project_skills;

CREATE POLICY "founders_operators_see_all_project_skills"
  ON public.project_skills FOR SELECT USING (is_founder_or_operator());
CREATE POLICY "clients_see_own_project_skills"
  ON public.project_skills FOR SELECT
  USING (current_user_role() = 'client' AND owns_project(project_id));
CREATE POLICY "founders_manage_project_skills"
  ON public.project_skills FOR ALL
  USING (is_founder()) WITH CHECK (is_founder());
CREATE POLICY "operators_update_project_skills"
  ON public.project_skills FOR UPDATE
  USING (current_user_role() = 'operator')
  WITH CHECK (current_user_role() = 'operator');
CREATE POLICY "anyone_authenticated_insert_project_skills"
  ON public.project_skills FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- work_sessions
ALTER TABLE public.work_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "founders_operators_see_all_work_sessions" ON public.work_sessions;
DROP POLICY IF EXISTS "clients_see_own_work_sessions" ON public.work_sessions;
DROP POLICY IF EXISTS "founders_manage_work_sessions" ON public.work_sessions;

CREATE POLICY "founders_operators_see_all_work_sessions"
  ON public.work_sessions FOR SELECT USING (is_founder_or_operator());
CREATE POLICY "clients_see_own_work_sessions"
  ON public.work_sessions FOR SELECT
  USING (current_user_role() = 'client' AND owns_project(project_id));
CREATE POLICY "founders_manage_work_sessions"
  ON public.work_sessions FOR ALL
  USING (is_founder()) WITH CHECK (is_founder());

-- claude_sessions
ALTER TABLE public.claude_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "founders_operators_see_all_claude_sessions" ON public.claude_sessions;
DROP POLICY IF EXISTS "users_see_own_claude_sessions" ON public.claude_sessions;
DROP POLICY IF EXISTS "founders_manage_claude_sessions" ON public.claude_sessions;

CREATE POLICY "founders_operators_see_all_claude_sessions"
  ON public.claude_sessions FOR SELECT USING (is_founder_or_operator());
CREATE POLICY "users_see_own_claude_sessions"
  ON public.claude_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "founders_manage_claude_sessions"
  ON public.claude_sessions FOR ALL
  USING (is_founder()) WITH CHECK (is_founder());

-- tracking_sessions
ALTER TABLE public.tracking_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "founders_operators_see_all_tracking_sessions" ON public.tracking_sessions;
DROP POLICY IF EXISTS "clients_see_own_tracking_sessions" ON public.tracking_sessions;
DROP POLICY IF EXISTS "founders_manage_tracking_sessions" ON public.tracking_sessions;

CREATE POLICY "founders_operators_see_all_tracking_sessions"
  ON public.tracking_sessions FOR SELECT USING (is_founder_or_operator());
CREATE POLICY "clients_see_own_tracking_sessions"
  ON public.tracking_sessions FOR SELECT
  USING (current_user_role() = 'client' AND owns_project(project_id));
CREATE POLICY "founders_manage_tracking_sessions"
  ON public.tracking_sessions FOR ALL
  USING (is_founder()) WITH CHECK (is_founder());

-- commits
ALTER TABLE public.commits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "founders_operators_see_all_commits" ON public.commits;
DROP POLICY IF EXISTS "clients_see_own_commits" ON public.commits;
DROP POLICY IF EXISTS "founders_manage_commits" ON public.commits;

CREATE POLICY "founders_operators_see_all_commits"
  ON public.commits FOR SELECT USING (is_founder_or_operator());
CREATE POLICY "clients_see_own_commits"
  ON public.commits FOR SELECT
  USING (current_user_role() = 'client' AND owns_project(project_id));
CREATE POLICY "founders_manage_commits"
  ON public.commits FOR ALL
  USING (is_founder()) WITH CHECK (is_founder());

-- agent_commands
ALTER TABLE public.agent_commands ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "founders_operators_see_all_agent_commands" ON public.agent_commands;
DROP POLICY IF EXISTS "users_see_own_agent_commands" ON public.agent_commands;
DROP POLICY IF EXISTS "founders_manage_agent_commands" ON public.agent_commands;

CREATE POLICY "founders_operators_see_all_agent_commands"
  ON public.agent_commands FOR SELECT USING (is_founder_or_operator());
CREATE POLICY "users_see_own_agent_commands"
  ON public.agent_commands FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "founders_manage_agent_commands"
  ON public.agent_commands FOR ALL
  USING (is_founder()) WITH CHECK (is_founder());

-- agent_instances
ALTER TABLE public.agent_instances ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "founders_operators_see_all_agent_instances" ON public.agent_instances;
DROP POLICY IF EXISTS "users_see_own_agent_instances" ON public.agent_instances;
DROP POLICY IF EXISTS "founders_manage_agent_instances" ON public.agent_instances;

CREATE POLICY "founders_operators_see_all_agent_instances"
  ON public.agent_instances FOR SELECT USING (is_founder_or_operator());
CREATE POLICY "users_see_own_agent_instances"
  ON public.agent_instances FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "founders_manage_agent_instances"
  ON public.agent_instances FOR ALL
  USING (is_founder()) WITH CHECK (is_founder());
