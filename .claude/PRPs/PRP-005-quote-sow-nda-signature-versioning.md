# PRP-005: Sistema de Cotización + SOW + NDA + Firma + Versionado

> **Estado**: PENDIENTE
> **Fecha**: 2026-05-12
> **Proyecto**: SaaS Factory Manager
> **Owner**: Founder (Ricardo)
> **Depende de**: Sprint D (labor cost en `/reports`), v1.1.14 (work_sessions.user_id)
> **Relación**: alimenta a Business OS (proyecto separado, schema TBD)

---

## Objetivo

Construir un sistema completo de cotización, SOW, NDA y firma para cada proyecto creado vía `/factory`, con versionado incremental (`SF-xxxx-NN`, `SOW-xxxx-NN`, `NDA-xxxx-NN`, `AMP-xxxx-MM`) y soporte de ampliaciones post-creación que disparan recotización automática. La cotización es el último paso del wizard `/factory` para proyectos nuevos y una pantalla independiente para ampliaciones.

## Por Qué

| Problema | Solución |
|----------|----------|
| Hoy se crean proyectos sin presupuesto formal — el founder estima al ojo y no compara contra real (AI cost real vs. estimado, horas reales vs. estimadas). | Bloque de cotización al final del wizard que estima AI tokens + labor + gastos fijos + overhead + utilidad, y persiste en `projects.estimated_*` para comparar contra real. |
| No hay documento de alcance firmado por el cliente — los cambios de scope generan fricción y no quedan trazados. | SOW versionado, atado al presupuesto, firmable y guardado en Supabase Storage con hash + timestamp. |
| Clientes nuevos requieren NDA antes de compartir detalles del proyecto, pero no hay flujo formal. | NDA versionado, firmado junto al SOW solo para clientes nuevos. Existentes lo saltean. |
| Ampliaciones de scope no quedan documentadas ni recotizadas — se "regala" trabajo. | Pantalla de ampliación post-creación que genera `SF-xxxx-(NN+1)` + `SOW-xxxx-(NN+1)` y exige nueva aprobación. |
| Business OS necesita consumir los contratos firmados pero el Manager hoy no los expone. | Capa de export (API + JSON descargable) con assumptions documentadas para integración futura. |

**Valor de negocio**:
- TCO real por proyecto (AI cost actual vs. presupuestado, horas reales vs. estimadas).
- Cierre formal con cliente (SOW/NDA firmados → reduce litigios, habilita cobro).
- Margen visible al editar la cotización (overhead + utilidad como items separados).
- Trazabilidad legal (Ley 25.506 ARG, firma electrónica simple válida para contratos comerciales).
- Pipeline limpio hacia Business OS (export de datos canónicos firmados).

## Non-Goals

- NO implementar Business OS ni su schema en este PRP (solo dejar la capa de export y assumptions).
- NO reemplazar DocuSign — DocuSign es solo opción A para casos formales internacionales.
- NO firma digital con certificado X.509 (sería firma digital del Art. 2 Ley 25.506, fuera de scope; el cliente puede subir un PDF firmado externamente vía opción C).
- NO facturación electrónica (AFIP, Stripe, Polar) — el SOW firmado dispara facturación en otro sistema.
- NO migrar proyectos existentes a la nueva numeración `SF-xxxx-NN` retroactivamente (solo proyectos creados después del deploy).
- NO multi-idioma del SOW/NDA en V1 (español-ARG primero, EN como follow-up).

## Qué

### Criterios de Éxito

- [ ] Wizard `/factory` muestra un step final "Presupuesto + SOW" con bloques editables (AI / Labor / Gastos / Overhead / Utilidad) e indicadores en línea de costo total y margen.
- [ ] Claude analiza el `BusinessBrief` y propone un rango inicial de AI tokens con multiplicador de complejidad (Low/Med/High) usando histórico de `claude_sessions` como calibración.
- [ ] Al crear el proyecto, se persisten columnas `estimated_ai_cost_usd`, `estimated_labor_cost_usd`, `estimated_fixed_cost_usd`, `estimated_overhead_pct`, `estimated_margin_pct`, `estimated_total_usd` en `projects`.
- [ ] Se generan registros en `quotes`, `sows`, opcionalmente `ndas`, todos numerados `SF-xxxx-01` / `SOW-xxxx-01` / `NDA-xxxx-01`.
- [ ] Cliente nuevo (sin proyecto previo ligado al mismo `client_id`) recibe NDA + SOW en el mismo flujo de firma; cliente existente solo SOW.
- [ ] Firma tri-modal funcional:
  - B (default): canvas → PNG + SHA-256 + timestamp + IP + user-agent → guardado en `signatures`.
  - A (DocuSign): redirección + webhook de retorno → `signatures.provider='docusign'` con `envelope_id`.
  - C (upload): cliente sube PDF firmado externo → `signatures.provider='external'` + hash del PDF.
