-- ============================================================================
-- Sprint A · Mig 003 — Ownership + agent_instances (ALTER) + sessions + caps + transfers
-- ----------------------------------------------------------------------------
-- ⚠️ CROSS-REPO: agent_instances ya existe del Agent v1 (5 rows). ALTER aditivo.
-- 🛑 NO APLICAR sin OK de NEXO. 4 conflictos detectados vs el spec — ver abajo.
-- ============================================================================

-- 3.1 Owner explícito en projects (backfill desde user_id; 0 nulls verificado)
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES auth.users(id) ON DELETE RESTRICT;
UPDATE projects SET owner_user_id = user_id WHERE owner_user_id IS NULL AND user_id IS NOT NULL;
ALTER TABLE projects ALTER COLUMN owner_user_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner_user_id);

-- 3.1.b lifecycle_status como enum nuevo (status TEXT viejo coexiste)
CREATE TYPE project_lifecycle_status AS ENUM (
  'preproject', 'active', 'paused', 'completed', 'archived'
);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS lifecycle_status project_lifecycle_status;
UPDATE projects SET lifecycle_status =
  CASE status
    WHEN 'active' THEN 'active'::project_lifecycle_status
    WHEN 'archived' THEN 'archived'::project_lifecycle_status
    WHEN 'paused' THEN 'paused'::project_lifecycle_status
    ELSE 'active'::project_lifecycle_status
  END
WHERE lifecycle_status IS NULL;
ALTER TABLE projects
  ALTER COLUMN lifecycle_status SET NOT NULL,
  ALTER COLUMN lifecycle_status SET DEFAULT 'active';

-- ⚠️ CONFLICTO #2 (RESUELTO): el spec §3.5 hace
--    `ALTER TYPE project_lifecycle_status ADD VALUE 'preproject' BEFORE 'active';`
--    pero 'preproject' YA está en el CREATE TYPE de arriba → ese ADD VALUE es
--    redundante y FALLA ("enum label already exists"). OMITIDO.

-- 3.2 agent_instances — ALTER aditivo (Agent v1, 5 rows)
ALTER TABLE agent_instances ADD COLUMN IF NOT EXISTS hostname TEXT;
ALTER TABLE agent_instances ADD COLUMN IF NOT EXISTS os_version TEXT;
ALTER TABLE agent_instances ADD COLUMN IF NOT EXISTS first_seen_at TIMESTAMPTZ;
ALTER TABLE agent_instances ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

UPDATE agent_instances SET
  hostname = COALESCE(hostname, machine_id, machine_name),
  os_version = COALESCE(os_version, os_type),
  first_seen_at = COALESCE(first_seen_at, last_heartbeat, created_at),
  last_seen_at = COALESCE(last_seen_at, last_heartbeat, created_at);

ALTER TABLE agent_instances ALTER COLUMN hostname SET NOT NULL;
ALTER TABLE agent_instances ALTER COLUMN last_seen_at SET NOT NULL;

-- status: 'active' → 'online'
UPDATE agent_instances SET status = 'online' WHERE status = 'active';
ALTER TABLE agent_instances DROP CONSTRAINT IF EXISTS agent_instances_status_check;
ALTER TABLE agent_instances ADD CONSTRAINT agent_instances_status_check
  CHECK (status IN ('online', 'offline', 'inactive'));

-- ⚠️⚠️ CONFLICTO #1 (REQUIERE DECISIÓN NEXO — CROSS-REPO) ⚠️⚠️
-- El spec agrega UNIQUE(user_id, machine_name), PERO hay un DUPLICADO en prod:
--   user 2c062cfb (ricardo/leader) tiene 2 agent_instances con
--   machine_name='MB-Air-NNRM-2025.local' (distinto machine_id) → el UNIQUE FALLA.
-- Hoy ya existe UNIQUE(user_id, machine_id) = agent_instances_user_id_machine_id_key.
--
-- OPCIÓN A (dedup, propuesta — toca data del Agent v1, requiere OK):
--   DELETE FROM agent_instances a USING agent_instances b
--   WHERE a.user_id=b.user_id AND a.machine_name=b.machine_name AND a.id<>b.id
--     AND (a.last_heartbeat IS NULL OR a.last_heartbeat < b.last_heartbeat
--          OR (a.last_heartbeat = b.last_heartbeat AND a.id < b.id));
--   ALTER TABLE agent_instances ADD CONSTRAINT uq_user_machine_name UNIQUE (user_id, machine_name);
--   -- ⇒ quedarían 4 rows (no 5). Ajustar verify 9.7.a.
-- OPCIÓN B: NO agregar el unique ahora; mantener UNIQUE(user_id, machine_id) hasta Sprint D.
--   (el Agent v2 debería hacer upsert on (user_id, machine_id) en vez de machine_name)
--
-- DEJADO SIN APLICAR hasta tu decisión. El UNIQUE va comentado:
-- ALTER TABLE agent_instances ADD CONSTRAINT uq_user_machine_name UNIQUE (user_id, machine_name);

