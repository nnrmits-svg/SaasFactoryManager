-- ============================================================================
-- Sprint A · Mig 005 — Project types & stacks + templates + get_type_defaults
-- ----------------------------------------------------------------------------
-- Sin conflicts (enum/tabla/función/columnas no existen). projects.project_type
-- queda DEFAULT 'saas_full' hasta que el Agent v2 reporte el real (task #80).
-- ============================================================================

CREATE TYPE project_type AS ENUM (
  'saas_full', 'web_app_simple', 'internal_tool', 'mobile_app', 'api_only',
  'cli_tool', 'library', 'landing_static', 'marketing_site', 'prototype', 'other'
);

ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_type project_type NOT NULL DEFAULT 'saas_full';
CREATE INDEX IF NOT EXISTS idx_projects_type ON projects(project_type);

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS has_database BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS has_auth BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS is_multi_tenant BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS deploys_to TEXT[] DEFAULT ARRAY['vercel']
    CHECK (deploys_to <@ ARRAY['vercel','npm','app_store','play_store','self_hosted','docker','none']),
  ADD COLUMN IF NOT EXISTS runtime_stack TEXT[] DEFAULT ARRAY['nextjs','react','typescript'];

CREATE TABLE project_templates (
  id TEXT PRIMARY KEY,
  project_type project_type NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  source_repo TEXT NOT NULL,
  source_path TEXT,
  default_branch TEXT DEFAULT 'main',
  init_steps JSONB NOT NULL,
  estimated_hours_min INTEGER,
  estimated_hours_max INTEGER,
  complexity_multiplier NUMERIC(3,2) DEFAULT 1.0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO project_templates (id, project_type, name, source_repo, init_steps, complexity_multiplier) VALUES
  ('saas-nextjs-supabase', 'saas_full', 'SaaS Next.js + Supabase (Golden Path)',
   'github.com/nnrmits-svg/kit-comercial',
   '["create_folder","copy_template","git_init","supabase_init","apply_migrations","setup_env_local","setup_mcp_json","gh_repo_create","initial_commit","vercel_link"]'::jsonb, 1.0),
  ('landing-nextjs-static', 'landing_static', 'Landing Next.js static export',
   'github.com/nnrmits-svg/template-landing',
   '["create_folder","copy_template","git_init","setup_env_local_minimal","gh_repo_create","initial_commit","vercel_link"]'::jsonb, 0.3),
  ('cli-node-typescript', 'cli_tool', 'CLI Node TS',
   'github.com/nnrmits-svg/template-cli',
   '["create_folder","copy_template","git_init","setup_npm_publish_config","gh_repo_create","initial_commit"]'::jsonb, 0.5),
  ('library-npm', 'library', 'npm library TS',
   'github.com/nnrmits-svg/template-lib',
   '["create_folder","copy_template","git_init","setup_npm_publish_config","setup_tsup","gh_repo_create","initial_commit"]'::jsonb, 0.4),
  ('marketing-nextjs-mdx', 'marketing_site', 'Marketing site Next.js + MDX',
   'github.com/nnrmits-svg/template-marketing',
   '["create_folder","copy_template","git_init","setup_contentlayer","gh_repo_create","initial_commit","vercel_link"]'::jsonb, 0.6),
  ('api-only-hono', 'api_only', 'API Hono + Supabase',
   'github.com/nnrmits-svg/template-api',
   '["create_folder","copy_template","git_init","supabase_init","apply_migrations","setup_env_local","gh_repo_create","initial_commit","vercel_link"]'::jsonb, 0.7),
  ('mobile-rn-expo', 'mobile_app', 'React Native + Expo',
   'github.com/nnrmits-svg/template-mobile',
   '["create_folder","copy_template","git_init","setup_expo","setup_eas","gh_repo_create","initial_commit"]'::jsonb, 1.5),
  ('prototype-bare', 'prototype', 'Prototype bare (Next.js mínimo)',
   'github.com/nnrmits-svg/template-prototype',
   '["create_folder","copy_template","git_init","initial_commit"]'::jsonb, 0.2);

CREATE OR REPLACE FUNCTION get_type_defaults(p_type project_type)
RETURNS TABLE (
  has_database BOOLEAN, has_auth BOOLEAN, is_multi_tenant BOOLEAN,
  deploys_to TEXT[], needs_vault_backup BOOLEAN, visible_to_client BOOLEAN
) AS $$
BEGIN
  RETURN QUERY SELECT
    CASE p_type WHEN 'saas_full' THEN TRUE WHEN 'web_app_simple' THEN TRUE WHEN 'internal_tool' THEN TRUE WHEN 'api_only' THEN TRUE WHEN 'mobile_app' THEN TRUE ELSE FALSE END,
    CASE p_type WHEN 'saas_full' THEN TRUE WHEN 'internal_tool' THEN TRUE WHEN 'mobile_app' THEN TRUE ELSE FALSE END,
    CASE p_type WHEN 'saas_full' THEN TRUE ELSE FALSE END,
    CASE p_type WHEN 'cli_tool' THEN ARRAY['npm'] WHEN 'library' THEN ARRAY['npm'] WHEN 'mobile_app' THEN ARRAY['app_store','play_store'] WHEN 'api_only' THEN ARRAY['vercel'] WHEN 'prototype' THEN ARRAY['none'] ELSE ARRAY['vercel'] END,
    CASE p_type WHEN 'saas_full' THEN TRUE WHEN 'internal_tool' THEN TRUE WHEN 'api_only' THEN TRUE WHEN 'mobile_app' THEN TRUE WHEN 'marketing_site' THEN TRUE ELSE FALSE END,
    CASE p_type WHEN 'saas_full' THEN TRUE WHEN 'web_app_simple' THEN TRUE WHEN 'landing_static' THEN TRUE WHEN 'marketing_site' THEN TRUE WHEN 'mobile_app' THEN TRUE ELSE FALSE END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
