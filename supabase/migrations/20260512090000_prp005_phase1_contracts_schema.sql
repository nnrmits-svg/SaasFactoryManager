-- PRP-005 Fase 1: Schema completo de cotizacion + SOW + NDA + firma + versionado
-- Aplicar en proyecto Supabase SaasFactoryManager (ref: fxlvexilnrfkkcbzwskr)
-- Idempotente. Sigue el patron RLS existente: founders ALL, operators rw, clients read-own.

BEGIN;

-- ============================================================
-- 1) ENUMS
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'quote_status') THEN
    CREATE TYPE public.quote_status AS ENUM ('draft','sent','approved','rejected','superseded');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sow_status') THEN
    CREATE TYPE public.sow_status AS ENUM ('draft','sent','signed','rejected','superseded');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'nda_status') THEN
    CREATE TYPE public.nda_status AS ENUM ('draft','sent','signed','rejected');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'amendment_status') THEN
    CREATE TYPE public.amendment_status AS ENUM ('draft','sent','approved','rejected');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'line_item_type') THEN
    CREATE TYPE public.line_item_type AS ENUM ('ai_tokens','labor','fixed_cost','overhead','profit');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'signature_provider') THEN
    CREATE TYPE public.signature_provider AS ENUM ('local','docusign','upload');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'document_type') THEN
    CREATE TYPE public.document_type AS ENUM ('quote','sow','nda','amendment');
  END IF;
END $$;

-- ============================================================
-- 2) SEQUENCE para project_number
-- ============================================================
CREATE SEQUENCE IF NOT EXISTS public.projects_number_seq START 1000;

-- ============================================================
-- 3) ALTER projects: agregar columnas
-- ============================================================
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS project_number int,
  ADD COLUMN IF NOT EXISTS client_id uuid,
  ADD COLUMN IF NOT EXISTS estimated_ai_cost_usd numeric(12,2),
  ADD COLUMN IF NOT EXISTS estimated_labor_cost_usd numeric(12,2),
  ADD COLUMN IF NOT EXISTS estimated_fixed_cost_usd numeric(12,2),
  ADD COLUMN IF NOT EXISTS estimated_total_usd numeric(12,2),
  ADD COLUMN IF NOT EXISTS actual_ai_cost_usd numeric(12,2),
  ADD COLUMN IF NOT EXISTS actual_labor_cost_usd numeric(12,2),
  ADD COLUMN IF NOT EXISTS actual_fixed_cost_usd numeric(12,2),
  ADD COLUMN IF NOT EXISTS actual_total_usd numeric(12,2);

-- Trigger para auto-asignar project_number
CREATE OR REPLACE FUNCTION public.tg_projects_set_number()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.project_number IS NULL THEN
    NEW.project_number := nextval('public.projects_number_seq');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS projects_set_number ON public.projects;
CREATE TRIGGER projects_set_number
  BEFORE INSERT ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.tg_projects_set_number();

-- Backfill projects existentes sin project_number
UPDATE public.projects
SET project_number = nextval('public.projects_number_seq')
WHERE project_number IS NULL;

-- UNIQUE constraint en project_number (post-backfill)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'projects_project_number_unique'
  ) THEN
    ALTER TABLE public.projects ADD CONSTRAINT projects_project_number_unique UNIQUE (project_number);
  END IF;
END $$;

-- ============================================================
-- 4) FUNCION HELPER: format_quote_number(int, int) -> 'SF-1042-01'
-- ============================================================
CREATE OR REPLACE FUNCTION public.format_quote_number(p_project_number int, p_version int)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT 'SF-' || p_project_number::text || '-' || lpad(p_version::text, 2, '0');
$$;

-- ============================================================
-- 5) FUNCION HELPER: is_my_project (cliente puede leer rows de SU proyecto)
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_my_project(p_project_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects WHERE id = p_project_id AND user_id = auth.uid()
  );
$$;