- [ ] Si el cliente rechaza el SOW, se permite generar `SF-xxxx-02` / `SOW-xxxx-02` reusando el formulario sin recrear el proyecto.
- [ ] Pantalla de ampliación (`/project/[id]/amendments`) lista ampliaciones (`AMP-xxxx-MM`) y permite crear una nueva que dispare recotización → `SF-xxxx-(NN+1)`.
- [ ] PDFs finales firmados (presupuesto, SOW, NDA) se guardan en bucket `contracts/` de Supabase Storage con path `projects/<project_id>/<doc_number>.pdf`.
- [ ] Export a Business OS funciona vía endpoint `GET /api/exports/project/[id]` que devuelve JSON canónico (quote + sow + nda + signatures + line_items) y vía webhook `POST $BUSINESS_OS_WEBHOOK_URL` disparado al firmar SOW (configurable, opcional).
- [ ] `npm run typecheck` y `npm run build` pasan.
- [ ] Playwright valida: crear proyecto con cotización → firmar SOW → ver PDF firmado → crear ampliación → re-firmar.

### Comportamiento Esperado (Happy Path)

**Flujo 1: Proyecto nuevo, cliente nuevo**

1. Founder entra a `/factory` y completa los 9 steps del `BusinessBrief`.
2. Al pasar el step "Diseño Visual", entra al nuevo step **"Presupuesto"**.
3. Sistema llama a `POST /api/quote/estimate` con el brief → Claude responde con `{ ai_tokens_low, ai_tokens_high, complexity: 'medium', rationale }`.
4. Founder ve 5 bloques editables:
   - **AI tokens**: rango estimado + slider de multiplicador (1.0×–3.0×) → costo USD.
   - **Labor**: lista de operadores asignables (`profiles` con role='operator') × horas estimadas × `hourly_rate_usd`.
   - **Gastos fijos**: línea editable con (nombre, monto USD, recurrencia: one-time / monthly).
   - **Overhead (estructura)**: % fijo configurable (default 15%, lee de settings).
   - **Utilidad**: % aplicado al subtotal (default 25%).
5. Indicadores en línea muestran: Subtotal costo, Overhead absoluto, Utilidad absoluta, **Total cliente**, Margen %.
6. Founder selecciona "Cliente" (search dropdown sobre `clients`); si no existe, abre modal "Nuevo cliente" → marca `clients.is_new=true`.
7. Founder presiona "Generar SOW + NDA".
8. Sistema crea registros: `projects` (con `estimated_*`), `quotes` (`SF-NNNN-01`), `sows` (`SOW-NNNN-01`), `ndas` (`NDA-NNNN-01` porque cliente nuevo).
9. Sistema genera PDFs (server-side, React-PDF o Puppeteer) y los guarda como drafts (sin firma) en Supabase Storage.
10. Vista "Esperando firma" muestra los 3 documentos. Founder envía link al cliente (`/sign/[token]`).
11. Cliente abre link → ve SOW + NDA + presupuesto → firma con canvas (opción B default).
12. Sistema captura: `signature_png_base64`, `sha256(content + timestamp + ip)`, `signed_at`, `ip_address`, `user_agent`.
13. Sistema regenera PDFs con bloque "FIRMADO ELECTRÓNICAMENTE" + datos de firma + QR de verificación → guarda como versión final.
14. Estado pasa a `approved`. Webhook a Business OS (si configurado). Proyecto activable.

**Flujo 2: Cliente rechaza, recotización**

1. Cliente abre `/sign/[token]` y presiona "Rechazar" + comentario.
2. Founder ve estado `rejected` en `/project/[id]`.
3. Founder presiona "Nueva cotización" → re-abre wizard de presupuesto con valores previos pre-cargados.
4. Sistema genera `SF-NNNN-02` + `SOW-NNNN-02` (NDA NO se regenera porque ya estaba firmado o porque el cliente solo rechazó scope). Si el cliente rechazó también el NDA, sí se regenera.
5. Nuevo link al cliente → vuelta al paso 11 del flujo 1.

**Flujo 3: Ampliación post-creación**

1. Founder entra a `/project/[id]` → tab "Ampliaciones".
2. Presiona "Nueva ampliación" → modal con `title`, `description`, `additional_hours`, `additional_ai_tokens`.
3. Sistema crea `amendments` (`AMP-NNNN-01`) y dispara recotización.
4. Genera `SF-NNNN-(NN+1)` con delta + base, y opcionalmente `SOW-NNNN-(NN+1)` si la ampliación cambia alcance (toggle).
5. Cliente recibe link → firma → estado de la ampliación pasa a `approved`.
6. Las columnas `estimated_*` de `projects` se actualizan con los nuevos totales acumulados.

