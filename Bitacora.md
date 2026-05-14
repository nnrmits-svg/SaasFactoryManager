# Bitacora — SaaS Factory Manager

> Registro cronologico de sesiones de trabajo. Mas reciente arriba.
> Mantenida automaticamente por el skill `bitacora`.
> Plan vivo del proyecto: ver `project_plan.md`.

---

## 2026-05-14 — v1.2.4: Fix bug crítico de firma (RLS auth.users)
**Maquina**: NNRM-iMac-275.local (rmarchetti)

### Bug
- En la prueba conjunta v2, founder firmó un SOW desde el modal `SignatureDialog`. El INSERT a `signatures` rompió con `permission denied for table users`. UI mostró ese error sin que la firma quede guardada.
- **Root cause**: la policy `clients_read_signatures` tenía un subquery inline `(SELECT email FROM auth.users WHERE id = auth.uid())`. El rol `authenticated` no tiene grant directo sobre `auth.users`. Como mi server action `signDocumentLocalAction` hace `.insert(...).select('id').single()`, el RETURNING dispara la evaluación de las policies FOR SELECT — y la subquery a `auth.users` falla.

### Fix
- **Migration** [supabase/migrations/20260514000000_prp005_fix_signatures_clients_policy.sql](supabase/migrations/20260514000000_prp005_fix_signatures_clients_policy.sql) — aplicada en BD prod.
  - Nueva función `public.current_user_email()` con `SECURITY DEFINER` (`SET search_path = public, auth, pg_temp`).
  - Policy `clients_read_signatures` reescrita: `signer_email = current_user_email()` en lugar del subquery inline.
- Aprendizaje genérico: **policies RLS que necesitan leer auth.users → siempre via SECURITY DEFINER function**, nunca subquery inline. Aplicar al resto de tablas si se detecta el patrón.

### Validaciones
- Función creada y policy reescrita confirmadas en BD.
- Pendiente: founder reintenta firma con el flujo completo desde UI para confirmar.

---

## 2026-05-13 (noche) — v1.2.3: Modal con visibilidad de template_version + failed_skills
**Maquina**: NNRM-iMac-275.local (rmarchetti)

### Contexto
- SF Agent release 1.1.23 (mensaje recibido) extiende `CreateProjectCommandResult` con `failed_skills`, `template_version`, y nuevos stages `template-copy` / `record-skills`. Pre-verificada la migration acompañante: TODA ya está aplicada en BD prod (`github_repo_url`, unique index, `project_local_paths` con RLS, backfill OK).
- Founder confirmó: no agregamos selector de `template_version` al wizard hasta que exista V5 real (documentado como pendiente 0d en `project_plan.md`). Mientras tanto, mostramos los campos nuevos en el modal de creación para diagnóstico mejor en la prueba conjunta.

### Hecho
- **Types extendidos** [src/features/factory-manager/types/index.ts](src/features/factory-manager/types/index.ts) — `CreateProjectCommandResult` ahora tiene: `failed_skills: string[]` (skills pedidos no encontrados), `template_version: string` (V3/V4/V5+), y stages adicionales `template-copy` + `record-skills`.
- **Hook stage labels** [hooks/use-project-creation.ts](src/features/factory-manager/hooks/use-project-creation.ts) — 2 labels nuevos: "Copiando template SaaS Factory..." y "Registrando skills aplicados en BD...".
- **Modal mejorado** [components/project-creating-modal.tsx](src/features/factory-manager/components/project-creating-modal.tsx) — en estado `created`: muestra `template_version`, contador de skills aplicados, warning amarillo si `failed_skills.length > 0`. En estado `failed`: stage canónico en `code` + descripción legible, listado de failed_skills, folder parcial si hay.
- Typecheck + build OK (24 rutas).

### Roadmap actualizado (V5 future)
- Documentado item 0d en `project_plan.md` Proximos pasos: cuando salga V5 del template, agregar (i) selector `template_version` en wizard, (ii) comando `upgrade-project` del lado Agent que aplique diff template nuevo → proyecto existente preservando skills-custom y archivos editados.

---

## 2026-05-13 (noche) — v1.2.2: Wizard lee skills dinámicamente de skills_catalog
**Maquina**: NNRM-iMac-275.local (rmarchetti)

### Contexto
- Durante la prueba conjunta, el founder notó que el wizard solo mostraba ~11 skills aunque `skills_catalog` tiene 25 únicos populated por el SF Agent.
- Causa: `AVAILABLE_SKILLS` hardcoded en `project-wizard.tsx` con 8 entries fijos. No leía de la tabla.

### Hecho
- **Nueva server action** [services/get-available-skills-action.ts](src/features/factory-manager/services/get-available-skills-action.ts) — lee `skills_catalog`, deduplica por `skill_name`, enriquece con metadata curado (`CURATED` dict) para los 25 skills conocidos, fallback a `humanize()` autoderivado + description del catalog para los desconocidos. Si el catalog está vacío, retorna fallback con bitácora + project-plan obligatorios.
- **Wizard refactor**: eliminado `AVAILABLE_SKILLS` hardcoded. State `availableSkills` se llena al montar via `getAvailableSkillsAction()`. `selectedSkills` se pre-puebla con los marcados `defaultChecked` (bitacora + project-plan obligatorios). Todas las referencias `AVAILABLE_SKILLS` → `availableSkills`.
- Typecheck + build OK (24 rutas).

### Pendiente del lado SF Agent (mensaje ya enviado por founder)
- Bug crítico: el Agent reporta `done` con `applied_skills` mentiroso. El folder local solo tiene README.md vacío y `project_skills` queda en 0 rows. Debe copiar el template SaaS Factory V4 + aplicar cada skill (copiar `.claude/skills/<skill>/` + insertar row en `project_skills`).

---

## 2026-05-13 (noche) — Cleanup duplicado + regla: proyectos válidos fuera del wizard
**Maquina**: NNRM-iMac-275.local (rmarchetti)

### Contexto
- Pre-prueba conjunta con SF Agent. Founder vio en Dashboard del Manager 2 proyectos nuevos (`Yuseff-inmobiliaria` y `SucriptionsMgmt` con typo) creados desde el MacBook Pro 2016 (user `rmarchetti`), no desde el wizard.
- Investigación: ningún `create-project` en `agent_commands` últimos 7 días. Los 2 proyectos fueron descubiertos por `scan` del SF Agent del MBP 2016, no por el wizard del founder.

### Hecho
- **Borrado `SucriptionsMgmt` (project_number 1293, typo)** — duplicado lógico de `SuscriptionsMgmt` (1003) que vive en la iMac del founder. Mismas 274 commits + 159 sessions + 14 skills exactos (mismo repo git clonado/copiado en otra Mac con typo en el nombre del folder). CASCADE limpió sus child rows.
- **Conservado `Yuseff-inmobiliaria`** (1292) — proyecto real arrancado desde Claude Agent en el MBP 2016 con estructura SaaS Factory válida.

### Regla nueva del proyecto
- **Proyectos pueden entrar a la BD por dos caminos legítimos**:
  1. **Wizard del Manager**: dispara `agent_command:create-project` → Agent procesa → status `created`. Path canonico `/Users/<user>/ProyectosIA/AplicacionesSaas/<name>`.
  2. **Scan del SF Agent**: Agent escanea filesystem buscando folders con estructura SaaS Factory (`.claude/skills/`, `bitacora.md`, etc) y los pushea a `projects` directamente. `created_by_command_id = NULL`, `agent_status='pending'` (no significa "creando", solo "no creado por wizard").