-- ============================================================
-- 6) TABLA: clients (debe crearse antes del FK projects.client_id)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  tax_id text,
  country text DEFAULT 'AR',
  primary_contact_name text,
  primary_contact_email text,
  primary_contact_phone text,
  address text,
  is_new boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clients_email ON public.clients(primary_contact_email);

-- FK projects.client_id -> clients.id (despues de crear clients)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'projects_client_id_fkey'
  ) THEN
    ALTER TABLE public.projects
      ADD CONSTRAINT projects_client_id_fkey
      FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================
-- 7) TABLA: quotes
-- ============================================================
CREATE TABLE IF NOT EXISTS public.quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  version int NOT NULL DEFAULT 1,
  status quote_status NOT NULL DEFAULT 'draft',
  total_usd numeric(12,2) NOT NULL DEFAULT 0,
  profit_margin_pct numeric(5,2) DEFAULT 0,
  notes text,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  approved_at timestamptz,
  rejected_at timestamptz,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, version)
);

CREATE INDEX IF NOT EXISTS idx_quotes_project ON public.quotes(project_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON public.quotes(status);

-- ============================================================
-- 8) TABLA: quote_line_items
-- ============================================================
CREATE TABLE IF NOT EXISTS public.quote_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  type line_item_type NOT NULL,
  label text NOT NULL,
  qty numeric(12,4) NOT NULL DEFAULT 1,
  unit_price_usd numeric(12,4) NOT NULL DEFAULT 0,
  total_usd numeric(12,2) NOT NULL DEFAULT 0,
  recurrence_months int DEFAULT 1,
  metadata jsonb DEFAULT '{}'::jsonb,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quote_line_items_quote ON public.quote_line_items(quote_id);

-- ============================================================
-- 9) TABLA: sows
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  version int NOT NULL DEFAULT 1,
  status sow_status NOT NULL DEFAULT 'draft',
  content_md text,
  signed_pdf_path text,
  signed_at timestamptz,
  rejected_at timestamptz,
  rejection_reason text,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, version)
);

CREATE INDEX IF NOT EXISTS idx_sows_project ON public.sows(project_id);
CREATE INDEX IF NOT EXISTS idx_sows_quote ON public.sows(quote_id);

-- ============================================================
-- 10) TABLA: ndas
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ndas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  version int NOT NULL DEFAULT 1,
  status nda_status NOT NULL DEFAULT 'draft',
  content_md text,
  signed_pdf_path text,
  signed_at timestamptz,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, version)
);

CREATE INDEX IF NOT EXISTS idx_ndas_project ON public.ndas(project_id);
CREATE INDEX IF NOT EXISTS idx_ndas_client ON public.ndas(client_id);

-- ============================================================
-- 11) TABLA: amendments
-- ============================================================
CREATE TABLE IF NOT EXISTS public.amendments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  amendment_number int NOT NULL,
  reason text NOT NULL,
  status amendment_status NOT NULL DEFAULT 'draft',
  parent_quote_id uuid REFERENCES public.quotes(id) ON DELETE SET NULL,
  child_quote_id uuid REFERENCES public.quotes(id) ON DELETE SET NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, amendment_number)
);

CREATE INDEX IF NOT EXISTS idx_amendments_project ON public.amendments(project_id);

-- ============================================================
-- 12) TABLA: signatures (polimorfica via document_type + document_id)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type document_type NOT NULL,
  document_id uuid NOT NULL,
  provider signature_provider NOT NULL,
  signer_name text NOT NULL,
  signer_email text NOT NULL,
  signature_hash text NOT NULL,
  signature_png_path text,
  ip_address inet,
  user_agent text,
  external_envelope_id text,
  uploaded_pdf_path text,
  signed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_signatures_document ON public.signatures(document_type, document_id);
CREATE INDEX IF NOT EXISTS idx_signatures_signer ON public.signatures(signer_email);

-- ============================================================
-- 13) TRIGGER updated_at compartido
-- ============================================================
CREATE OR REPLACE FUNCTION public.tg_contracts_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS clients_set_updated_at ON public.clients;
CREATE TRIGGER clients_set_updated_at BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.tg_contracts_set_updated_at();