**Flujo 4: Cliente existente**

- Paso 6 del flujo 1: el cliente ya existe en `clients` y `clients.is_new=false`.
- Paso 8: NO se crea registro en `ndas` (skip).
- Paso 11: cliente firma solo SOW + presupuesto.

---

## Contexto

### Referencias internas

- `src/features/factory-manager/components/project-wizard.tsx` (530 líneas) — el wizard donde se inyecta el step de presupuesto. STEPS array línea 101–168.
- `src/features/factory-manager/components/factory-dashboard.tsx` — donde aparecerá el tab "Ampliaciones" post-creación.
- `src/features/reports/` (Sprint D) — usa `profiles.hourly_rate_usd` para labor cost; misma columna alimenta este sistema.
- `src/lib/supabase/` — clientes server/browser ya configurados.
- Tabla `claude_sessions` (`tokens_input`, `tokens_output`, `cost_usd`, `prompt_count`) — base de calibración del estimador AI.
- Tabla `profiles` con `role` (founder/operator/client) y `hourly_rate_usd`.
- Tabla `projects` con `business_brief jsonb` ya populated del wizard.
- `.claude/memory/project/factory-manager-status.md` — estado actual del proyecto.
- Memoria `project_budget_new_projects.md` — el founder ya señaló que el wizard debe estimar AI + labor + otros antes del create.

### Referencias externas

- Ley 25.506 Argentina (Firma Electrónica y Digital): https://servicios.infoleg.gob.ar/infolegInternet/anexos/70000-74999/70749/norma.htm
  - Art. 5 (firma electrónica simple) — válida con consentimiento, no requiere certificado.
  - Art. 7 (presunción de autoría) — solo aplica a firma digital. Firma simple requiere prueba complementaria (IP, timestamp, hash).
- DocuSign eSignature REST API: https://developers.docusign.com/docs/esign-rest-api/
- React-PDF (renderer PDF server-side): https://react-pdf.org/
- Web Crypto API (SHA-256 nativo browser y server): https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest
- Supabase Storage (PDFs firmados): https://supabase.com/docs/guides/storage

### Arquitectura Propuesta (Feature-First)

```
src/features/quotes/
├── components/
│   ├── budget-step.tsx            # Step final del wizard (AI/Labor/Gastos/Overhead/Utilidad)
│   ├── ai-cost-block.tsx          # Slider de complejidad + estimación AI
│   ├── labor-cost-block.tsx       # Operadores × horas × rate
│   ├── fixed-costs-block.tsx      # Items dinámicos (add/remove)
│   ├── margin-indicators.tsx      # Indicadores en línea (subtotal/overhead/utilidad/total)
│   ├── client-selector.tsx        # Search + modal "Nuevo cliente"
│   ├── quote-summary-card.tsx     # Resumen final antes de generar SOW
│   └── amendments-tab.tsx         # Tab en /project/[id] para ampliaciones
├── hooks/
│   ├── use-quote-estimate.ts      # Wrapper de /api/quote/estimate
│   ├── use-quote-totals.ts        # Cálculo reactivo de totales
│   └── use-amendments.ts          # Lista + create amendments
├── services/
│   ├── quote-actions.ts           # Server Actions: createQuote, updateQuote, generateNumber
│   ├── pdf-generator.ts           # React-PDF templates (presupuesto/SOW/NDA)
│   └── business-os-export.ts      # JSON canónico + webhook
├── store/
│   └── budget-wizard-store.ts     # Zustand del state del step (no se persiste hasta submit)
└── types/
    └── index.ts                   # Quote, SOW, NDA, Amendment, Signature, LineItem

src/features/signatures/
├── components/
│   ├── canvas-signer.tsx          # Canvas HTML5 para firma local (opción B)
│   ├── docusign-redirect.tsx      # Flujo opción A
│   ├── upload-signed-pdf.tsx      # Flujo opción C
│   └── sign-page.tsx              # Pantalla pública /sign/[token]
├── hooks/
│   └── use-signature-flow.ts
├── services/
│   ├── signature-actions.ts       # Server Actions: createSignature, verifySignature
│   ├── docusign-client.ts         # SDK wrapper (lazy)
│   └── hash-utils.ts              # SHA-256 + canonical serialization
└── types/
    └── index.ts

src/app/(main)/project/[id]/amendments/page.tsx     # Pantalla ampliaciones
src/app/sign/[token]/page.tsx                        # Pantalla pública de firma (fuera de /main)
src/app/api/quote/estimate/route.ts                  # POST: brief → AI cost range
src/app/api/quote/[id]/pdf/route.ts                  # GET: PDF stream
src/app/api/sign/[token]/route.ts                    # POST: register signature
src/app/api/docusign/webhook/route.ts                # POST: DocuSign callback
src/app/api/exports/project/[id]/route.ts            # GET: JSON canónico Business OS
```

