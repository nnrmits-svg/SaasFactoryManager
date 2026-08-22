# Plan del Proyecto — SaaS Factory Manager

> Plan vivo del producto. Una sola fuente de verdad de "donde estamos y a donde vamos".
> Mantenido por el skill `project-plan`. Cronologia detallada en `Bitacora.md`.
>
> Ultima actualizacion: 2026-08-22 (v1.2.13)
> URL prod: https://saasfactory.grupo-its.com.ar
> Cross-ref: ver entrada del 2026-08-22 en `Bitacora.md` (punto de retomada)
>
> **Regla del proyecto**: actualizar este archivo en cada bump de version (ver `CLAUDE.md` → "Reglas de proyecto: docs vivos").
> **Convención de versionado**: bumpear APP_VERSION en `src/shared/lib/version.ts` con cada deploy a prod (sea PATCH o MINOR).

---

## Vision

**SaaS Factory Manager** es la **mitad web** (Next.js + Vercel) de un sistema de fabrica de software bipartito.
La otra mitad es **SF Agent** (Electron, repo separado), que corre en cada maquina de developer y ejecuta
operaciones locales sobre el filesystem y git.
Ambos componentes coordinan via **tabla `agent_commands` en Supabase**, sin acoplamiento directo.

**Regla arquitectonica nucleo**: el Manager **siempre** corre en Vercel y **nunca** toca el filesystem
de nadie. Todo I/O local (filesystem, git, IDE, watchers) **debe** rutearse por SF Agent via
`agent_commands`. El Manager es interfaz + orquestador; el Agent ejecuta.

El Manager es la **interfaz humana**: visualizar proyectos, lanzar comandos al agente, ver metricas de
actividad, gestionar skills aplicados por proyecto. Apunta a ser el dashboard central de un equipo
operando con multiples proyectos en multiples maquinas locales (una por developer).

## Estado actual

- **Fase**: en produccion, **v1.2.13**. URL: https://saasfactory.grupo-its.com.ar (dominio custom; las
  URLs `*.vercel.app` estan detras del SSO de Vercel a proposito).
- **Stack**: Next.js 16 + React 19 + Supabase (ref `fxlvexilnrfkkcbzwskr`) + Vercel. Web Analytics
  instrumentado (2026-07-27).
- **Sprint A (SF Manager v2) — CERRADO y en prod**: migs 001-006 (13 tablas + 4 enums), roles
  `leader/dev/comercial/cliente`, middleware role-based, ABM `/leader/usuarios`, Factory
  `/leader/proyectos`. Detalle en Done y en `Bitacora.md` (2026-06-04).
- **Capa 2 y Capa 8 completadas** (skills desde BD via `project_skills`/`skills_catalog`, selector de
  `github_owner`). El plan las seguia listando como pendientes — **drift corregido hoy**.
- **Mission Control** (`/mission-control`): tablero PMO con maquinas como columnas, sesiones activas y
  feed de actividad. Tabla `pmo_sessions` + `/api/pmo` con bypass de middleware para el Agent.
- **Motor de Presupuesto MVP**: **mergeado a `main` y por lo tanto EN PRODUCCION, sin probar ni
  aprobar** (merge `8efa244`, 2026-08-21). Se mergeo por una ventana del kit v1.50.0, no por estado de
  la feature. **No se auto-dispara**: `runLaborEstimate` y `applySuggestedHours` estan cableados solo a
  `onClick`. Estima horas de trabajo desde el brief via OpenRouter.
- **Wizard de creacion de proyectos**: completo (10 pasos), integrado con SF Agent via `agent_commands`.
  Vive en `FactoryDashboard`; el Factory nuevo `/leader/proyectos` es **read-only**.
- **Auth**: middleware Supabase en `src/middleware.ts`, sobre TODAS las rutas. Invitaciones por
  `/auth/confirm` + `/set-password` (v1.2.12).