CREATE INDEX IF NOT EXISTS idx_agent_instances_user ON agent_instances(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_instances_status ON agent_instances(status);

-- ⚠️ CONFLICTO #4 (RESUELTO): agent_instances YA tiene RLS habilitado + 4 policies
--    (Users manage own agents / founders_manage / founders_operators_see_all /
--     users_see_own). Las del spec ("users_own_agents", "leaders_see_all_agents")
--    son REDUNDANTES con las existentes → OMITIDAS para no duplicar.
--    (Las viejas ya usan is_leader() tras mig 001b.)

-- 3.3 project_active_sessions (tabla nueva)
CREATE TABLE project_active_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  agent_instance_id UUID NOT NULL REFERENCES agent_instances(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  local_path TEXT NOT NULL,
  local_sf_version TEXT,
  git_branch TEXT,
  git_head_sha TEXT,
  git_dirty BOOLEAN DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'synced'
    CHECK (status IN ('editing', 'synced', 'stale', 'conflict')),
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, agent_instance_id)
);
CREATE INDEX idx_sessions_project ON project_active_sessions(project_id, status);
CREATE INDEX idx_sessions_agent ON project_active_sessions(agent_instance_id);
CREATE UNIQUE INDEX idx_one_editor_per_project
  ON project_active_sessions(project_id) WHERE status = 'editing';
ALTER TABLE project_active_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_see_sessions_of_assigned_projects" ON project_active_sessions
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM project_assignments
      WHERE project_id = project_active_sessions.project_id AND user_id = auth.uid()
    )
  );

-- 3.4 user_capabilities + trigger
CREATE TABLE user_capabilities (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  can_create_project BOOLEAN DEFAULT TRUE,
  can_create_preproject BOOLEAN DEFAULT FALSE,
  can_transfer_project BOOLEAN DEFAULT FALSE,
  can_archive_project BOOLEAN DEFAULT FALSE,
  can_access_vault BOOLEAN DEFAULT TRUE,
  max_concurrent_projects INTEGER DEFAULT 5,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION init_user_capabilities()
RETURNS TRIGGER AS $$
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
    END
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_init_capabilities
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION init_user_capabilities();

-- ⚠️ CONFLICTO #3 (RESUELTO): el trigger solo cubre profiles FUTUROS. Los 3
--    profiles existentes no tendrían fila → verify 9.7.d daría 0, no 3.
--    Backfill explícito de los existentes:
INSERT INTO user_capabilities (
  user_id, can_create_project, can_create_preproject,
  can_transfer_project, can_archive_project, max_concurrent_projects
)
SELECT p.id,
  p.role IN ('dev','leader'),
  p.role IN ('comercial','leader'),
  p.role IN ('leader'),
  p.role IN ('leader'),
  CASE p.role WHEN 'leader' THEN 999 WHEN 'dev' THEN 5 WHEN 'comercial' THEN 20 WHEN 'cliente' THEN 10 END
FROM profiles p
ON CONFLICT (user_id) DO NOTHING;

ALTER TABLE user_capabilities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_see_own_capabilities" ON user_capabilities
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "leaders_manage_capabilities" ON user_capabilities
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'leader')
  );

-- 3.6 project_transfers
CREATE TABLE project_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  from_user_id UUID REFERENCES auth.users(id),
  to_user_id UUID NOT NULL REFERENCES auth.users(id),
  initiated_by UUID NOT NULL REFERENCES auth.users(id),
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled', 'expired')),
  initiated_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '48 hours'),
  metadata JSONB DEFAULT '{}'::jsonb
);
CREATE INDEX idx_transfers_to_user ON project_transfers(to_user_id, status);
CREATE INDEX idx_transfers_project ON project_transfers(project_id);
ALTER TABLE project_transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "involved_parties_see_transfers" ON project_transfers
  FOR SELECT USING (
    from_user_id = auth.uid()
    OR to_user_id = auth.uid()
    OR initiated_by = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'leader')
  );