### Modelo de Datos

```sql
-- =========================================================
-- 1. CLIENTS (nuevo: lista de clientes con flag is_new)
-- =========================================================
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  tax_id TEXT,                                 -- CUIT/RUT/EIN
  country TEXT DEFAULT 'AR',
  is_new BOOLEAN NOT NULL DEFAULT true,        -- false cuando ya firmó NDA alguna vez
  first_signed_nda_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY clients_owner_all ON clients FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- =========================================================
-- 2. PROJECTS — columnas nuevas
-- =========================================================
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id),
  ADD COLUMN IF NOT EXISTS project_number INT,             -- el XXXX en SF-XXXX-NN
  ADD COLUMN IF NOT EXISTS estimated_ai_cost_usd NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS estimated_labor_cost_usd NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS estimated_fixed_cost_usd NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS estimated_overhead_pct NUMERIC(5,2) DEFAULT 15,
  ADD COLUMN IF NOT EXISTS estimated_margin_pct NUMERIC(5,2) DEFAULT 25,
  ADD COLUMN IF NOT EXISTS estimated_total_usd NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_quote_id UUID,          -- FK soft a quotes (última versión aprobada)
  ADD COLUMN IF NOT EXISTS current_sow_id UUID;            -- idem sows

-- Secuencia para project_number
CREATE SEQUENCE IF NOT EXISTS projects_number_seq START 1000;

-- =========================================================
-- 3. QUOTES — presupuestos versionados (SF-XXXX-NN)
-- =========================================================
CREATE TABLE quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  number TEXT NOT NULL UNIQUE,                 -- "SF-1042-01"
  version INT NOT NULL,                        -- 1, 2, 3...
  status TEXT NOT NULL DEFAULT 'draft',        -- draft | sent | approved | rejected | superseded
  ai_cost_usd NUMERIC(10,2) NOT NULL DEFAULT 0,
  ai_complexity TEXT,                          -- low | medium | high
  ai_multiplier NUMERIC(3,2) DEFAULT 1.0,
  ai_rationale TEXT,                           -- explicación de Claude
  labor_cost_usd NUMERIC(10,2) NOT NULL DEFAULT 0,
  fixed_cost_usd NUMERIC(10,2) NOT NULL DEFAULT 0,
  overhead_pct NUMERIC(5,2) NOT NULL DEFAULT 15,
  margin_pct NUMERIC(5,2) NOT NULL DEFAULT 25,
  subtotal_usd NUMERIC(10,2) NOT NULL,
  overhead_usd NUMERIC(10,2) NOT NULL,
  margin_usd NUMERIC(10,2) NOT NULL,
  total_usd NUMERIC(10,2) NOT NULL,
  rejected_reason TEXT,
  pdf_storage_path TEXT,
  signed_pdf_storage_path TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  approved_at TIMESTAMPTZ,
  UNIQUE(project_id, version)
);
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY quotes_via_project ON quotes FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM projects p WHERE p.id = quotes.project_id AND p.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM projects p WHERE p.id = quotes.project_id AND p.user_id = auth.uid()));

-- =========================================================
-- 4. QUOTE_LINE_ITEMS — labor + gastos fijos del quote
-- =========================================================
CREATE TABLE quote_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,                          -- 'labor' | 'fixed' | 'ai' (informativo)
  operator_id UUID REFERENCES profiles(id),    -- solo si kind='labor'
  description TEXT NOT NULL,
  hours NUMERIC(8,2),                          -- solo si kind='labor'
  hourly_rate_usd NUMERIC(8,2),                -- snapshot del rate al cotizar
  amount_usd NUMERIC(10,2) NOT NULL,
  recurrence TEXT DEFAULT 'one_time',          -- one_time | monthly | yearly
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE quote_line_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY line_items_via_quote ON quote_line_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM quotes q JOIN projects p ON p.id=q.project_id
                 WHERE q.id = quote_line_items.quote_id AND p.user_id = auth.uid()));

-- =========================================================
-- 5. SOWS — Statement of Work (SOW-XXXX-NN)
-- =========================================================
CREATE TABLE sows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  quote_id UUID NOT NULL REFERENCES quotes(id),    -- atado al presupuesto
  number TEXT NOT NULL UNIQUE,                     -- "SOW-1042-01"
  version INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',            -- draft | sent | approved | rejected | superseded
  scope_markdown TEXT NOT NULL,                    -- contenido generado/editado del SOW
  deliverables JSONB DEFAULT '[]'::jsonb,
  timeline_weeks INT,
  pdf_storage_path TEXT,
  signed_pdf_storage_path TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  approved_at TIMESTAMPTZ,
  UNIQUE(project_id, version)
);
ALTER TABLE sows ENABLE ROW LEVEL SECURITY;
CREATE POLICY sows_via_project ON sows FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM projects p WHERE p.id = sows.project_id AND p.user_id = auth.uid()));

-- =========================================================
-- 6. NDAS — Non-Disclosure Agreement (NDA-XXXX-NN)
-- =========================================================
CREATE TABLE ndas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id),
  number TEXT NOT NULL UNIQUE,                     -- "NDA-1042-01"
  version INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  content_markdown TEXT NOT NULL,
  jurisdiction TEXT DEFAULT 'AR',
  pdf_storage_path TEXT,
  signed_pdf_storage_path TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  approved_at TIMESTAMPTZ,
  UNIQUE(project_id, version)
);
ALTER TABLE ndas ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- 7. AMENDMENTS — ampliaciones (AMP-XXXX-MM)
-- =========================================================
CREATE TABLE amendments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  number TEXT NOT NULL UNIQUE,                     -- "AMP-1042-01"
  sequence INT NOT NULL,                           -- 1, 2, 3 (independiente del quote version)
  title TEXT NOT NULL,
  description TEXT,
  additional_hours NUMERIC(8,2) DEFAULT 0,
  additional_ai_tokens BIGINT DEFAULT 0,
  additional_fixed_usd NUMERIC(10,2) DEFAULT 0,
  triggers_new_sow BOOLEAN NOT NULL DEFAULT false, -- si requiere SOW nuevo
  resulting_quote_id UUID REFERENCES quotes(id),   -- el SF-XXXX-(NN+1) generado
  resulting_sow_id UUID REFERENCES sows(id),       -- opcional
  status TEXT DEFAULT 'pending',                   -- pending | approved | rejected
  created_at TIMESTAMPTZ DEFAULT now(),
  approved_at TIMESTAMPTZ,
  UNIQUE(project_id, sequence)
);
ALTER TABLE amendments ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- 8. SIGNATURES — registro de firmas
-- =========================================================
CREATE TABLE signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type TEXT NOT NULL,                     -- 'quote' | 'sow' | 'nda'
  document_id UUID NOT NULL,                       -- FK soft a quotes/sows/ndas
  signer_role TEXT NOT NULL,                       -- 'client' | 'provider'
  signer_name TEXT NOT NULL,
  signer_email TEXT,
  provider TEXT NOT NULL,                          -- 'local' | 'docusign' | 'external'
  -- Para 'local':
  signature_png_base64 TEXT,
  -- Para 'docusign':
  docusign_envelope_id TEXT,
  -- Para 'external':
  uploaded_pdf_path TEXT,
  -- Comunes:
  content_hash TEXT NOT NULL,                      -- SHA-256 del documento al firmar
  signature_hash TEXT NOT NULL,                    -- SHA-256(content_hash + timestamp + ip + signer_name)
  ip_address INET,
  user_agent TEXT,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Token de acceso público (para /sign/[token])
  access_token TEXT UNIQUE,
  access_token_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE signatures ENABLE ROW LEVEL SECURITY;
-- Política: el dueño del proyecto puede leer; firmas se crean vía Server Action que valida token.
CREATE POLICY signatures_owner_read ON signatures FOR SELECT TO authenticated USING (true); -- refinar por document_id JOIN

-- =========================================================
-- 9. Función helper: generar número de proyecto
-- =========================================================
CREATE OR REPLACE FUNCTION assign_project_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.project_number IS NULL THEN
    NEW.project_number := nextval('projects_number_seq');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_assign_project_number
  BEFORE INSERT ON projects
  FOR EACH ROW EXECUTE FUNCTION assign_project_number();
```