- **Infra Supabase**: **plan Free**. El 2026-08-20 el proyecto dejo de responder (auth + REST) durante
  la noche; se recupero parando el Agent, cerrando el polling y con un restart. Estable desde entonces
  (~0,27s). **El diagnostico de I/O sigue sin hacerse** — ver Riesgos.
- **Continuidad**: `Bitacora.md` al dia. Este plan estuvo congelado 2 meses (11/06 → 22/08).

## Proximos pasos

**Urgente / infra (lo primero al retomar)**

1. **Diagnostico de Disk IO en Supabase — antes de decidir si se paga Pro.** La base esta viva, se
   puede correr ya (queries copiadas en la entrada del 2026-08-22 de `Bitacora.md`):
   `pg_stat_statements` por bloques leidos de disco, y `pg_stat_user_tables` por tamaño. `seq_scan`
   alto + `idx_scan` en 0 sobre tabla grande = **indice faltante, se arregla gratis**. Si el I/O esta
   repartido entre tablas que solo crecieron → la instancia quedo chica y ahi si toca Pro (en Free no
   se puede subir compute; el add-on es desde Pro, ~US$25/mes).
2. **Blindar el middleware** (`src/middleware.ts:42`): `getUser()` sin timeout ni `try/catch`, con un
   matcher que lo corre en TODAS las rutas → Supabase es punto unico de falla de la app entera, home
   publica incluida. Timeout ~3s degradando a "no autenticado". **Dos incidentes en 24h lo respaldan.**
3. **Retencion en tablas de log** (`audit_logs`, `project_activity_log`, `pmo_sessions`): crecen sin
   poda y son sospechosas de I/O. Definir politica (ej. borrar > 90 dias) segun lo que muestre (1).

**Motor de Presupuesto (esta en prod sin aprobar)**

4. **Probarlo y aprobarlo, o sacarlo de `main`.** Riki lo retoma; puede cambiarlo o retirarlo.
5. **F3 del review**: `labor-estimator-action.ts` valida `getUser()` pero **no rol**. Ahora que esta en
   main, cualquier autenticado que descubra la action puede quemar tokens de OpenRouter. Agregar
   `requireRole(['leader','comercial'])`.
6. Borrar `src/features/contracts/REVIEW-motor-presupuesto.md` (el propio doc pedia borrarlo antes del
   merge; quedo en main).
7. **PRP-005 Fase 7 (Export)** + `docs/integration-contract-businessos.md` para el Claude de BusinessOS
   (payload canonico + mapeo `quote`→`proposal`, `sow`→`customer_order`). Fases 1-6 cerradas.

**Producto**

8. **Portar CRUD al Factory nuevo** (`/leader/proyectos` es read-only desde v1.2.9): wizard de creacion
   + editar + eliminar siguen solo en `FactoryDashboard`, que no se puede borrar hasta portarlos.
   Abierto desde el 2026-06-04. Esfuerzo M.
9. **`feat/quote-from-actuals`** (presupuesto desde horas reales): **218 commits atras de main**, la
   divergencia crece. Revisar y mergear, o dejar como Draft PR. Riki esta parado ahi. NO borrar.
10. **Tab "AI Activity"** en `/project/[name]`: filtrado de `claude_sessions` por proyecto.
11. **Capa 3 del roadmap — CRUD remoto** desde Manager: editar/borrar proyecto, re-aplicar skills.
12. **PRP para migrar `auto-commit-service` y `sync` al SF Agent**; cuando este listo, los botones
    deshabilitados se vuelven funcionalidad real via `agent_commands`. Despues, **cleanup** de los
    servicios FS orphan (lista en Riesgos).

**Pendientes de fondo (sin fecha)**

13. **SMTP custom Supabase via Resend** — guia en `docs/smtp-resend-setup.md`. Bloquea en el founder.
    ⚠️ La API key de Resend se compartio en un chat de diagnostico el 11/06 → **rotar**.
14. **Multi-tenant company settings para PDFs**: hoy `COMPANY_*` son env vars globales (Fluya OR ITS,
    no ambas). Mover a tabla `company_settings` + selector. Esperar a `tenant_groups` de BusinessOS.