- **NO confundir con duplicación**: dos rows del MISMO repo en distintas máquinas son duplicados lógicos. Anti-dedup necesita corrida por `repo_url` o por hash del primer commit, NO por nombre (typos cambian el nombre del folder pero no la identidad del repo).

### Pendiente del lado Agent
- **Anti-duplicación en scan**: antes de insertar un proyecto descubierto en filesystem, chequear si ya existe un row en `projects` con el mismo `github_repo_url` o el mismo hash de primer commit. Si sí, **reparentar el folder local** al row existente (update `local_path` por máquina, o mejor: tabla `project_local_paths(project_id, machine_id, path)` 1:N). Si no, crear como nuevo.
- **Status semántico**: `agent_status='pending'` está saturando dos significados. Sería más claro: `pending` (wizard esperando Agent) vs `discovered` (Agent descubrió por scan, sin acción pendiente) vs `created` (wizard completó).

---

## 2026-05-13 (noche) — v1.2.1: Fix bug useTracking en /project/[name]
**Maquina**: NNRM-iMac-275.local (rmarchetti)

### Bug
- `useTracking` hook ([src/features/factory-manager/hooks/use-tracking.ts](src/features/factory-manager/hooks/use-tracking.ts)) disparaba `fetch('/api/tracking?...')` en cada montaje de `/project/[name]`, incluso con `projectPath` vacío. El comentario decía "short-circuits" pero el código nunca lo hacía.
- `/api/tracking` GET importaba `AutoCommitService` (`auto-commit-service.ts`, servicio filesystem dead-but-not-deleted) que en Vercel Lambda revienta. Resultado: **500 en logs por cada page load** del project detail.

### Fix
- **Hook**: short-circuit explícito si `projectPath` está vacío — retorna estado neutral sin fetch.
- **Route `GET /api/tracking`**: retorna `{ isTracking: false, sessionId: null, commitCount: 0 }` sin tocar `AutoCommitService`. Comentario in-file documenta que cuando el SF Agent acepte estos comandos via `agent_commands`, este endpoint puede leer de `tracking_sessions` directamente o eliminarse.
- El POST sigue intacto (los botones Start/Stop están disabled en UI, no se llama).

### Validaciones
- `npx tsc --noEmit` limpio.
- `npm run build` → 24 rutas OK.

### Pendiente
- PRP de migración real del tracking al SF Agent (queda en backlog según project_plan).

---

## 2026-05-13 (tarde) — Bump a v1.2.0 + regla de versionado
**Maquina**: NNRM-iMac-275.local (rmarchetti)

### Hecho
- **Bump APP_VERSION**: `1.1.0` → `1.2.0` en [src/shared/lib/version.ts](src/shared/lib/version.ts). MINOR porque PRP-005 agrega features grandes (sistema de contratos completo) sin breaking changes.
- **Changelog v1.2.0 cargado** con 10 highlights: las 6 fases de PRP-005, selector de Agent, fix invite, skill cross-repo, logo PWA.
- **Nueva regla del proyecto** documentada en el header de `version.ts` y `project_plan.md`: "bumpear APP_VERSION con cada cambio que llegue a prod — sea PATCH o MINOR. Sin wip silenciosos. Cada deploy queda reflejado en el changelog que ve el founder en /about".
- URL prod confirmada: `https://saasfactory.grupo-its.com.ar` (Vercel + Cloudflare). Sirviendo con `x-vercel-cache: PRERENDER`.

### Pendiente
- Push a `origin/main` para que Vercel redeploye con `v1.2.0` visible en `/about`.

---

## 2026-05-13 (tarde) — Selector de SF Agent en wizard + limpieza pre-prueba
**Maquina**: NNRM-iMac-275.local (rmarchetti)

### Contexto
- El founder probó el wizard y quedó colgado en "Esperando que el agente tome el comando…" porque ningún SF Agent estaba pulseando (los `active` en `agent_instances` eran stale: último heartbeat hace 11h+). El flow original insertaba `agent_commands.instance_id = NULL` (first-come-first-served), no había selector ni visibilidad.

### Hecho
- **Limpieza BD**: borrados comando pending del wizard (`24169885-…`), proyecto "Gneracion de Contenido" pendiente (`ca0fd426-…`) y todos los datos `_TEST_` del PRP-005 (cliente + quote + line_items + SOW + NDA + signature). Conservados los 4 proyectos legítimos (ConsultorFinanciero, SaasFactoryAgent, SaasFactoryManager, SuscriptionsMgmt). `projects.estimated_*` del SaasFactoryManager reseteados a NULL.
- **Selector de SF Agent en wizard**:
  - Nueva server action [services/get-my-agents-action.ts](src/features/factory-manager/services/get-my-agents-action.ts) — lista `agent_instances` del founder con flag `is_online` (heartbeat < 60s) y `freshness_label` legible.
  - Wizard ([project-wizard.tsx](src/features/factory-manager/components/project-wizard.tsx)) ahora trae los agents al montar, auto-selecciona el primer online, muestra selector con emoji 🟢/⚪ + máquina + OS + freshness. Si no hay online, warning amarillo.
  - `createProjectWithAgent` ahora acepta `instanceId` y lo escribe en `agent_commands.instance_id`. Si se deja vacío → null = FCFS legacy.
  - Factory dashboard pasa `agentInstanceId` desde el wizard a la action.

### Validaciones
- `npx tsc --noEmit` limpio.
- `npm run build` → 24 rutas OK.

### Pendiente del lado SF Agent
- **Filtrar comandos por `instance_id`**: el Agent debe procesar `WHERE instance_id = MY_ID OR instance_id IS NULL` (cubre selección explícita + legacy FCFS).
- **Heartbeat más activo**: el `last_heartbeat` debe actualizarse cada N segundos (≤30) para que `is_online` sea preciso del lado web.

---

## 2026-05-13 — PRP-005 Fase 6 cerrada + skill movido + Build OK
**Maquina**: NNRM-iMac-275.local (rmarchetti)

### Hecho
- **Skill `cross-repo-access` movido** de `.claude/skills-custom/` a `.claude/skills-catalog/` para que el SF Agent lo detecte cuando escanea filesystem.
- **PRP-005 Fase 6 cerrada — UI de gestión de contratos**:
  - **Server actions nuevas**:
    - [services/contracts-read-action.ts](src/features/contracts/services/contracts-read-action.ts) — `getProjectContractsAction(project_id)` devuelve bundle completo: cliente + quotes + sows + ndas + amendments + signatures con números formateados.
    - [services/sow-nda-actions.ts](src/features/contracts/services/sow-nda-actions.ts) — `createSowAction`, `createNdaAction` (con guard de `is_new`), `createAmendmentAction` que crea AMP-XXXX-MM + nuevo quote `SF-XXXX-(NN+1)` y marca el anterior como `superseded`. Templates de content_md por defecto leídos del brief si no se especifican.
  - **Componentes UI nuevos** en `src/features/contracts/components/`:
    - `signature-dialog.tsx` — modal con 3 modos (canvas local / upload PDF / DocuSign), captura nombre+email del firmante, dispara las actions de firma.
    - `amendment-form.tsx` — form para crear ampliación con razón + items extras (labor/fijo) + nuevo margen.
    - `contracts-tab.tsx` — UI principal: cliente + presupuesto activo con acciones (generar PDF, aprobar, generar SOW) + SOWs + NDAs (solo si cliente.is_new) + historial de ampliaciones + versiones anteriores.
  - **Integrado en `/project/[name]`**: nuevo tab "Contratos" agregado en [src/features/dashboard/components/project-detail-view.tsx](src/features/dashboard/components/project-detail-view.tsx) junto a Overview y AI Activity.

