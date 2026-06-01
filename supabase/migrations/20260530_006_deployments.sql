-- ============================================================================
-- Sprint A · Mig 006 — Deployment links & previews (Vercel) + RLS
-- ----------------------------------------------------------------------------
-- Sin conflicts (tablas/índices no existen). Vercel token NO va acá (safeStorage Agent).
-- ============================================================================

CREATE TABLE project_deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'vercel'
    CHECK (provider IN ('vercel','netlify','cloudflare_pages','render','self_hosted')),
  external_project_id TEXT NOT NULL,
  external_team_id TEXT,
  production_url TEXT,
  vercel_dashboard_url TEXT,
  demo_url TEXT,
  demo_password TEXT,
  last_deployment_id TEXT,
  last_deployment_status TEXT
    CHECK (last_deployment_status IN ('ready','building','queued','error','canceled')),
  last_deployment_branch TEXT,
  last_deployment_commit_sha TEXT,
  last_deployment_at TIMESTAMPTZ,
  last_checked_at TIMESTAMPTZ DEFAULT NOW(),
  client_can_access BOOLEAN DEFAULT FALSE,
  client_access_granted_at TIMESTAMPTZ,
  client_access_granted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, provider)
);
CREATE INDEX idx_deployments_project ON project_deployments(project_id);
CREATE INDEX idx_deployments_status ON project_deployments(last_deployment_status);
ALTER TABLE project_deployments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team_sees_deployments" ON project_deployments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM project_assignments WHERE project_id = project_deployments.project_id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'leader')
  );
CREATE POLICY "client_sees_authorized_deployments" ON project_deployments
  FOR SELECT USING (
    client_can_access = TRUE
    AND EXISTS (SELECT 1 FROM client_project_access WHERE project_id = project_deployments.project_id AND client_user_id = auth.uid())
  );
CREATE POLICY "leaders_manage_client_access" ON project_deployments
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'leader')
    OR EXISTS (SELECT 1 FROM project_assignments WHERE project_id = project_deployments.project_id AND user_id = auth.uid() AND role_in_project = 'lead_dev')
  );

CREATE TABLE project_deployment_previews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  deployment_id TEXT NOT NULL,
  branch TEXT NOT NULL,
  commit_sha TEXT NOT NULL,
  preview_url TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ,
  UNIQUE(project_id, deployment_id)
);
CREATE INDEX idx_previews_project_branch ON project_deployment_previews(project_id, branch);
ALTER TABLE project_deployment_previews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team_sees_previews" ON project_deployment_previews
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM project_assignments WHERE project_id = project_deployment_previews.project_id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'leader')
  );