DROP TRIGGER IF EXISTS quotes_set_updated_at ON public.quotes;
CREATE TRIGGER quotes_set_updated_at BEFORE UPDATE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.tg_contracts_set_updated_at();

DROP TRIGGER IF EXISTS sows_set_updated_at ON public.sows;
CREATE TRIGGER sows_set_updated_at BEFORE UPDATE ON public.sows
  FOR EACH ROW EXECUTE FUNCTION public.tg_contracts_set_updated_at();

DROP TRIGGER IF EXISTS ndas_set_updated_at ON public.ndas;
CREATE TRIGGER ndas_set_updated_at BEFORE UPDATE ON public.ndas
  FOR EACH ROW EXECUTE FUNCTION public.tg_contracts_set_updated_at();

DROP TRIGGER IF EXISTS amendments_set_updated_at ON public.amendments;
CREATE TRIGGER amendments_set_updated_at BEFORE UPDATE ON public.amendments
  FOR EACH ROW EXECUTE FUNCTION public.tg_contracts_set_updated_at();

-- ============================================================
-- 14) RLS - Patron: founders ALL · operators rw · clients read-own
-- ============================================================

-- clients
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "founders_all_clients" ON public.clients;
CREATE POLICY "founders_all_clients" ON public.clients
  USING (is_founder()) WITH CHECK (is_founder());

DROP POLICY IF EXISTS "operators_rw_clients" ON public.clients;
CREATE POLICY "operators_rw_clients" ON public.clients
  USING (current_user_role() = 'operator'::user_role)
  WITH CHECK (current_user_role() = 'operator'::user_role);

DROP POLICY IF EXISTS "clients_read_own_via_projects" ON public.clients;
CREATE POLICY "clients_read_own_via_projects" ON public.clients FOR SELECT
  USING (
    current_user_role() = 'client'::user_role
    AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.client_id = clients.id AND p.user_id = auth.uid()
    )
  );

-- quotes
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "founders_all_quotes" ON public.quotes;
CREATE POLICY "founders_all_quotes" ON public.quotes
  USING (is_founder()) WITH CHECK (is_founder());

DROP POLICY IF EXISTS "operators_rw_quotes" ON public.quotes;
CREATE POLICY "operators_rw_quotes" ON public.quotes
  USING (current_user_role() = 'operator'::user_role)
  WITH CHECK (current_user_role() = 'operator'::user_role);

DROP POLICY IF EXISTS "clients_read_own_quotes" ON public.quotes;
CREATE POLICY "clients_read_own_quotes" ON public.quotes FOR SELECT
  USING (current_user_role() = 'client'::user_role AND is_my_project(project_id));

-- quote_line_items
ALTER TABLE public.quote_line_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "founders_all_line_items" ON public.quote_line_items;
CREATE POLICY "founders_all_line_items" ON public.quote_line_items
  USING (is_founder()) WITH CHECK (is_founder());

DROP POLICY IF EXISTS "operators_rw_line_items" ON public.quote_line_items;
CREATE POLICY "operators_rw_line_items" ON public.quote_line_items
  USING (current_user_role() = 'operator'::user_role)
  WITH CHECK (current_user_role() = 'operator'::user_role);

DROP POLICY IF EXISTS "clients_read_own_line_items" ON public.quote_line_items;
CREATE POLICY "clients_read_own_line_items" ON public.quote_line_items FOR SELECT
  USING (
    current_user_role() = 'client'::user_role
    AND EXISTS (
      SELECT 1 FROM public.quotes q
      WHERE q.id = quote_line_items.quote_id AND is_my_project(q.project_id)
    )
  );

-- sows
ALTER TABLE public.sows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "founders_all_sows" ON public.sows;
CREATE POLICY "founders_all_sows" ON public.sows
  USING (is_founder()) WITH CHECK (is_founder());