15. **Migracion a Supabase API keys v2** (`sb_publishable_`/`sb_secret_`): hoy se usan las legacy JWT,
    que Supabase esta deprecando. Esfuerzo S.
16. **Hoja membretada para PDFs** (Quote/SOW/NDA): refactor de `src/features/contracts/pdf/styles.ts` +
    `<Image>` con logo. Esperando el modelo del founder.
17. **Cuando salga V5 del template**: selector `template_version` en el wizard + comando
    `upgrade-project` del lado Agent.
18. **Herramientas**: CLI `vercel` global en 54.2.0 (actual 59.3.0) — no completa `env add` para "todas
    las ramas". MCP de Supabase **sin access token** → los diagnosticos hay que hacerlos con `curl`.

## Decisiones arquitectonicas

- 2026-08-21: **Auto-refresh de pantallas solo con la pestaña visible** (`use-visible-interval`).
  Razon: Mission Control consultaba cada 20s aunque nadie mirara (4 hits por vuelta, ~17k/dia por
  pestaña olvidada) y ese goteo contribuyo a agotar el Disk IO del proyecto Supabase.
- 2026-08-21: **Motor de Presupuesto mergeado a `main` sin probar ni aprobar** (decision tomada en la
  sesion de MacBookPro-2016). Razon: `main` y `feat/motor-presupuesto` coincidian en kit v1.50.0 y esa
  ventana la cierra el proximo `/update-sf` de cualquier lado (26 archivos en conflicto). La ventana la
  abrio el kit, no el estado de la feature. Riesgo aceptado y documentado.
- 2026-08-20: **Vercel Authentication se mantiene en `all_except_custom_domains`** (decision de Riki).
  Razon: protege previews y URLs `*.vercel.app` del publico; se entra por el dominio custom, exento.
- 2026-08-20: **`NEXT_PUBLIC_SUPABASE_URL` agregada al entorno Preview** apuntando a la MISMA base de
  produccion. Razon: sin ella `createClient(undefined)` rompia el login en todo preview. Contrapartida
  aceptada: lo que se toca desde un preview escribe en prod. Lo correcto a futuro es un Supabase de
  staging propio.
- 2026-05-04: **Manager Vercel-only, todo el I/O local va por SF Agent**. El Manager nunca toca el filesystem de nadie; cualquier feature que requiera FS / git / IDE / watcher se rutea por `agent_commands`. Razon: el Manager se despliega en Vercel (serverless, sin estado, sin acceso al disco del developer); el modelo correcto es bus de comandos asincrono.
- 2026-05-04: **Camino 3 acotado para destrabar el sprint**: en lugar de migrar features rotas o eliminar codigo, deshabilitar entrypoints rotos con tooltip "⚠ Disponible próximamente vía Agent" y dejar la migracion real para PRPs propios. Razon: el Manager queda honesto en Vercel sin destruir codigo que hay que reescribir.
- 2026-05-04: **Skill install requiere Agent online**, sin fallback. Razon: el fallback ilegal anterior copiaba archivos en el filesystem efimero del Lambda — peor que fallar.
- 2026-05-04: **`Project.localPath` es la fuente de verdad para FS path** (escrito por el Agent al completar `create-project`); `path` queda como placeholder/legacy hasta que el Agent confirme. Helper `filesystemPath()` resuelve `localPath ?? path` con heuristica de "empieza con /". Razon: separar identidad del proyecto (path inicial heredado del scanner viejo) del path real al disco del developer.
- 2026-05-04: **`project_skills` es la fuente de verdad para skills aplicados**, no el filesystem. Razon: el Manager no puede leer `<project>/.claude/skills/` desde Vercel; el Agent escribe la tabla al boot y en cada cambio.
- 2026-05-04: **SF Manager y SF Agent son repos separados**, comparten Supabase como bus de coordinacion. Sin import cruzado, sin monorepo. Razon: separacion de responsabilidades (web vs Electron) y de despliegue (Vercel vs binario local).
- 2026-05-04: **Comunicacion Manager ↔ Agent solo via tabla `agent_commands`** en Supabase. Nada de webhooks ni IPC directo. Razon: la fuente de verdad es Supabase; el Agent puede estar offline, los comandos quedan encolados.
- 2026-05-04: **Roadmap aprobado, orden de capas**: Capa 2 → Capa 1 → Capa 3 (roadmap) → Capa 8 → resto del PRP. Razon: Capa 2 desbloquea visibilidad de skills (alto valor / bajo esfuerzo), Capa 1 da observabilidad, Capa 3 cierra el CRUD, Capa 8 mejora UX multi-org.
- 2026-05-04: **Plan B para `.env.local`** — relleno manual desde el dashboard de Supabase, no SOPS, no `.env.enc` para variables `NEXT_PUBLIC_*`. Razon: simplifica setup local; los `NEXT_PUBLIC_*` no son secretos, solo el `service_role` necesita encryption.
- 2026-05-04: **Stack confirmado** (decision heredada, no documentada hasta ahora): Next.js 16 + React 19 + Supabase + Vercel.