### Validaciones end-to-end
- `npx tsc --noEmit` → limpio.
- `npm run build` → 24 rutas compiladas OK incluyendo `/project/[name]` con tab Contratos.
- Test data insertada en BD para `SaasFactoryManager` (project_number=1002): 1 cliente `_TEST_ Cliente Prueba PRP005` (`is_new=true`), 1 quote SF-1002-01 con 4 line items ($15k total/margen 20%), 1 SOW-1002-01 draft, 1 NDA-1002-01 draft, 1 signature simulada. Listo para que el founder vea el tab Contratos con datos reales antes de la prueba conjunta con SF Agent.

### Decidido
- **El cleanup de datos `_TEST_` queda al founder** — los rows están claramente etiquetados con prefijo `_TEST_` en `clients.name`. Cuando termine de probar, `DELETE FROM clients WHERE name LIKE '_TEST_%'` cascadea por las FK (proyectos NULL en client_id, quotes/sows/ndas heredan).

### Pendiente
- **Fase 7 (Export Business OS)** y **Fase 8 (Validación final)** del PRP-005.
- **Prueba conjunta** con SF Agent cuando termine de configurarse.
- Configurar SMTP Resend + TOTP enrollment UI (pendientes pre-PRP-005).

---

## 2026-05-12 (tarde) — SMTP Resend doc + TOTP UI verificado + memoria limpia
**Maquina**: NNRM-iMac-275.local (rmarchetti)

### Hecho
- **Guia SMTP Resend → Supabase Auth** en [docs/smtp-resend-setup.md](docs/smtp-resend-setup.md). 5 pasos: verificar dominio en Resend, crear API key, configurar SMTP en Supabase Dashboard, testear, customizar templates. No requiere codigo en el repo (Supabase usa el SMTP custom automaticamente para `inviteUserByEmail`, `resetPasswordForEmail`, etc).
- **TOTP enrollment UI verificada**: el componente [src/features/auth/components/mfa-setup.tsx](src/features/auth/components/mfa-setup.tsx) ya estaba **completo** (enrollment con QR + secret manual, verify 6 digitos, unenroll, todos los estados). Montado en `/me`. La memoria `project_pending_totp` estaba stale — la realidad es que la UI funciona. Solo limpie un `import Image` sin usar.
- **Auto-memory limpiada**: removidas 4 memorias stale (`project_pending_totp`, `project_operator_labor_cost`, `project_role_config_pages`, `project_budget_new_projects`). MEMORY.md ahora solo tiene un entry de feedback (`feedback_docs_vivos`) que codifica la regla nueva.

### Decidido
- **SMTP Resend = trabajo del founder, no del agente**. Razon: requiere acceso a cuenta Resend + DNS provider + Supabase dashboard. Nada se escribe del lado repo. Queda como guia para cuando el founder tenga 30 min para hacerlo.
- **Memoria local solo para preferencias del usuario y referencias externas**, no para estado del proyecto. Razon: la regla nueva de "docs vivos" lo exige y la auto-memory no viaja entre maquinas. Cualquier project memory en auto-memory contradice la fuente de verdad de git.

### PRP-005 Fases 4 + 5 cerradas — PDFs (Quote/SOW/NDA) + Firma tri-modal
**Fase 4 — PDFs (React-PDF + Supabase Storage)**:
- Instalado `@react-pdf/renderer` (dependencia nueva).
- Templates en [src/features/contracts/pdf/](src/features/contracts/pdf/): `styles.ts` (paleta Fluya light para print), `quote-template.tsx` (header + tabla line items + totales + condiciones), `sow-template.tsx` (referencia a quote + alcance markdown + cláusula Ley 25.506 ARG + bloque firmas), `nda-template.tsx` (partes + cuerpo + firmas).
- [services/pdf-actions.ts](src/features/contracts/services/pdf-actions.ts) — 3 server actions: `generateQuotePdfAction(quote_id)`, `generateSowPdfAction(sow_id)`, `generateNdaPdfAction(nda_id)`. Cada una: carga datos de BD → renderiza a buffer via `renderToBuffer` → upload a bucket `contracts/<project_id>/(quotes|sows|ndas)/<NUMBER>.pdf` → devuelve `signed_url` (1h TTL).
- Numeración consistente con Fase 2 (`SF-NNNN-NN`, `SOW-NNNN-NN`, `NDA-NNNN-NN`).

**Fase 5 — Firma tri-modal**:
- [services/signature-hash.ts](src/features/contracts/services/signature-hash.ts) — `computeSignatureHash({content, signer_email, ip_address, timestamp_iso})` con SHA-256 hex. Garantiza inmutabilidad (cualquier tampering rompe el hash). Helper `verifySignatureHash` para auditoría posterior.
- [components/signature-canvas.tsx](src/features/contracts/components/signature-canvas.tsx) — canvas client-side con soporte mouse + touch (preventDefault explícito para iOS), exporta PNG base64. Botón "Limpiar" para rehacer.
- [services/signature-actions.ts](src/features/contracts/services/signature-actions.ts) — 3 server actions:
  - `signDocumentLocalAction` — provider `local`: hashea contenido + sube PNG a Storage + INSERT signature + marca documento padre como `signed` (sow/nda) o `approved` (quote). Captura IP via `headers().get('x-forwarded-for')` y user-agent.
  - `signDocumentUploadAction` — provider `upload`: cliente sube PDF firmado externo (base64) → Storage → signature row con `uploaded_pdf_path`.
  - `signDocumentDocusignAction` — provider `docusign`: **placeholder**. Retorna error útil si faltan `DOCUSIGN_API_KEY` + `DOCUSIGN_ACCOUNT_ID`. Implementación real pendiente para cuando se contrate la cuenta.
- Cláusula de consentimiento Ley 25.506 ARG embedded en los templates SOW y NDA.

**Validaciones**: typecheck limpio + `npm run build` completo OK (24 rutas, todas compiladas, sin errores en producción). El bucket `contracts` ya existe desde Fase 1.

### PRP-005 Fase 3 cerrada — UI step Presupuesto en wizard + indicadores en línea
- Nuevo step 11 en wizard de creación (`/factory`): "Presupuesto", después de Skills. Componente [src/features/contracts/components/budget-step.tsx](src/features/contracts/components/budget-step.tsx) (~370 líneas).
- **Bloques implementados**:
  - Complejidad (4 botones: simple / medium / complex / enterprise) — recalcula estimación AI al cambiar.
  - AI Tokens — auto-estimado por `estimateAiCost(brief, complexity)`, override manual opcional, muestra tokens estimados y reasoning.
  - Labor — operadores del proyecto (cargados via `getOperatorsAction()`), horas + $/hora editables, totales línea por línea, agregar/quitar filas.
  - Gastos fijos — items dinámicos (label, $/mes, meses), agregar/quitar.
  - Estructura (overhead %) — aplicado sobre subtotal AI+Labor+Fijos.
  - Utilidad (margin %) — aplicado sobre subtotal completo.
- **Indicadores en línea (total destacado)**: breakdown por categoría, subtotal, utilidad, **Total al cliente** con gradiente Fluya. Se actualiza con cada keystroke (memoization en lineItems + totals).
- **Integración con wizard**:
  - [src/features/factory-manager/components/project-wizard.tsx](src/features/factory-manager/components/project-wizard.tsx) — `BUDGET_STEP_INDEX = SKILLS_STEP_INDEX + 1`, `isLastStep = isBudgetStep`, `onComplete` signature ahora incluye `budget: BudgetPayload | null`, progress bar extendido a 2 finales.
  - [src/features/factory-manager/components/factory-dashboard.tsx](src/features/factory-manager/components/factory-dashboard.tsx) — `pendingBudget` state, en el effect de `state.status === 'created'` llama a `createQuoteAction()` con el `project_id` real, muestra mensaje con `SF-XXXX-NN` y total resultante.