DROP POLICY IF EXISTS "operators_rw_sows" ON public.sows;
CREATE POLICY "operators_rw_sows" ON public.sows
  USING (current_user_role() = 'operator'::user_role)
  WITH CHECK (current_user_role() = 'operator'::user_role);

DROP POLICY IF EXISTS "clients_read_own_sows" ON public.sows;
CREATE POLICY "clients_read_own_sows" ON public.sows FOR SELECT
  USING (current_user_role() = 'client'::user_role AND is_my_project(project_id));

-- ndas
ALTER TABLE public.ndas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "founders_all_ndas" ON public.ndas;
CREATE POLICY "founders_all_ndas" ON public.ndas
  USING (is_founder()) WITH CHECK (is_founder());

DROP POLICY IF EXISTS "operators_rw_ndas" ON public.ndas;
CREATE POLICY "operators_rw_ndas" ON public.ndas
  USING (current_user_role() = 'operator'::user_role)
  WITH CHECK (current_user_role() = 'operator'::user_role);

DROP POLICY IF EXISTS "clients_read_own_ndas" ON public.ndas;
CREATE POLICY "clients_read_own_ndas" ON public.ndas FOR SELECT
  USING (current_user_role() = 'client'::user_role AND is_my_project(project_id));

-- amendments
ALTER TABLE public.amendments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "founders_all_amendments" ON public.amendments;
CREATE POLICY "founders_all_amendments" ON public.amendments
  USING (is_founder()) WITH CHECK (is_founder());

DROP POLICY IF EXISTS "operators_rw_amendments" ON public.amendments;
CREATE POLICY "operators_rw_amendments" ON public.amendments
  USING (current_user_role() = 'operator'::user_role)
  WITH CHECK (current_user_role() = 'operator'::user_role);

DROP POLICY IF EXISTS "clients_read_own_amendments" ON public.amendments;
CREATE POLICY "clients_read_own_amendments" ON public.amendments FOR SELECT
  USING (current_user_role() = 'client'::user_role AND is_my_project(project_id));

-- signatures (polimorfica; ownership a nivel app por costo de RLS dinamica)
ALTER TABLE public.signatures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "founders_all_signatures" ON public.signatures;
CREATE POLICY "founders_all_signatures" ON public.signatures
  USING (is_founder()) WITH CHECK (is_founder());

DROP POLICY IF EXISTS "operators_rw_signatures" ON public.signatures;
CREATE POLICY "operators_rw_signatures" ON public.signatures
  USING (current_user_role() = 'operator'::user_role)
  WITH CHECK (current_user_role() = 'operator'::user_role);

-- Clients ven todas las firmas que les pertenecen via document_type/document_id (chequeo app-level)
DROP POLICY IF EXISTS "clients_read_signatures" ON public.signatures;
CREATE POLICY "clients_read_signatures" ON public.signatures FOR SELECT
  USING (
    current_user_role() = 'client'::user_role
    AND signer_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- ============================================================
-- 15) STORAGE BUCKET: contracts (privado, signed URLs)
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('contracts', 'contracts', false)
ON CONFLICT (id) DO NOTHING;

-- Policy: founders/operators uploads, clients leen via signed URLs (app-level)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects' AND policyname='contracts_founders_operators_all'
  ) THEN
    EXECUTE $POL$
      CREATE POLICY "contracts_founders_operators_all" ON storage.objects
        FOR ALL TO authenticated
        USING (bucket_id = 'contracts' AND public.is_founder_or_operator())
        WITH CHECK (bucket_id = 'contracts' AND public.is_founder_or_operator())
    $POL$;
  END IF;
END $$;

COMMIT;

-- ============================================================
-- POST-VERIFICACION:
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema='public'
-- AND table_name IN ('clients','quotes','quote_line_items','sows','ndas','amendments','signatures')
-- ORDER BY table_name;
--
-- SELECT public.format_quote_number(1042, 1);  -- esperado: 'SF-1042-01'
--
-- SELECT id, project_number FROM projects ORDER BY project_number;
-- ============================================================