## Riesgos / Bloqueos

- **Supabase en plan Free con el Disk IO al limite.** Ya provoco una caida total de produccion
  (2026-08-20): sin login, middleware colgado y 504 hasta en la home publica. Mitigado por ahora
  (polling arreglado + Agent parado + restart), **pero la causa de fondo no esta confirmada**. Si
  vuelve a agotarse con las pestañas cerradas, hay una query patologica detras. Ver Proximos pasos (1).
- **Supabase Auth es punto unico de falla de TODA la app.** El middleware corre antes que cualquier
  ruta, incluida `/`. Si Supabase parpadea, no se cae solo lo autenticado: se cae todo. Sin timeout
  propio, un proveedor lento puede colgar una request 300s. Mitigacion pendiente: Proximos pasos (2).
- **El Motor de Presupuesto esta en produccion sin probar ni aprobar.** Si algo se comporta raro ahi,
  es esperable, no es una regresion. Mitigacion: no se auto-dispara (solo `onClick`).
- **La ventana del kit se cierra sola.** `main` y `feat/motor-presupuesto` coinciden hoy en kit v1.50.0
  por suerte, no por diseño: el proximo `/update-sf` desde cualquier maquina deja 26 archivos en
  conflicto. Ya paso una vez.
- **`feat/quote-from-actuals` a 218 commits de main** y creciendo. Cuanto mas se espera, mas caro el
  merge.
- **Servicios FS dead-but-not-deleted** — `auto-commit-service`, `git-service`, `scanner-service`,
  `git-sync-action`, `scan-action`, `browse-action`, `sync-action`, `sync-service`,
  `design-system-service`, `resolve-path`, `installSkillToProject`. Sin consumers, pero si alguien los
  re-importa vuelve a violar "Manager Vercel-only". Cleanup en Proximos pasos (12).
- **`work_sessions.duration_minutes` posiblemente inflado por el watcher del Agent** (cifras irreales:
  5990 sesiones, 4.9M minutos). Ensucia `/dashboard` y `/reports`. No bloqueante para el Manager.
- **Lifecycle de sesiones del Agent**: no cierran al apagarlo. El fix de v1.2.10 es display-only
  (`is_live` por `last_activity_at`). La causa de fondo es del Agent → Sprint D.
- **Coordinacion entre los dos Claudes** (uno por repo) sobre el mismo Supabase — riesgo de decisiones
  desincronizadas. Mitigacion: bitacora compartida en el repo. Ya obligo a rescatar dos entradas que
  habian quedado en una rama.
- **PRP global vive en el repo del SF Agent** — el roadmap completo no esta en este repo.

## Done