- **Decisión**: el quote se crea DESPUÉS del proyecto (no antes) porque necesitamos el `project_id` real. Si el usuario no ingresa nada de budget (`line_items.length === 0`), no se crea quote — el proyecto se crea limpio.
- Typecheck limpio. Sin breaking changes (signature de `onComplete` cambió pero el único consumer era `factory-dashboard.tsx`, ya actualizado).

### PRP-005 Fase 2 cerrada — Estimador AI + numeración + pricing + server actions
- Nueva feature [src/features/contracts/](src/features/contracts/) con 5 archivos (1 types + 4 services):
  - [types/index.ts](src/features/contracts/types/index.ts) — espejos TS del schema PG (Quote, LineItem, Sow, Nda, Amendment, Signature, Client, QuoteTotals, ProjectComplexity).
  - [services/numbering.ts](src/features/contracts/services/numbering.ts) — `formatQuoteNumber/SowNumber/NdaNumber/AmendmentNumber` (lado app, complemento del trigger PG).
  - [services/pricing.ts](src/features/contracts/services/pricing.ts) — `computeQuoteTotals(items, profit_margin_pct)` idempotente, agrupa por tipo (ai/labor/fixed/overhead), aplica margen sobre subtotal, soporta items de tipo `profit` como override manual.
  - [services/ai-estimator.ts](src/features/contracts/services/ai-estimator.ts) — `estimateAiCost(input)` con baseline tokens por complejidad (simple 100k → enterprise 10M), multiplicador heurístico del brief (longitud + keywords técnicas), pricing por modelo (`claude-opus-4-7/4-6`, `sonnet-4-6`, `haiku-4-5`), mix 70% input / 30% output, calibración 60/40 con histórico real de `claude_sessions` si hay ≥3 puntos.
  - [services/quote-actions.ts](src/features/contracts/services/quote-actions.ts) — server actions: `createQuoteAction`, `approveQuoteAction`, `rejectQuoteAction`, `estimateAiCostAction`, `getActiveQuoteForProjectAction`. Versionado automático (max(version)+1), update de `projects.estimated_*_usd` al crear quote, `revalidatePath` consistente.
- Typecheck limpio. No toca BD de producción (Fase 1 ya dejó el schema; Fase 2 es solo código).
- **Decisión de arquitectura**: feature separada `contracts/` en lugar de meter todo en `factory-manager/` — el dominio de cotización/SOW/firma es lo suficientemente grande para vivir aparte, y permite que evolucione hacia el package `@fluya/quote-sow-nda` si el día de mañana se reutiliza en otros proyectos.

### PRP-005 Fase 1 cerrada — Schema de contratos aplicado
- Migración `20260512090000_prp005_phase1_contracts_schema.sql` aplicada a `fxlvexilnrfkkcbzwskr`. Crea **7 tablas** (`clients`, `quotes`, `quote_line_items`, `sows`, `ndas`, `amendments`, `signatures`) con RLS multi-tenant (founders ALL, operators rw, clients read-own via `is_my_project()` helper). **7 enums** (`quote_status`, `sow_status`, `nda_status`, `amendment_status`, `line_item_type`, `signature_provider`, `document_type`). Sequence `projects_number_seq` start 1000 + trigger BEFORE INSERT en `projects` para auto-asignar `project_number`. Función `format_quote_number(int, int)` → `'SF-1042-01'` (probada). Bucket Storage `contracts/` privado con policy founders/operators.
- **Backfill aplicado**: los 4 proyectos existentes recibieron `project_number` (1000–1003). Próximo proyecto creado → 1004.
- 10 columnas nuevas en `projects`: `project_number`, `client_id` (FK a clients), `estimated_*_usd × 4`, `actual_*_usd × 4`.
- **Auto-blindaje** (`20260512091000_prp005_phase1_search_path_hardening.sql`): el advisor disparó WARN `function_search_path_mutable` en las 4 funciones nuevas. Fix: `SET search_path = public, pg_temp` en `tg_projects_set_number`, `format_quote_number`, `tg_contracts_set_updated_at`, `is_my_project`. Aprendizaje documentado en PRP-005.
- **Validación final**: `list_tables` muestra 28 tablas (21 previas + 7 nuevas), todas con RLS=true. `format_quote_number(1042, 1)` → `'SF-1042-01'` OK. Bucket `contracts` aparece en Storage como privado.

### Skill nuevo: cross-repo-access
- Creado [.claude/skills-custom/cross-repo-access/SKILL.md](.claude/skills-custom/cross-repo-access/SKILL.md) — skill workspace-aware que detecta proyectos hermanos del ecosistema Fluya (`BusinessOS`, `SaasFactoryManager`, `SaasFactoryAgent`, otros en `AplicacionesSaas/`) y genera `permissions.allow` en `.claude/settings.json` para que el agente pueda leer codigo cross-repo sin pedir permiso en cada Read/Bash. Solo lectura — write fuera del proyecto sigue requiriendo autorizacion case-by-case del usuario.
- Pensado para invocarse **una vez desde cada proyecto del ecosistema**: SF Manager → autoriza lectura de BusinessOS + Agent. BusinessOS → autoriza lectura de Manager + Agent. SF Agent → autoriza lectura de Manager + BusinessOS. Simetria 3-way.
- El skill maneja el bloqueo "self-modification of permission config" gracefully: si el sandbox rechaza el write, imprime el JSON completo y pide al usuario que lo pegue manual.

### Cross-repo access habilitado + decisión sobre BusinessOS
- `.claude/settings.json` con permission rules creado manualmente por el founder (sandbox bloqueó self-modification): habilita lectura de `BusinessOS/` y `SaasFactoryAgent/` desde este proyecto. Validado: `ls BusinessOS` y `ls SaasFactoryAgent` retornan OK.
- **Descubrimiento al leer BusinessOS**: es un Business OS multi-tenant completo de Grupo ITS + Fluya (no solo contratos). Tiene schema canónico con `tenant_groups`, `organizations`, `persons`, `proposals`, `customer_orders`, `documents` polimórfico. Numeración `FIA-NNNN-AA` (Fluya) y `ITS-NNNN-AA` (ITS). Pero está en etapa de diseño temprano.
- **Decisión del founder**: avanzar PRP-005 **standalone** en SF Manager (mismo patrón que con SF Agent). NO esperar a BusinessOS estable. Manager construye modelo propio (`SF-NNNN-NN`), expone payload canónico via `/api/exports/project/[id]`, BusinessOS se acopla cuando madure. PRP-005 actualizado con esta decisión en seccion "Integración Business OS — TBD".

### Cross-repo (SF Agent ↔ Manager)
- **SF Agent v1.1.14**: `work_sessions.user_id` ya se puebla en cada upsert (cambio en `push.ts:130-133`). Validacion del lado Manager: 281/284 rows con `user_id` poblado, 3 NULL pendientes del **mismo batch** (created_at `2026-05-12 15:11:12.949197`, project `bbd3e72a` SaasFactoryManager, durations 107/5/56 min). El row siguiente (15:46:49) ya viene OK → fix confirmado activo. Labor cost en `/reports` no impactado (query filtra `user_id NOT NULL`).