### Bucket de Storage

```
contracts/
  projects/
    <project_id>/
      SF-1042-01-draft.pdf
      SF-1042-01-signed.pdf
      SOW-1042-01-draft.pdf
      SOW-1042-01-signed.pdf
      NDA-1042-01-signed.pdf
      AMP-1042-01-signed.pdf
```

Política RLS Storage: solo el dueño del proyecto puede leer/escribir; uploads vía Server Action.

---

## Integración Business OS — TBD

Business OS vive en `/Users/ricardomarchetti/ProyectosIA/BusinessOS`, en desarrollo paralelo, con **DB separada**. No comparte el Supabase del Manager. El Manager debe poder **exportar** los contratos firmados.

### Assumptions actuales (revisar con founder antes de Fase 6)

1. Business OS expondrá un endpoint REST `POST /api/contracts/intake` con autenticación por API key.
2. El Manager guarda `BUSINESS_OS_WEBHOOK_URL` y `BUSINESS_OS_API_KEY` en env vars.
3. Si el webhook falla, el Manager retiene el payload y permite reintento manual desde `/project/[id]`.
4. Fallback siempre disponible: botón "Descargar JSON" en `/project/[id]` que genera el mismo payload canónico.

### Payload canónico propuesto

```json
{
  "project": { "id": "...", "number": 1042, "name": "...", "client_id": "..." },
  "client": { "id": "...", "name": "...", "is_new": false },
  "quote": { "number": "SF-1042-02", "total_usd": 12500, "line_items": [...] },
  "sow": { "number": "SOW-1042-02", "signed_pdf_url": "...", "signed_at": "..." },
  "nda": { "number": "NDA-1042-01", "signed_pdf_url": "...", "signed_at": "..." } | null,
  "signatures": [ { "document_type": "sow", "provider": "local", "signature_hash": "..." } ]
}
```