- [x] 2026-08-22: **v1.2.13 — Auto-refresh pausado con la pestaña oculta.** Hook
  `src/shared/hooks/use-visible-interval.ts` aplicado a Mission Control (20s) y "Agentes Conectados"
  (30s). Una pestaña en segundo plano pasa a costar cero. Los deploys del 21/8 habian ido a prod sin
  bump; corregido con este PATCH.
- [x] 2026-08-21: **Caida total de produccion diagnosticada y resuelta.** Supabase dejo de responder
  (auth + REST, 30s de timeout desde dos redes distintas). Lo que dirimio la causa: el dashboard de
  Supabase tampoco podia consultar, y el dashboard no sale por el API Gateway publico → era la
  instancia, no el incidente global que ellos reportaban. Recuperado parando el Agent + cerrando el
  polling + restart del proyecto.
- [x] 2026-08-21: **`NEXT_PUBLIC_SUPABASE_URL` agregada al entorno Preview.** Estaba solo en Production
  mientras el anon key si estaba en Preview → `createClient(undefined)` → login roto en TODO preview.
- [x] 2026-08-21: **Motor de Presupuesto MVP mergeado a main** (sin probar ni aprobar, decision
  documentada). Estimador de horas por IA desde el brief via OpenRouter, con F1 y F2 del review ya
  cerrados (error explicito si trunca o vuelve vacio + timeout de 45s).
- [x] 2026-08-21: **Higiene de ramas + dos entradas de bitacora rescatadas** de
  `agent/macbookpro-2016-local`. `next-env.d.ts` destrackeado (14 commits que nadie escribio a mano).
- [x] 2026-07-27: **Vercel Web Analytics instrumentado.** El panel estaba habilitado pero reportaba 0
  visitantes: faltaba `<Analytics />` en la app.
- [x] 2026-06: **Mission Control (tablero PMO)**: pagina hosted, tabla `pmo_sessions`, API `/api/pmo`,
  maquinas como columnas, sesiones activas por `session_id`, feed de actividad y zona Arquitecto.
