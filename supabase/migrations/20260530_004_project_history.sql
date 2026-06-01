-- ============================================================================
-- Sprint A · Mig 004 — History: activity_log + summaries + handoff_notes + view
-- ----------------------------------------------------------------------------
-- Tablas nuevas (sin colisión de nombres de índice verificada).
-- project_handoff_notes combina §3.3 + §5.5 del spec (source/auto_text/dev_addition).
-- view project_contributors: p.role AS "current_role" entrecomillado (keyword reservado).
-- ============================================================================

-- 4.1 Activity log (append-only)
CREATE TABLE project_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_instance_id UUID REFERENCES agent_instances(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'session_started','session_ended','files_changed','commit_made',
    'branch_created','pull_done','push_done','ai_run','init_executed',
    'transfer_initiated','transfer_received','handoff_note_added','project_archived'
  )),
  event_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_activity_project_time ON project_activity_log(project_id, occurred_at DESC);
CREATE INDEX idx_activity_user_project ON project_activity_log(user_id, project_id, occurred_at DESC);
ALTER TABLE project_activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "see_activity_of_assigned_projects" ON project_activity_log
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM project_assignments WHERE project_id = project_activity_log.project_id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'leader')
  );
CREATE POLICY "no_update_activity" ON project_activity_log FOR UPDATE USING (FALSE);
CREATE POLICY "no_delete_activity" ON project_activity_log FOR DELETE USING (FALSE);

-- 4.2 Contributor summaries (IA)
CREATE TABLE contributor_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  summary_text TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('ai_auto','manual_handoff','ai_revised')),
  generated_by TEXT,
  cost_usd NUMERIC(10,4),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, user_id, period_start, period_end, source)
);
CREATE INDEX idx_summaries_project_user ON contributor_summaries(project_id, user_id, period_end DESC);
ALTER TABLE contributor_summaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "see_summaries_of_assigned_projects" ON contributor_summaries
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM project_assignments WHERE project_id = contributor_summaries.project_id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'leader')
  );

-- 4.3 Handoff notes (auto + dev) — combina §3.3 y §5.5
CREATE TABLE project_handoff_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note_text TEXT NOT NULL,
  context TEXT CHECK (context IN ('session_end','transfer','pause','archive')),
  source TEXT NOT NULL DEFAULT 'auto' CHECK (source IN ('auto','auto+dev','dev_only','system')),
  auto_text TEXT,
  dev_addition TEXT,
  cost_usd NUMERIC(10,4),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_handoff_project ON project_handoff_notes(project_id, created_at DESC);
ALTER TABLE project_handoff_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "see_handoff_of_assigned_projects" ON project_handoff_notes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM project_assignments WHERE project_id = project_handoff_notes.project_id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'leader')
  );
CREATE POLICY "users_create_own_handoffs" ON project_handoff_notes
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- 4.4 VIEW project_contributors (agrega assignments + sessions + transfers + activity)
CREATE OR REPLACE VIEW project_contributors AS
WITH all_intervenants AS (
  SELECT project_id, user_id, 'assignee' AS source, role_in_project AS role_played,
         assigned_at AS first_seen, assigned_at AS last_seen
  FROM project_assignments
  UNION
  SELECT project_id, user_id, 'session', 'worker',
         MIN(last_activity_at), MAX(last_activity_at)
  FROM project_active_sessions GROUP BY project_id, user_id
  UNION
  SELECT project_id, initiated_by, 'transfer_initiator', 'transfer_admin',
         MIN(initiated_at), MAX(initiated_at)
  FROM project_transfers GROUP BY project_id, initiated_by
  UNION
  SELECT project_id, user_id, 'activity', 'contributor',
         MIN(occurred_at), MAX(occurred_at)
  FROM project_activity_log GROUP BY project_id, user_id
)
SELECT
  ai.project_id,
  ai.user_id,
  p.full_name,
  p.email,
  p.role AS "current_role",
  p.status AS user_status,
  MIN(ai.first_seen) AS first_intervention,
  MAX(ai.last_seen) AS last_intervention,
  ARRAY_AGG(DISTINCT ai.role_played) AS roles_played,
  ARRAY_AGG(DISTINCT ai.source) AS sources,
  (SELECT COUNT(*) FROM project_activity_log al WHERE al.project_id=ai.project_id AND al.user_id=ai.user_id) AS total_activities,
  (SELECT COUNT(*) FROM project_activity_log al WHERE al.project_id=ai.project_id AND al.user_id=ai.user_id AND al.event_type='commit_made') AS total_commits,
  (SELECT summary_text FROM contributor_summaries cs WHERE cs.project_id=ai.project_id AND cs.user_id=ai.user_id ORDER BY cs.period_end DESC LIMIT 1) AS last_summary,
  (SELECT period_end FROM contributor_summaries cs WHERE cs.project_id=ai.project_id AND cs.user_id=ai.user_id ORDER BY cs.period_end DESC LIMIT 1) AS last_summary_date,
  EXISTS (SELECT 1 FROM project_assignments pa WHERE pa.project_id=ai.project_id AND pa.user_id=ai.user_id) AS is_currently_assigned
FROM all_intervenants ai
JOIN profiles p ON p.id = ai.user_id
GROUP BY ai.project_id, ai.user_id, p.full_name, p.email, p.role, p.status;