### Preguntas explícitas para el founder (antes de Fase 6)

1. ¿Business OS va a tener un schema fijo para `clients` o el Manager es source of truth?
2. ¿Cuándo dispara el webhook: solo al firmar SOW, o también al firmar NDA y al aprobar ampliación?
3. ¿El payload debe incluir el PDF (base64) o solo el URL del PDF (signed URL temporal)?
4. ¿Auth del webhook: API key estática, HMAC firmado, OAuth client-credentials?
5. ¿Business OS va a regenerar facturas a partir del SOW o solo registrar? (impacta si necesitamos campos fiscales en el payload).
6. ¿Versionado bidireccional: si Business OS modifica el contrato, ¿devuelve los cambios al Manager o es read-only?

---

## Blueprint (Assembly Line)

> IMPORTANTE: Solo definir FASES. Las subtareas se generan al entrar a cada fase
> siguiendo el bucle agéntico (mapear contexto → generar subtareas → ejecutar).

### Fase 1: Schema + Migraciones
**Objetivo**: Crear tablas (`clients`, `quotes`, `quote_line_items`, `sows`, `ndas`, `amendments`, `signatures`), agregar columnas a `projects`, secuencia y trigger de `project_number`, bucket `contracts/`, todas las RLS.
**Esfuerzo estimado**: 4–6h
**Validación**:
- `mcp__supabase__list_tables` muestra las 7 tablas nuevas con RLS=true.
- `INSERT INTO projects ...` genera `project_number` automáticamente.
- Bucket `contracts/` creado y accesible vía Supabase Storage.
- `npm run typecheck` pasa (tipos generados desde Supabase).

### Fase 2: Estimador AI + Servicios de Numeración
**Objetivo**: Endpoint `POST /api/quote/estimate` que toma el `BusinessBrief` y devuelve rango AI (low/high) + complejidad + rationale. Calibración basada en `claude_sessions`. Funciones `nextQuoteVersion(projectId)`, `nextSowVersion`, `nextNdaVersion`, `nextAmendmentSequence`.
**Esfuerzo estimado**: 6–8h
**Validación**:
- `curl /api/quote/estimate` con brief de prueba devuelve JSON válido.
- Funciones de numeración respetan unicidad incluso bajo concurrencia (test con `INSERT` paralelos).

### Fase 3: UI del Step "Presupuesto" en el Wizard
**Objetivo**: Componente `BudgetStep` integrado al `project-wizard.tsx` como step final (después de "Diseño Visual"). Bloques AI/Labor/Gastos/Overhead/Utilidad, selector de cliente, indicadores en línea, Zustand store local.
**Esfuerzo estimado**: 10–14h
**Validación**:
- Wizard llega al nuevo step y muestra todos los bloques.
- Editar cualquier campo refleja cambios en indicadores (subtotal/overhead/margen/total) en <100ms.
- Submit genera registros en `projects`, `quotes`, `quote_line_items`.
- Playwright: completar wizard end-to-end, verificar `projects.estimated_total_usd` en BD.

### Fase 4: Generación de PDFs (Quote / SOW / NDA)
**Objetivo**: Templates React-PDF para los 3 documentos. Server Actions que renderizan y suben drafts a Supabase Storage. NDA solo si `clients.is_new=true`.
**Esfuerzo estimado**: 12–16h
**Validación**:
- `GET /api/quote/[id]/pdf` stream un PDF válido.
- PDFs incluyen número, fecha, items, totales, condiciones.
- Verificar 3 documentos en bucket `contracts/projects/<id>/`.

### Fase 5: Flujo de Firma (B local + A DocuSign + C upload)
**Objetivo**: Pantalla pública `/sign/[token]`, canvas signer, registro `signatures` con hash, regeneración del PDF firmado con bloque "FIRMADO ELECTRÓNICAMENTE". DocuSign behind feature flag (opcional fase V1.1).
**Esfuerzo estimado**: 14–18h (12h sin DocuSign)
**Validación**:
- Firmar canvas dispara registro con `signature_hash` válido y SHA-256 verificable.
- PDF final guardado en `signed_pdf_storage_path`.
- Token expira correctamente; reintentos lo invalidan.
- Cliente nuevo ve NDA + SOW; existente solo SOW.