- [x] 2026-06-11: **v1.2.12 — Fix flujo de invitación**: el invitado no podía entrar (faltaba definir contraseña + el callback PKCE fallaba con links de email) y "Reenviar invite" no enviaba nada. Ahora ruta `/auth/confirm` (verifyOtp por token_hash) + pantalla `/set-password`; resend usa recovery. Requiere actualizar templates + Site URL/Redirect URLs en Supabase (ver `docs/email-templates-fluya.md`).
- [x] 2026-06-10: **v1.2.11 — AI Fluya actualizada + auto-update**: (1) la info de roles se genera desde `ROLE_CAPABILITIES` (no se desactualiza más); se corrigió que el asistente afirmaba que los roles eran "roadmap" cuando ya están en prod. (2) Tool `buscar_conocimiento` → KB viva (`knowledge_items` vía `search_knowledge`), se actualiza sola. (3) Cron `/api/cron/changelog-knowledge` sincroniza el CHANGELOG → KB como `platform_change`. Sin migración.
- [x] 2026-06-10: **Mig 008 — fix signup "Database error saving new user"**: `init_user_capabilities` (trigger AFTER INSERT ON profiles de Mig 003) pasa a SECURITY DEFINER — antes era SECURITY INVOKER y el INSERT a `user_capabilities` (RLS sin grant para `supabase_auth_admin`) abortaba el alta. Confirmado funcionando.
- [x] 2026-06-04: **v1.2.10 — Fix Factory sesiones viejas en verde**: el indicador "Trabajando ahora" pintaba 🟢 por el enum `status` (que no se cierra al apagar el Agent). Ahora el color sale de `is_live` (server-side, última actividad < 180s); no-live → gris + "visto hace Xd". Display-only; la causa de fondo (lifecycle del Agent) es Sprint D.
- [x] 2026-06-04: **v1.2.9 — Polish post-Sprint A**: (1) Settings "Agentes Conectados" mostraba Offline siempre — fix: online por `max(last_heartbeat, last_seen_at)`, umbral 60s (el Agent nuevo escribe `last_seen_at`, no `last_heartbeat`). (2) Métricas commits/horas/`sf_version`/`created_at` migradas del Factory viejo al nuevo `/leader/proyectos`. (3) `/factory` redirige a `/leader/proyectos`. Housekeeping: `js-yaml` runtime + `package-lock.json` versionado.
- [x] 2026-05-14: **v1.2.7 — Delete-project: resolveInstanceId en cascada** (project_local_paths → created_by_command_id → FCFS) + warnings en modal + detección de "Path no existe" del Agent 1.1.25. Pares con SF Agent 1.1.25.
- [x] 2026-05-14: **v1.2.6 — Fix UI bug modal Eliminar**: el checkbox "Borrar folder local" quedaba deshabilitado aunque la BD tuviera el path. Causa: `getProjects()` no traía `local_path` ni `github_repo_url`. Now fixed — próximos delete muestran el checkbox correctamente.
- [x] 2026-05-14: **v1.2.5 — Eliminar proyecto coordinado** (Manager + Agent). Modal con confirmación tipo GitHub + 3 checkboxes (folder local · repo GitHub · PDFs Storage). Requiere SF Agent v1.1.24+ para `agent_command:delete-project`.
- [x] 2026-05-14: **v1.2.4 — Fix bug crítico de firma** (RLS auth.users). Policy `clients_read_signatures` reescrita usando función SECURITY DEFINER `current_user_email()`. Regla aprendida: nunca subquery inline a `auth.users` en RLS.
- [x] 2026-05-13: **v1.2.3 — Modal con visibilidad de template_version + failed_skills + stage canónico** para diagnosticar la prueba conjunta con SF Agent 1.1.23 (alineado con CreateProjectCommandResult extendido).
- [x] 2026-05-13: **v1.2.2 — Wizard lee skills dinámicamente de `skills_catalog`** (25 únicos vs los 8 hardcoded anteriores). Metadata curado para destacados, humanize fallback para los demás. `bitacora` + `project-plan` siguen obligatorios.
- [x] 2026-05-13: **v1.2.1 — fix bug useTracking** que disparaba 500 en `/api/tracking` cada page load de `/project/[name]`. Hook short-circuit cuando `projectPath` vacío + route GET retorna neutral sin importar `AutoCommitService` (servicio FS dead-but-not-deleted incompatible con Vercel Lambdas).
- [x] 2026-05-13: **Bump a v1.2.0** + regla de versionado: bumpear con cada deploy a prod (PATCH o MINOR), cada cambio reflejado en changelog visible en `/about`. URL prod: `https://saasfactory.grupo-its.com.ar`.
- [x] 2026-05-13: **Selector de SF Agent en wizard** — `getMyAgentsAction()` lista agents con flag online (heartbeat <60s), wizard auto-selecciona el primero online, comando se inserta con `instance_id` explícito (no más FCFS ciego). Mensaje al Claude del SF Agent enviado con instrucciones para filter por instance_id + heartbeat frecuente + shortcut a Factory Manager.
- [x] 2026-05-13: **PRP-005 Fase 6 completa** — UI de gestión en tab "Contratos" de `/project/[name]`. Componentes: ContractsTab (vista principal), SignatureDialog (3 modos), AmendmentForm. Server actions: getProjectContracts, createSow, createNda, createAmendment (con versionado automático SF/SOW/NDA/AMP y supersede del quote anterior). Test data insertado para project 1002 (SaasFactoryManager). Build OK 24 rutas. Skill cross-repo-access movido a `.claude/skills-catalog/`.
- [x] 2026-05-12: **PRP-005 Fases 4 + 5 completas** — PDFs (Quote/SOW/NDA) con React-PDF + Supabase Storage + firma tri-modal (canvas local con hash SHA-256, upload de PDF firmado externo, DocuSign placeholder). Build OK 24 rutas. Cláusula Ley 25.506 ARG embedded. Skill `cross-repo-access` movido a `.claude/skills-catalog/` para detección por SF Agent.
- [x] 2026-05-12: **PRP-005 Fase 3 completa** — UI step "Presupuesto" en wizard de `/factory`. Componente `BudgetStep` con bloques AI/Labor/Fijos/Overhead/Utilidad e indicadores en línea, integrado a la creación del proyecto (quote auto-creado post-create con `SF-XXXX-NN`). Logo del Factory Manager (SFManager.png) reemplaza favicons PWA.
- [x] 2026-05-12: **PRP-005 Fase 2 completa** — feature `src/features/contracts/` con types + numbering + pricing + ai-estimator + quote-actions. 5 archivos, typecheck limpio. Server actions listas para que la UI (Fase 3) las consuma.
- [x] 2026-05-12: **PRP-005 Fase 1 completa** — schema de cotización/SOW/NDA/firma/versionado aplicado. 7 tablas con RLS, 7 enums, sequence `projects_number_seq` start 1000 (backfill OK: 4 proyectos numerados 1000-1003), `format_quote_number()` retorna `SF-XXXX-NN`, bucket Storage `contracts/` privado. Auto-blindaje aplicado para `function_search_path_mutable` WARN.
- [x] 2026-05-12: Skill `cross-repo-access` creado en `.claude/skills-custom/` — detecta proyectos hermanos del ecosistema Fluya y configura permissions.allow para lectura cross-repo. Invocable desde cualquier proyecto del ecosistema (SF Manager, SF Agent, BusinessOS).
- [x] 2026-05-12: Guia SMTP Resend → Supabase Auth entregada en `docs/smtp-resend-setup.md` (5 pasos, bloquea en founder).
- [x] 2026-05-12: TOTP enrollment UI verificada — el componente `mfa-setup.tsx` ya estaba completo y montado en `/me`. La memoria que decia "falta enrollment por usuario" estaba stale.
- [x] 2026-05-12: Auto-memory podada — 4 entries stale removidas, queda solo `feedback_docs_vivos` que codifica la regla nueva.
- [x] 2026-05-12: Activacion manual one-shot de `rmarchetti@grupoits.com.ar` (`UPDATE profiles SET status='active'` autorizado por founder vias MCP). Limpieza del residuo del bug pre-fix.
- [x] 2026-05-12: Bug fix `/auth/callback` — promueve `profiles.status` de `pending` → `active` al primer login del invitado. Antes el operador clickeaba el link de invite, entraba a la app, pero seguia apareciendo "Pendiente" en `/settings` para siempre. Fix en [src/app/auth/callback/route.ts](src/app/auth/callback/route.ts).
- [x] 2026-05-12: Regla "docs vivos" oficializada en `CLAUDE.md` — Bitacora.md + project_plan.md son la fuente de verdad de continuidad, no la auto-memory.
- [x] 2026-05-11: v1.1.0 — branding Fluya en login/signup, pagina `/about` con changelog, footer badge (commit `2cec84a`).
- [x] 2026-05-11: Sprint D — costos de labor por operador en `/reports` (commit `57736cd`).
- [x] 2026-05-05: Filas legacy `user_id NULL` mergeadas en transactions PostgreSQL idempotentes. Loser SaasFactoryManager `27c9ca1e` mergeado en `bbd3e72a`; loser SuscriptionsMgmt `809d729f` mergeado en `953d208d`. 6 child tables reparentadas (commits, work_sessions, claude_sessions, project_skills, sync_configs, tracking_sessions) con DELETE-overlap previo en commits y project_skills por UNIQUE (project_id, hash) y (project_id, skill_name). Validacion visual en `/dashboard`: 4 proyectos unicos, SaasFactoryManager 51 commits (45 winner + 5 reparentados del loser).
- [x] 2026-05-05: Capa 1 UI en `/reports` deployada (commit `ee4d1d5`). Tabla con tokens (compact), $ Total, $/hora, modelo mas usado, ultima sesion + filtros por modelo / mes / proyecto. Validacion en prod: 2 sesiones, $712.68, 264.8M tokens.
- [x] 2026-05-05: Bug navbar (header sin sesion) resuelto definitivamente con `<Suspense>` boundary (commit `0de9117`). Causa raiz: `cookies()` en server component fuera de Suspense rompe build con `cacheComponents: true` (Next.js 16.1+). Validacion completa via Playwright: login, logout, re-login.
- [x] 2026-05-05: Bug proyectos duplicados resuelto via filtro `user_id` en las 4 reads de `projects` (commit `6aef780`). Verificado visualmente: 4 proyectos unicos.
- [x] 2026-05-05: Verificacion tooltips Sprint Camino-3 completada via Playwright. 5/5 elementos pass.
- [x] 2026-05-04: Sprint Camino-3 pusheado a `main` en 4 commits semanticos (rebased sobre wip de otra maquina que aporto el SQL versionado). Vercel preview verde en `https://saas-factory-manager.vercel.app/` (deployment status `success`, `/login` HTTP 200 renderizando "Factory Manager — Fluya Studio"). Verificacion interactiva del detail (consola limpia + tooltips) queda al user logueado.
- [x] 2026-05-04: Migration `claude_sessions` versionada en `supabase/migrations/20260504193500_capa1_claude_sessions.sql` (deuda resuelta — la trajo un wip auto-sync de otra maquina antes del push).
- [x] 2026-05-04: Sprint Camino-3 cerrado — UI del Manager desacoplada del filesystem. 6 surfaces deshabilitadas con tooltip + 2 fallbacks ilegales eliminados + B1/B2/B3 cerrados + `open-action.ts` y `create-action.ts` borrados. Typecheck limpio.
- [x] 2026-05-04: B1 — `Project.localPath` agregado al tipo, mapeado en server reads, helper `filesystemPath()`, UI consume el helper con estado de espera cuando no hay path real.
- [x] 2026-05-04: B2 — `getProjectDetail` usa `count: 'exact'` para commits; UI muestra count real con nota "mostrando los N mas recientes".
- [x] 2026-05-04: B3 evaluado — falsa alarma. La linea `from('tracking_sessions').delete()` esta correcta (la tabla existe).
- [x] 2026-05-04: Auditoria arquitectonica — clasificacion de los 12 servicios + 2 API routes que violaban "Manager Vercel-only", reporte con plan de migracion en 3 caminos.
- [x] 2026-05-04: Pre-condicion Capa 2 cubierta del lado Agent — `pushInitialProjectSkills()` al boot + chokidar para cambios. `project_skills` lista como fuente de verdad.
- [x] 2026-05-04: Capa 1 (parte schema) — tabla `claude_sessions` creada en Supabase via SQL aplicado manualmente al dashboard. **Deuda**: el SQL no esta versionado en `supabase/migrations/`.
- [x] 2026-05-04: Setup de continuidad — skills `bitacora` y `project-plan` instalados en este repo, primera entrada de bitacora y plan inicial creados.
- [x] 2026-05-04: Wizard de creacion de proyectos (10 pasos) implementado y cableado con SF Agent via `agent_commands`.
- [x] 2026-05-04: Tabla `projects` extendida con 7 columnas de tracking async (`agent_status`, `local_path`, `github_repo_url`, `github_owner`, `agent_error`, `skills_to_apply`, `created_by_command_id`).
- [x] 2026-05-04: `agent_commands` soporta type `'create-project'` (Capa 3 del proyecto).
- [x] 2026-05-04: Hook `useProjectCreation` + `ProjectCreatingModal` cableados en el frontend.
- [x] 2026-05-04: `.env.local` rellenado (Plan B); `npm run dev` levanta limpio.
- [x] 2026-04-21: Configuracion de entorno con SOPS (`.env.enc` + `.sops.yaml`) — luego reemplazada por Plan B para `NEXT_PUBLIC_*`.
- [x] 2026-04-17: Refactor mayor de Dashboard y Skills (-177 lineas netas).