### Pendiente (proximo sprint)
- **Presupuesto al crear proyecto + SOW + versionado + firma** (#3 ampliado por el founder): scope mucho mayor a lo planeado — sistema de cotizacion + SOW (`SF-xxxx-NN` / `SOW-xxxx-NN`) + ampliaciones que recotizan + firma in-app + export a Business OS externo. Esfuerzo L+. Arrancando PRP.

---

## 2026-05-12 (mañana) — Fix invite operador (status=pending eterno) + regla docs vivos
**Maquina**: NNRM-iMac-275.local (rmarchetti)

### Hecho
- **Bug fix `/auth/callback`**: el callback intercambiaba el code por sesion via `exchangeCodeForSession` pero nunca actualizaba `profiles.status` de `pending` → `active`. Resultado: un operador invitado clickeaba el link, entraba a la app, pero seguia apareciendo "Pendiente" en `/settings` para siempre. Fix en [src/app/auth/callback/route.ts](src/app/auth/callback/route.ts) — UPDATE condicional con `.eq('status', 'pending')` para evitar tocar usuarios ya activos. Typecheck OK.
- **Diagnostico del caso reportado**: usuario `rmarchetti@grupoits.com.ar` invitado 2026-05-12 16:18:59 UTC. `email_confirmed_at = 16:19:36` + `last_sign_in_at = 16:19:37` confirman que el email SI llego y fue clickeado (37s despues del invite). El "pending" visible en UI era el bug del callback, no un problema de delivery.
- **Regla nueva en CLAUDE.md** — "Reglas de proyecto: docs vivos (OBLIGATORIO)": la memoria local de Claude Code NO es la fuente de verdad de este proyecto. Continuidad via `Bitacora.md` (prepend cada sesion significativa) + `project_plan.md` (actualizar en cada bump de version). Skills `/bitacora` y `/project-plan` quedan como mecanismo canonico.

### Decidido
- **Continuidad entre maquinas/sesiones = git, no auto-memory**. Razon: la auto-memory vive en `~/.claude/projects/...` por maquina y no viaja con el repo. Cualquier dato que el equipo necesite preservar tiene que estar en `Bitacora.md` o `project_plan.md`.
- **Activacion automatica via callback**, no via webhook ni cron. Razon: el momento exacto en que un invitado pasa de "pending" a "active" es cuando intercambia el code por session. Cualquier otro trigger (cron, edge function on auth event) introduce latencia y complejidad.

### Hecho (continuacion)
- **Activacion manual one-shot** de `rmarchetti@grupoits.com.ar` autorizada por founder y aplicada via MCP: `UPDATE profiles SET status='active' WHERE email='rmarchetti@grupoits.com.ar' AND status='pending'` → retorno: `{id: dfe4f92c..., status: active}`. Limpia el residuo del bug pre-fix.

### Pendiente
- **SMTP custom para Supabase Auth** — el default rate limit es 2 emails/hora en proyectos sin SMTP. Resend ya esta integrado en el proyecto via `/add-emails`; conectarlo como SMTP de Supabase Auth resolveria entregabilidad y rate. Sprint dedicado.
- TOTP enrollment por usuario en `/me` (toggle ya HABILITADO en Supabase, /me lee, falta UI de enrolar).
- Presupuesto al crear proyecto: wizard de `/factory` debe estimar AI + labor + otros antes del create.

---

## 2026-05-05 18:00 — Capa 2 completa + Capa 8 github_owner selector
**Maquina**: NNRM-iMac-275.local

### Hecho
- **Capa 2 surfaces 1+2** (commit `4ec1617`): `<SkillPanel>` y `<PortfolioGrid>` leen `project_skills` desde BD. Nuevo server action `project-skills-action.ts` (+95 lineas). `<SkillPanel>` refactoreado (-168 lineas FS, +227 lineas BD-driven). `<ProjectDetailView>` simplificado.
- **Capa 2 surface 3** (commit `3190ce9`): `<SkillRegistryDashboard>` ahora lee de tabla `skills_catalog` via nuevo `skills-catalog-action.ts` (+46 lineas). Rewrite completo del componente (+263/-233 lineas). Las funciones FS (`getApplicableSkills`, `getProjectSkills`, `installSkillToProject`, `discoverAllSkills`, `getSkillContent`) en `skill-catalog-action.ts` ya no tienen consumers en UI — flaggeadas para cleanup.
- **Refactor installedByLabel** (commit `6a7614d`): valores canonicos `agent`/`manager`/`manual` en `<SkillPanel>`; rows con `installed_by = 'seed'` suprimen tooltip hasta que se limpien.
- **Capa 8 — github_owner selector** (commit `47b6184`): selector de organizacion GitHub cableado a tabla `user_github_orgs`. Nuevo `github-orgs-action.ts` (+31 lineas). `project-wizard.tsx` extendido (+102 lineas) con paso de seleccion de org. `settings-page.tsx` ampliado (+122 lineas) para gestionar orgs. `agent-control-panel.tsx` actualizado con `COMMAND_LABELS['list-github-orgs']`. Types extendidos (+14 lineas).

### Decidido
- **`skills_catalog` es la fuente de verdad para skills disponibles** (reemplaza `discoverAllSkills` FS). El Agent popula la tabla; el Manager solo lee.
- **`installed_by = 'seed'` es dato legacy tolerable**: las rows son reales (el skill SI esta instalado) pero el origen es impreciso. Se suprime el tooltip hasta cleanup opcional (`UPDATE project_skills SET installed_by = 'agent' WHERE installed_by = 'seed'`).

### Pendiente
- Aplicar migraciones `20260505100000` y `20260505110000` en Supabase (dedup work_sessions + skills_catalog).
- Tab "AI Activity" en `/project/[name]`.
- Cleanup de servicios FS orphan (sprint dedicado).

---

## 2026-05-05 14:30 — Migraciones versionadas: dedup work_sessions + skills_catalog
**Maquina**: NNRM-iMac-275.local

### Hecho
- **Versionada** `20260505100000_work_sessions_unique_dedup.sql` — Capa 1.5: dedup de `work_sessions` + UNIQUE constraint. Corrige el bug de "9.5 anios trabajados" flaggeado en la sesion anterior.
- **Versionada** `20260505110000_capa2_skills_catalog.sql` — Capa 2: tabla `skills_catalog` poblada por el Agent (lee `.claude/skills/` del filesystem y pushea al Manager).
- Ambas migraciones pendientes de aplicar en Supabase (ref `fxlvexilnrfkkcbzwskr`).

### Hecho (sesion previa, 13:12)
- Capa 2 surfaces 1+2: `<SkillPanel>` y `<SkillRegistryDashboard>` leen `project_skills` desde BD en vez de filesystem (commit `4ec1617`).

---

## 2026-05-05 13:12 — Capa 1 UI cerrada + Bug auth/duplicados/merge legacy resuelto
**Maquina**: NNRM-iMac-275.local

### Hecho
- **Capa 1 UI deployada en `/reports`** (commit `ee4d1d5`): server action `getReportsData()` lee `claude_sessions` con join a project name + work_session duration; tabla cliente con filtros (Modelo / Mes / Proyecto), columnas Tokens (in/out/cached compact format), $ Total, $/hora (sobre sesiones linkeadas a `work_session_id`), Modelo más usado, Última sesión. Validacion en prod: 2 sesiones, $712.68, 264.8M tokens, 4 proyectos en filtro, $/hora calculandose ($53.81/h en SaasFactoryAgent). El SF Agent pushea cada 5 min.
- **Bug 1 (header sin sesion)** definitivamente resuelto via Suspense + cacheComponents (commit `0de9117`). Validacion completa con Playwright: login + logout + re-login. Causa raiz documentada: el primer fix de `useAuth` client-side fallaba por asimetria `cookies()` server vs browser; el fix con `<Suspense fallback={NavbarSkeleton}><NavbarAuth /></Suspense>` y `cacheComponents: true` requirio NavbarAuth como server async component para satisfacer Next.js 16.1.
- **Bug 2 (proyectos duplicados en `/dashboard`)** cerrado via filtro `eq('user_id', user.id)` en las 4 reads (`getPortfolioProjects`, `getProjects`, `getProjectDetail`, `getProjectCostData`). Commit `6aef780`.
- **Filas legacy NULL mergeadas** — completado con dos transactions PostgreSQL idempotentes/reversibles. Diagnostico previo: 6 child tables FK a `projects.id` con `ON DELETE CASCADE` (commits, work_sessions, claude_sessions, project_skills, sync_configs, tracking_sessions). UNIQUE solo en `commits(project_id, hash)` y `project_skills(project_id, skill_name)` — esos requirieron DELETE-overlap antes del UPDATE; el resto reparentado directo. Para cada nombre, ganador = row de ricardo (mas reciente, mas commits, claude_session linkeada), perdedor = row con `user_id NULL`. Validacion post-merge en `/dashboard`: 4 proyectos unicos, SaasFactoryManager paso de 45 a 51 commits (5 commits del loser preservados, sin duplicados), tiempo total agregado +27h 21m. Bug del INTO con `max(uuid)` corregido a dos SELECT separados.
- **Verificacion tooltips de Sprint Camino-3** completada via Playwright: 5/5 elementos pass (`Sincronizar`, `+ Agregar`, `Re-sync`, `Start Tracking`, banner SkillRegistry) con `disabled=true`, `title="⚠ Disponible próximamente vía Agent"`, `cursor: not-allowed`.
- **Auto-detectado por el otro Claude** del lado Agent: pre-condicion para Capa 2 implementada via `pushInitialProjectSkills()` al boot — `project_skills` se popula con todo el estado actual en lugar de solo cambios futuros.

### Decidido
- **Multi-tenancy enforce desde server action + RLS combinado**. Razon: defensa en profundidad. Cualquier query a `projects` desde el Manager filtra explicitamente por `user_id`.
- **Auth state se resuelve server-side en `RootLayout` con Suspense**, no via client hook. Razon: con cacheComponents activo, `cookies()` requiere Suspense boundary; intentar leer auth en client tambien falla en preview Vercel por asimetria de la session. El patron canonico es server component async + Suspense fallback que NO miente sobre el estado.
- **Para el merge de duplicados con FK CASCADE: reparentar TODAS las child tables ANTES del DELETE FROM projects**. Razon: el CASCADE silenciosamente borra child rows si el parent se va con FKs activas. Reparentando primero, el CASCADE es no-op.

### Pendiente
- **Capa 2 — Skills visibles desde tabla `project_skills`** (sprint que sigue). Reemplazar `getProjectSkills(path)` (FS) por lectura de la tabla en `<SkillPanel>`, `<PortfolioGrid>`, `<SkillRegistryDashboard>`. Catalogo de aplicables (`discoverAllSkills`) reemplazar por manifest estatico o tabla.
- **Tab "AI Activity" en `/project/[name]`** (sprint despues de Capa 2). Filtrado de `claude_sessions` por proyecto.
- **Cleanup tecnico** (sprint dedicado): `useAuth` sin consumers, `<DirectoryPicker>` huerfano, `tsconfig.tsbuildinfo` tracked en git, profile auto-creation trigger en Supabase, servicios FS orphan (`auto-commit-service`, `git-service`, `scanner-service`, `git-sync-action`, `scan-action`, `browse-action`, `sync-action`, `sync-service`, `design-system-service`, `resolve-path`, `installSkillToProject`).

### Notas
- El `n_work_sessions` de los rows del usuario (5990 y 27020) y `sum_minutes` (438752 y 4997156 = ~9.5 anios) son numeros llamativos. Parece dato inflado por algun loop del Agent contando work_sessions repetidas. Lo dejo flag para revisar cuando se mire la calidad de datos del Agent watcher; no es bloqueante para el Manager.
- `useAuth` quedo huerfano despues del move a server-side. Lo dejo en repo por si se reutiliza, tagged para borrado en el cleanup sprint.

---

## 2026-05-04 20:30 — Hotfix: navbar auth + scope multi-tenant
**Maquina**: NNRM-iMac-275.local

### Hecho
- **Bug A — Navbar mostraba "Iniciar Sesion" estando logueado**: `useAuth` requeria sesion **y** fila en `profiles`. La cuenta `ricardo@grupoits.com.ar` tiene sesion valida pero no tiene fila en `profiles` (probablemente nunca se le creo), entonces el navbar caia al rama "no logueado". Fix: `useAuth` ahora expone `user` (de `auth.getUser()`), el navbar condiciona el menu a `user`, y `UserMenu` recibe un profile-fallback construido con datos del user (email, sin avatar) cuando no hay fila en `profiles`. Cambiado `.single()` por `.maybeSingle()` para no tirar error cuando la fila no existe.
- **Bug B — Proyectos duplicados en `/dashboard` y `/factory`**: `getPortfolioProjects`, `getProjects`, `getProjectDetail` y `getProjectCostData` hacian `select(*).from('projects')` sin filtro por `user_id`. Sin RLS estricto, traen proyectos de **todos** los users. La cuenta `ricardo@grupoits.com.ar` y la cuenta vieja `nnrm.its@gmail.com` son dos `user_id` distintos en `auth.users`; el mismo proyecto importado desde dos sesiones quedaba duplicado en el portfolio. Fix: las 4 funciones ahora hacen `.eq('user_id', user.id)`, y devuelven vacio si no hay user. `getProjectDetail` cambio de `.single()` a `.maybeSingle()` por la misma razon.

### Decidido
- **Multi-tenancy por `user_id` se enforce desde el lado server action**, no solo via RLS. Razon: defensa en profundidad — si la RLS esta mal configurada o se relaja por error, el filtro server-side sigue protegiendo. Y si la RLS YA filtra, este filtro es no-op (sin penalty).
- **`maybeSingle()` reemplaza `single()` en queries que pueden devolver 0 filas**. Razon: `single()` tira error si no hay fila o hay >1; con multi-tenant + nombres reusables, eso se rompe seguido. `maybeSingle()` devuelve `null` y el caller decide.

### Pendiente
- **Decidir que hacer con las filas duplicadas en BD**. Tras el fix, el user `ricardo@grupoits.com.ar` solo ve sus filas, pero las del user viejo (`nnrm.its@gmail.com`) siguen ahi para el otro user_id. Si son el mismo humano operando con dos cuentas: candidato a (a) consolidar las dos cuentas, (b) reasignar `user_id` de las filas viejas, o (c) borrarlas si ya no aplican. Decision del user.
- **Profile auto-creation**: si todos los users nuevos van a quedar sin fila en `profiles` (como ricardo@grupoits.com.ar), conviene un trigger en Supabase que cree el row al sign-up. Mientras tanto el fallback al email funciona.
- Continuar con Capa 1 UI en `/reports`.

### Notas
- `getProjectDetail` lookup era por `name` solamente; en multi-tenant un user podia romper el detail de otro si compartian nombre. Ahora el lookup es por `(name, user_id)`.

---

## 2026-05-04 19:55 — Sprint Camino-3 pusheado + Vercel verde
**Maquina**: NNRM-iMac-275.local

### Hecho
- 4 commits semanticos creados en orden (skills → fix B1+B2+B3 → disable Camino-3 → remove legacy create-action). Para hacer la separacion limpia se reescribio `project-detail-view.tsx` en dos pasos (State A para commit 2, State B para commit 3) usando `git checkout HEAD --` + `Write` para volver a aplicar.
- `git push origin main` rebotado por una wip de otra maquina (`66fe286 wip: MacBookPro-2016.local`) que aportaba `supabase/migrations/20260504193500_capa1_claude_sessions.sql`. Rebase limpio (sin conflictos), push exitoso. SHA final del HEAD: `9a426d1`.
- **Migration de `claude_sessions` ahora versionada** en el repo. La deuda de "SQL aplicado a Supabase pero no commiteado" queda resuelta.
- Vercel deployment status: `success`. URL estable: `https://saas-factory-manager.vercel.app/`. `/login` HTTP 200 renderizando `<title>Factory Manager — Fluya Studio</title>`.
- URL del deployment especifico (con hash): `https://saas-factory-manager-nyodmnmfh-saas-fluyaia.vercel.app` (devuelve 401 sin auth de Vercel team — esperado).

### Pendiente
- **Verificacion interactiva del detail view** (consola limpia + tooltips funcionando) queda al user logueado. Desde aca solo verifique build verde y publica. Sin credenciales de prod no puedo loguear y ver `/project/[name]`.
- **Capa 1 UI en `/reports`** (sprint que arranca):
  - Migration ya aplicada y versionada — listo.
  - Extender tabla de reports con columnas Tokens (input/output/cached), Costo USD, $/hora (si hay `work_session_id`).
  - Filtros por modelo, mes, proyecto.
  - **NO** tab "AI Activity" en `/project/[name]` — eso es sprint despues.
  - Validacion end-to-end: el Agent pushea cada 5 min, deberia haber al menos una fila al abrir `/reports`.

### Notas
- El otro Claude del lado Agent arranca Capa A (selector de `github_owner` / orgs) en paralelo — independiente, no requiere coordinacion en este sprint.
- `tsconfig.tsbuildinfo` quedo modificado en working tree (cache de tsc incremental). Esta tracked en git desde antes pero es churn — candidato a `.gitignore` cuando haya un sprint de cleanup.

---

## 2026-05-04 18:34 — Sprint Camino-3 cerrado: UI desacoplada del filesystem
**Maquina**: NNRM-iMac-275.local

### Hecho
- **Diagnostico arquitectonico** completo: el Manager debe correr siempre en Vercel y comunicarse con SF Agents en las maquinas de los devs via `agent_commands`. Mapee 12 servicios + 2 API routes que violaban este criterio (FS / `child_process` / `chokidar` adentro de server actions). Reporte con clasificacion y recomendacion en chat.
- **Sprint Camino 3 ejecutado**: deshabilitar entrypoints rotos en UI sin tocar el codigo de los servicios FS (eliminacion fisica queda para Capa 2/3 como PRPs propios).
- **6 surfaces deshabilitadas** con tooltip "⚠ Disponible próximamente vía Agent": `<SyncButton>` Sincronizar y "+ Agregar", "Re-sync" en `/project/[name]`, "Start/Stop Tracking", `<DirectoryPicker>` (input + Explorar + mensaje en amarillo), `<SkillRegistryDashboard>` (banner warning + catalogo no carga + boton Instalar requiere agent online).
- **Fallback ilegal eliminado** en `<SkillPanel>` y `<SkillRegistryDashboard>` (camino offline → `installSkillToProject` directo). Ahora si el Agent esta offline el boton Instalar queda disabled con mensaje claro.
- **B1 cerrado** (sesion anterior): `Project.localPath` agregado al tipo + helper `filesystemPath()`; `getPortfolioProjects` y `getProjectDetail` mapean `local_path`; `<ProjectDetailView>` y `<PortfolioGrid>` usan el helper, con UI de espera ("Esperando que el agente cree el proyecto en disco...") cuando no hay path real.
- **B2 cerrado**: `getProjectDetail` usa `count: 'exact'` en query de commits; el header muestra el total real con nota "mostrando los N mas recientes" si hay >100. Stats card y header deja de mentir el contador.
- **B3 evaluado**: era falsa alarma. La linea `from('tracking_sessions').delete()` en `deleteProject` esta bien (la tabla existe, la usa `auto-commit-service`, hay tipo `TrackingSession` declarado). Mi reporte original decia "el resto del codebase solo conoce work_sessions" lo cual era incorrecto. Cleanup defensivo, queda como esta.
- **Codigo legacy borrado** (sin consumers, grep verificado): `open-action.ts` (sesion anterior, `openInIDE` que abria Antigravity local), `create-action.ts` (legacy duplicado de `createProjectWithAgent`).
- **Pre-condicion Capa 2 cubierta del lado Agent** (informe del otro Claude): `pushInitialProjectSkills()` corre al boot y popula `project_skills` con el estado actual de `<project>/.claude/skills/*`. Antes chokidar con `ignoreInitial: true` solo capturaba cambios futuros y la tabla quedaba vacia para proyectos pre-existentes.
- Typecheck (`npx tsc --noEmit`) limpio en cada paso.

### Decidido
- **Camino 3 (acotado al sprint corto)**: deshabilitar entrypoints rotos AHORA con tooltip; migracion real al Agent (auto-commit, sync, scan, browse) queda para PRPs propios en Capa 2/3. Razon: arregla la mentira inmediata sin destruir codigo que hay que reescribir despues.
- **`SkillPanel` (per-project) NO entra al sprint**: solo se elimina su fallback ilegal; el listing por filesystem queda hasta que Capa 2 lo migre a leer la tabla `project_skills`. Razon: el listing devuelve `[]` silencioso desde Vercel, no es "roto", es "vacio".
- **`PortfolioGrid` skill badges**: idem, queda hasta Capa 2.

### Pendiente
- **Decidir**: commit + push del sprint para tener Vercel preview verde, o esperar a juntar mas. Hay 7 archivos modificados (Bitacora.md + project_plan.md + 5 componentes) + 1 borrado + 2 carpetas de skills sin trackear (`.claude/skills/bitacora`, `.claude/skills/project-plan`).
- **Capa 2 (sprint siguiente)**: reemplazar `getProjectSkills(path)` (FS) por lectura de tabla `project_skills` en `<SkillPanel>`, `<PortfolioGrid>` y `<SkillRegistryDashboard>`. Pre-condicion del lado Agent ya esta lista.
- **Capa 1 (sprint siguiente)**: leer `claude_sessions` en `/reports`, visualizar tokens / costo USD / model / prompt count.
- **Versionar el SQL de `claude_sessions`** en `supabase/migrations/` (pegarlo y commitearlo). Sigue siendo deuda — la tabla esta en Supabase pero no en el repo.
- **Roadmap**: Capa 3 (CRUD remoto), Capa 8 (selector `github_owner`), resto del PRP global.
- **Cleanup futuro** (post-Capa 2): borrar `auto-commit-service.ts`, `git-service.ts`, `scan-action.ts`, `browse-action.ts`, `sync-action.ts`, `sync-service.ts`, `design-system-service.ts`, `git-sync-action.ts`, `scanner-service.ts`, `resolve-path.ts`, `directory-picker.tsx`, `/api/tracking` route. Tambien la funcion `installSkillToProject` que ya no tiene consumers en el frontend.

### Notas
- `useTracking` sigue firing un fetch a `/api/tracking?projectPath=...` cuando montas `/project/[name]`, aunque el boton de Start/Stop este disabled. En Vercel eso va a 500 una vez por page load (no poll, porque `state.isTracking` empieza false). Ruido en logs de prod, no funcionalidad rota. Lo dejo tal cual hasta que se migre al Agent — la regla del sprint era "solo entrypoints, no servicios".
- `DirectoryPicker` ya estaba huerfano (cero imports en todo el codebase). Lo deshabilite defensivamente igual.
- Del lado Manager solo quedaron como server actions Vercel-friendly: `project-crud-action`, `project-detail-action`, `report-action`, `agent-command-action`, `create-project-with-agent`, `auth-service`, y la API route `/api/ai/wizard`.

---

## 2026-05-04 17:11 — Capa 1: schema `claude_sessions` aplicado
**Maquina**: NNRM-iMac-275.local

### Hecho
- El user aplico manualmente el SQL de la migration `20260504193500_capa1_claude_sessions.sql` contra el proyecto Supabase `fxlvexilnrfkkcbzwskr`. El archivo no existia fisicamente en `supabase/migrations/` de este repo al momento del setup; se aplico directo via dashboard.
- Con la tabla `claude_sessions` ya creada, el watcher del SF Agent puede empezar a pushear sesiones cada ~5 min sin fallar silencioso.

### Pendiente
- Verificar el shape real de la tabla la primera vez que tengamos acceso (MCP Supabase con token, o `supabase`/`psql` instalado). Confirmacion actual = unicamente la palabra del user, no validada desde este lado.
- Confirmar que el Agent efectivamente esta pusheando — esperar el primer batch o pedirle al otro Claude que dispare un push manual de prueba.
- Capa 1 — UI: leer `claude_sessions` en `/reports` y visualizar tokens / costo USD / model / prompt count.
- Sumar la migration al repo (`supabase/migrations/20260504193500_capa1_claude_sessions.sql`) si no esta versionada — sino se pierde la trazabilidad y la proxima maquina/clone no la replica.

### Notas
- Aplicar SQL a Supabase manualmente sin commitearlo al repo es deuda inmediata. La proxima vez que se inicialize el proyecto desde cero (o se recree el ambiente), faltara la tabla.

---

## 2026-05-04 16:32 — Retomada del proyecto + setup de continuidad
**Maquina**: NNRM-iMac-275.local

### Hecho
- Copiados los skills `bitacora` y `project-plan` desde el repo del SF Agent (`~/ProyectosIA/AplicacionesSaas/SaasFactoryAgent/.claude/skills/`) al `.claude/skills/` de este repo.
- Activado `bitacora`: rehecho header del archivo al formato del skill, preservadas las entradas historicas pre-skill ordenadas descendente como "historia legacy".
- Activado `project-plan`: bootstrap inicial de `project_plan.md` con vision, estado actual, proximos pasos y decisiones arquitectonicas heredadas.
- Confirmado que ambas mitades del sistema (SF Agent + SF Manager) coordinan via tabla `agent_commands` en Supabase.

### Decidido
- SF Manager y SF Agent son repos separados pero comparten Supabase (proyecto ref `fxlvexilnrfkkcbzwskr`); la coordinacion entre los dos Claudes se hace por git push/pull + auto-sync.
- Roadmap aprobado: orden de capas a implementar es **Capa 2 (Skills visibles) → Capa 1 (Tracking fino) → Capa 3 del roadmap (CRUD remoto) → Capa 8 (selector de orgs)**. PRP global vive en el repo del Agent (`.claude/PRPs/prp-global-manager-agent-roadmap.md`).
- Plan B aplicado para `.env.local`: relleno manual con `NEXT_PUBLIC_SUPABASE_URL` / `ANON_KEY` / `SITE_URL` desde el dashboard de Supabase. `npm run dev` levanta limpio.

### Pendiente
- **Tarea inmediata**: investigar y reportar los errores de UI conocidos del dashboard del Manager.
- **Capa 2 (Sprint 1, esfuerzo S)**: en `/project/[name]` mostrar lista de skills aplicados (lee tabla `project_skills` que ya escribe el watcher del SF Agent), estado por skill (synced/divergent/missing) y boton "Aplicar skill" que dispara comando al SF Agent.
- **Capa 1 (Sprint 1, esfuerzo M)**: schema para guardar tokens AI / costo USD / model / prompt count por sesion Claude (lo escribe el SF Agent), y agregar lectura + visualizacion en `/reports`.
- **Capa 3 del roadmap**: CRUD remoto desde Manager (editar/borrar proyecto, re-aplicar skills).
- **Capa 8**: selector de `github_owner` (orgs).
- Pedirle al user que pegue el PRP global completo si se necesita verlo entero (vive en otro repo).

### Notas
- Estado actual del wizard de creacion de proyectos: 10 pasos (9 brief + 1 skills) ya implementado.
- Tabla `projects` ya tiene 7 columnas para tracking async: `agent_status`, `local_path`, `github_repo_url`, `github_owner`, `agent_error`, `skills_to_apply`, `created_by_command_id`.
- Tabla `agent_commands` ya soporta type `'create-project'` (Capa 3 del proyecto, **no confundir** con Capa 3 del roadmap global).
- Hook `useProjectCreation` + `ProjectCreatingModal` ya cableados.
- Division de trabajo confirmada: el otro Claude maneja la parte Electron del SF Agent; este Claude maneja SF Manager (Next.js / Vercel).
- NO empezar Capa 2 todavia — primero validar errores de UI del dashboard.

---

## 2026-05-04 — Sistema de creacion de proyectos con agente (legacy, pre-skill)

> Entrada anterior al setup del skill `bitacora`. Formato heredado.

- **Nuevo**: `project-creating-modal.tsx` — Modal con estados (creando/creado/fallido) y progress por stages.
- **Nuevo**: `use-project-creation.ts` — Hook con state machine para el flujo de creacion (idle/pending/creating/created/failed), polling a Supabase para seguir el progreso.
- **Nuevo**: `create-project-with-agent.ts` — Server action que crea proyecto via agente (folder, git-init, skills), con retry.
- **Modificado**: `project-wizard.tsx` — Ampliado significativamente (+161 lineas) para integrar el flujo de creacion.
- **Modificado**: `factory-dashboard.tsx` — Ajustes de integracion (+50 lineas).
- **Modificado**: `types/index.ts` — Nuevos tipos para `CreateProjectCommandResult`, stages, payloads (+28 lineas).
- **Modificado**: `agent-control-panel.tsx` — Ajuste menor.
- Balance neto: +225 lineas (3 archivos nuevos, 4 modificados).
- Creacion inicial de `Bitacora.md`.

---

## 2026-04-21 — WIP: Configuracion de entorno (legacy)

- Agregado `.env.enc` y `.sops.yaml` para manejo seguro de secrets (SOPS encryption).
- Commit desde MacBookPro-2016.

---

## 2026-04-17 — Refactor de Dashboard y Skills (legacy)

- **Dashboard**: Simplificacion de `portfolio-dashboard`, `portfolio-grid`, `project-detail-view`.
- **Skill Panel**: Refactor mayor de `skill-panel.tsx` y `skill-registry-dashboard.tsx` (reduccion significativa de codigo).
- **Factory Manager**: Limpieza de `agent-control-panel.tsx`, refactor de `skill-catalog-action.ts` (~118 lineas eliminadas).
- **Types**: Ajuste en `factory-manager/types/index.ts`.
- **Layout/Nav**: Simplificacion de `layout.tsx` y `navbar.tsx`.
- Balance neto: -177 lineas (89 agregadas, 266 eliminadas).

---

## 2026-03-31 — Sincronizacion automatica (legacy)

- Sync general del proyecto.

---

## 2026-03-28 — Sincronizacion automatica (legacy)

- Sync general del proyecto.

---

## 2026-03-27 — Sincronizacion automatica (legacy)

- Sync general del proyecto.

---