### Fase 6: Tab Ampliaciones + Recotización
**Objetivo**: Pantalla `/project/[id]/amendments`, modal de nueva ampliación, lógica de recotización que genera `SF-XXXX-(NN+1)` y opcionalmente `SOW-XXXX-(NN+1)`, actualiza `projects.estimated_*` acumulado.
**Esfuerzo estimado**: 10–12h
**Validación**:
- Crear ampliación → ver nuevo quote con version=2.
- Aprobar ampliación → `projects.estimated_total_usd` se actualiza.
- Si `triggers_new_sow=true`, se crea SOW v2 y se exige nueva firma.

### Fase 7: Export a Business OS (capa de salida)
**Objetivo**: `GET /api/exports/project/[id]` devuelve JSON canónico. Webhook configurable (`BUSINESS_OS_WEBHOOK_URL`) disparado al aprobar SOW. Botón "Descargar JSON" en UI. Retry manual si webhook falla.
**Esfuerzo estimado**: 6–8h
**Validación**:
- Aprobar SOW dispara webhook (mock o real); status guardado en `audit_logs` o columna nueva.
- Descargar JSON desde UI produce archivo válido contra schema (validar con Zod).

### Fase 8: Validación Final
**Objetivo**: Sistema funcionando end-to-end.
**Esfuerzo estimado**: 4–6h
**Validación**:
- [ ] `npm run typecheck` pasa.
- [ ] `npm run build` exitoso.
- [ ] Playwright e2e: crear proyecto con cliente nuevo → firmar NDA+SOW+quote → crear ampliación → re-firmar SOW v2 → descargar JSON canónico.
- [ ] Audit logs muestran toda la trazabilidad.
- [ ] Todos los criterios de éxito marcados.

**Orden de dependencias**: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8. Fases 4 y 5 pueden paralelizar parcialmente si Fase 4 entrega templates draft primero.

**Esfuerzo total estimado**: 66–88h (~1.5–2 semanas full-time, ~3–4 semanas part-time).

---

## Riesgos

### Legal

1. **Ley 25.506 ARG — firma electrónica simple vs digital**:
   - Opción B (canvas + hash + IP + timestamp) cumple con **firma electrónica simple** (Art. 5). Es válida para contratos comerciales B2B, pero NO goza de presunción de autoría (Art. 7, reservado a firma digital con certificado).
   - **Mitigación**: incluir cláusula explícita de consentimiento en el SOW ("Las partes aceptan que este documento sea firmado electrónicamente conforme Art. 5 Ley 25.506") + retener evidencia (logs, IP, user-agent, hash) por mínimo 10 años.
   - Para casos de alto riesgo legal (>USD 50k, internacional), usar opción A (DocuSign) o C (cliente sube PDF con firma digital certificada).

2. **Jurisdicciones fuera de ARG**:
   - eIDAS (UE): "Simple electronic signature" admitida pero con menor peso probatorio. Para casos UE críticos, requerir AES (Advanced) o QES (Qualified) — fuera de scope V1.
   - USA: ESIGN Act admite firma electrónica simple. Buena cobertura.
   - **Mitigación**: campo `ndas.jurisdiction` + `sows.jurisdiction` futuro para template-switching.

### Técnicos

3. **PDF generation server-side puede ser lenta**: React-PDF en cold start de Vercel puede tardar 3–5s. Mitigar con generación lazy en cliente (react-pdf/renderer en browser) o cache de templates.
4. **Hash determinismo**: si el PDF cambia de bytes por metadata (fecha de generación interna del PDF), el hash cambia. **Mitigación**: hashear el `content_markdown` + `line_items` canónicos, NO los bytes del PDF.
5. **Race condition en numeración**: dos quotes paralelos para el mismo proyecto pueden chocar el `UNIQUE(project_id, version)`. **Mitigación**: `INSERT ... ON CONFLICT DO NOTHING RETURNING` + retry, o lock advisory por `project_id`.
6. **Storage paths colisión**: dos versiones del mismo doc con mismo nombre. **Mitigación**: incluir UUID del registro o timestamp en el path (`SF-1042-01-<uuid>.pdf`).

### Negocio

7. **Cambio de scope post-firma sin amendments**: el founder podría tener tentación de "ajustar" verbalmente sin generar amendment. **Mitigación**: dashboard `/project/[id]` muestra ALERTA si las horas trackeadas exceden las estimadas (cruzar contra `work_sessions`).
8. **Calibración del estimador AI dependiente de histórico**: con solo 11 `claude_sessions` el rango es pobre. **Mitigación**: empezar con tabla de complejidad hardcodeada (Low: 50k tokens, Med: 200k, High: 1M) y refinar con histórico cuando crezca.

---

## Plan de Testing

### Playwright (e2e)

- **Test 1 — Wizard completo cliente nuevo**:
  - Login como founder → `/factory` → completar 9 brief steps → step Presupuesto → editar AI multiplicador, agregar 2 operadores, 1 gasto fijo, ajustar utilidad → seleccionar "Nuevo cliente" → submit.
  - Verificar redirect a `/project/[id]` y que muestra estado "Esperando firma".
- **Test 2 — Firma local (opción B)**:
  - Abrir `/sign/[token]` en contexto incógnito → ver NDA + SOW + presupuesto → firmar canvas → submit.
  - Verificar PDF firmado descargable y estado del proyecto pasa a "approved".
- **Test 3 — Ampliación**:
  - `/project/[id]/amendments` → "Nueva ampliación" → llenar y crear → ver `SF-XXXX-02`.
  - Cliente firma v2 → verificar `estimated_total_usd` acumulado.
- **Test 4 — Cliente existente saltea NDA**:
  - Crear segundo proyecto reusando cliente del Test 1 → step Presupuesto → submit → verificar NO existe `ndas` para el segundo proyecto.

### DB queries (manual / scripted)

```sql
-- Verificar numeración correcta
SELECT number, version FROM quotes WHERE project_id = '<id>' ORDER BY version;
-- Verificar hash de firma es reproducible
SELECT signature_hash, content_hash, signed_at FROM signatures WHERE document_id = '<sow_id>';
-- Verificar RLS funciona
SELECT * FROM quotes; -- como user A, debe ver solo sus quotes
-- Verificar estimación AI tiene rationale
SELECT ai_complexity, ai_multiplier, ai_rationale FROM quotes WHERE id = '<id>';
```

### Unit (Vitest si está; sino Playwright fixtures)

- Función `nextQuoteVersion(projectId)` retorna `1` la primera vez, `2` después.
- Función `hashSow(sow)` produce hash determinístico ignorando timestamps.
- Cálculo de totales: `subtotal + overhead% + margin% = total` con tolerancia ±0.01.

### Build / TypeCheck

- `npm run typecheck`: tipos de tablas nuevas vienen de Supabase generator.
- `npm run build`: bundle de `/sign/[token]` debe ser < 200kb (no incluir DocuSign SDK si no se usa).

---

## 🧠 Aprendizajes (Self-Annealing)

> Esta sección CRECE con cada error encontrado durante la implementación.

*(vacía hasta ejecutar)*

---

## Gotchas

- [ ] Supabase Storage RLS — políticas en `storage.objects` son separadas de las de tabla; no olvidar.
- [ ] React-PDF en Next.js 16 — requiere `dynamic import` con `ssr: false` si se usa cliente, o `runtime: 'nodejs'` en route handler si es server.
- [ ] Web Crypto `subtle.digest` retorna `ArrayBuffer`, hay que pasar a `Uint8Array` y luego a hex.
- [ ] Canvas signature en mobile: el evento `touchstart` necesita `{ passive: false }` para `preventDefault`.
- [ ] `crypto.randomUUID` está disponible en Edge runtime, pero `randomBytes` no — usar `crypto.getRandomValues` para tokens.
- [ ] `projects.business_brief` es `jsonb` con keys del `BusinessBrief` actual; el estimador AI debe parsear ese formato.
- [ ] `profiles.hourly_rate_usd` puede ser NULL para operadores recién creados — fallback a 0 con warning visible en UI.
- [ ] Numeración `SF-XXXX-NN` debe usar `LPAD` para formato consistente (`SF-1042-01`, no `SF-1042-1`).
- [ ] La memoria del proyecto ya nota que `/me` es la página de config personal — la edición de `hourly_rate_usd` del operador debe vivir en `/me`, NO en el budget step.
- [ ] DocuSign webhook URL debe ser HTTPS y validar signature del request (HMAC).
- [ ] `audit_logs` ya existe y tiene RLS — usarla para trazabilidad de firmas (`action='document.signed'`).

## Anti-Patrones

- NO duplicar el cálculo de labor cost (ya existe en `/reports` Sprint D) — extraer helper compartido.
- NO usar `any` en el `BusinessBrief` parser (ya es `interface BusinessBrief`).
- NO hardcodear el overhead/margen — leer de `settings` global del founder con defaults.
- NO permitir editar un `quote` con `status='approved'` — clonar a nueva versión.
- NO exponer `signature_png_base64` en JSON canónico al Business OS (solo `signature_hash`).
- NO crear `ndas` si `clients.is_new=false` — validar server-side, no confiar en el frontend.
- NO regenerar el PDF firmado si ya existe `signed_pdf_storage_path` — los PDFs firmados son inmutables.
- NO permitir que el cliente cambie su `is_new` flag desde el frontend — lo decide el backend al detectar primer NDA firmado.

---

*PRP pendiente aprobación. No se ha modificado código.*
