# Plan del Proyecto — SaaS Factory Manager

> Plan vivo del producto. Una sola fuente de verdad de "donde estamos y a donde vamos".
> Mantenido por el skill `project-plan`. Cronologia detallada en `Bitacora.md`.
>
> Ultima actualizacion: 2026-06-11 (v1.2.12)
> URL prod: https://saasfactory.grupo-its.com.ar
> Cross-ref: ver entrada del 2026-06-04 en `Bitacora.md`
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

- **Sprint A (SF Manager v2) — CERRADO y EN PRODUCCIÓN** — mergeado a `main` (HEAD post-polish). **Migs 001-006 aplicadas a prod y verificadas** (13 tablas + 4 enums: roles `leader/dev/comercial/cliente`, ABM + invitations + audit view, ownership + agent_instances v2 + active_sessions + capabilities + transfers, history + view project_contributors, project_types + templates, deployments). Refactor TS de roles, middleware role-based, ABM UI (`/leader/usuarios` + detalle) y Factory "Trabajando ahora" (`/leader/proyectos` + detalle con tabs) — build verde, en prod. **Polish post-Sprint A (v1.2.9, 2026-06-04)**: fix Settings Offline (online por `max(last_heartbeat, last_seen_at)`), métricas (commits/horas/versión/creado) migradas al Factory nuevo `/leader/proyectos`, redirect `/factory`→`/leader/proyectos`. Pendiente: **login del Agent** (para que escriba sesiones) + **E2E autenticado**. Specs en `~/ProyectosIA/ArqSaasFactory/kit-comercial/dev/docs/`. Ver `Bitacora.md` (2026-06-04) y `.coordination/EVIDENCE/12-sprint-a-complete.md`.
- **Fase**: post-MVP, v1.1.0. Capa 2, Capa 8, Sprint D (labor costs en /reports) e invites administrativos completados. Listo para Capa 3 del roadmap (CRUD remoto) + enrollment 2FA.
- **Stack**: Next.js 16 + React 19 + Supabase (proyecto ref `fxlvexilnrfkkcbzwskr`) + Vercel.
- **Auth**: middleware Supabase activo (`src/middleware.ts`), redirect a `/login` para rutas protegidas.
- **Wizard de creacion de proyectos**: completo — 10 pasos (9 brief + 1 skills), integrado con SF Agent via `agent_commands`.
- **Schema BD**:
  - Tabla `projects` extendida con 7 columnas para tracking async: `agent_status`, `local_path`, `github_repo_url`, `github_owner`, `agent_error`, `skills_to_apply`, `created_by_command_id`.
  - Tabla `agent_commands` soporta type `'create-project'` (Capa 3 *del proyecto* — no confundir con Capa 3 del roadmap global).
  - Tabla `claude_sessions` aplicada (lado Manager pendiente UI; ver "Proximos pasos").
  - Tabla `project_skills` poblada por SF Agent al boot (`pushInitialProjectSkills()`) + chokidar para cambios futuros. Fuente de verdad consumida por `<SkillPanel>` y `<PortfolioGrid>`.
  - Tabla `skills_catalog` poblada por el Agent, consumida por `<SkillRegistryDashboard>`.
  - Tabla `user_github_orgs` consumida por el wizard de creacion y settings.
- **Frontend del flujo de creacion**: hook `useProjectCreation` + componente `ProjectCreatingModal` cableados; `Project.localPath` mapeado y consumido por `<ProjectDetailView>` y `<PortfolioGrid>` con UI de espera cuando no hay path real.
- **Entorno**: `.env.local` rellenado manualmente desde dashboard de Supabase (Plan B aplicado tras incidencia con SOPS); `npm run dev` levanta limpio.
- **UI desacoplada de filesystem (Sprint Camino-3)**: 6 surfaces deshabilitadas con tooltip "⚠ Disponible próximamente vía Agent" — `<SyncButton>`, "Re-sync", "Auto-Commit Tracking", `<DirectoryPicker>`. Fallbacks ilegales eliminados. Codigo legacy borrado: `open-action.ts`, `create-action.ts`.
- **Capa 2 completada**: `<SkillPanel>`, `<PortfolioGrid>`, `<SkillRegistryDashboard>` leen de BD (`project_skills` + `skills_catalog`) en vez de filesystem. Server actions: `project-skills-action.ts`, `skills-catalog-action.ts`. Funciones FS legacy (`getApplicableSkills`, `getProjectSkills`, `installSkillToProject`, `discoverAllSkills`, `getSkillContent`) sin consumers en UI — pendiente cleanup.
- **Capa 8 completada**: selector de `github_owner` en wizard y settings, cableado a `user_github_orgs`. Server action: `github-orgs-action.ts`. `agent-control-panel` extendido con `'list-github-orgs'`.
- **Sprint D — labor costs en `/reports`**: costo de operadores (horas × `profiles.hourly_rate_usd`) sumado al AI cost para TCO real.
- **Branding Fluya + `/about`**: login/signup re-branded, pagina `/about` con versionado (v1.1.0) + changelog, footer badge.
- **Invites administrativos** (founder → operator/client): `inviteUserAction` via `auth.admin.inviteUserByEmail`. UI en `/settings` con suspender / reactivar / reenviar / borrar / setear $/h. Callback `/auth/callback` ahora promueve `status=pending` → `active` al primer login (bug fix 2026-05-12).
- **Audit log + rate limit** para acciones administrativas (`invite`, `role_change`, `suspend`, `reactivate`, `delete`, `password_reset`, `set_hourly_rate`).
- **Servicios FS no eliminados** (cleanup queda para Capa 2/3): `auto-commit-service`, `git-service`, `scanner-service`, `git-sync-action`, `scan-action`, `browse-action`, `sync-action`, `sync-service`, `design-system-service`, `resolve-path`, `installSkillToProject`. Quedan en disco pero sin consumers desde la UI.

## Proximos pasos

0. **SMTP custom Supabase via Resend** — guia entregada en [docs/smtp-resend-setup.md](docs/smtp-resend-setup.md). Bloquea en el founder (cuenta Resend, DNS, dashboard). Sin esto, invitaciones masivas se traban por rate-limit default de 2/h.
0b. **Presupuesto al crear proyecto**: wizard de `/factory` estima AI + labor + otros antes del create. Esfuerzo M-L. **PRP-005 en ejecución** (Fases 1-2 cerradas, 3-7 pendientes).
0c. **Al final de PRP-005**: armar `docs/integration-contract-businessos.md` destilado para el Claude de BusinessOS — payload canónico de export + mapeo Manager→BusinessOS (`quote`→`proposal`, `sow`→`customer_order`, etc) + preguntas de auth/endpoint. Disparar cuando cerremos Fase 7 (Export).
0g. **Multi-tenant company settings para PDFs**: hoy COMPANY_* son env vars globales (Fluya OR ITS, no ambas). Para firmar el mismo proyecto con Fluya en un cliente y con ITS en otro, mover a tabla `company_settings` en BD + selector en wizard. Esfuerzo M (4-6h). Esperar a que BusinessOS tenga `tenant_groups` consolidado.
0f. **Migración a Supabase API keys v2** (`sb_publishable_` / `sb_secret_`): hoy usamos las legacy JWT (`anon` + `service_role` formato `eyJh...`). Supabase está deprecando ese formato. Cuando haya tiempo, refactor de `@/lib/supabase/client.ts` y `server.ts` para usar el formato nuevo. Esfuerzo S (2h). Ventajas: key rotation per-app, scoping fino.
0e. **Hoja membretada para PDFs Quote + SOW + NDA**: hoy los templates React-PDF usan paleta Fluya Studio default. El founder va a pasar un modelo (logo, datos de la empresa, footer, etc) para customizar. Pendiente: refactor de `src/features/contracts/pdf/styles.ts` + adicionar `<Image>` con el logo. Esfuerzo S (1-2h).
0d. **Cuando salga V5 del template SaaS Factory**: (i) agregar selector `template_version` en el wizard (dropdown, payload `template_version: 'V4'|'V5'`, ~10 min); (ii) diseñar comando `upgrade-project` del lado SF Agent que compare template nuevo vs folder de proyecto existente y aplique diff seguro (preservar skills-custom + archivos editados, sobreescribir core no-tocado). Hoy default V4 funciona — agregar selector sin V5 real es ruido visual.
1. **Capa 2 — Skills visibles en Manager** (sprint que arranca, esfuerzo S):
   - Reemplazar `getProjectSkills(path)` (FS) por lectura de tabla `project_skills` en `<SkillPanel>`, `<PortfolioGrid>` y `<SkillRegistryDashboard>`. Pre-condicion del lado Agent **ya cubierta** (`pushInitialProjectSkills()` al boot + chokidar para cambios).
   - Estado por skill: `synced` / `divergent` / `missing`.
   - Reemplazar `discoverAllSkills()` (FS) por catalogo estatico en repo o tabla en Supabase (decidir).
2. **Tab "AI Activity" en `/project/[name]`** (sprint despues de Capa 2): filtrado de `claude_sessions` por proyecto.
2b. **Portar CRUD al Factory nuevo** (`/leader/proyectos`): el redirect de `/factory` (v1.2.9) dejó el Factory nuevo como única entrada, pero es read-only. Migrar wizard de creación + editar + eliminar (hoy en `FactoryDashboard`, sin borrar) al nuevo. Recién entonces borrar `FactoryDashboard`. Esfuerzo M.
2c. **`feat/quote-from-actuals` (137 commits)**: "presupuesto desde horas reales" — input del **Motor de Presupuesto del Sprint B**. Revisar y mergear, o dejar como Draft PR para no perder el trabajo. NO borrar la branch.
3. **Capa 3 del roadmap — CRUD remoto** desde Manager: editar/borrar proyecto, re-aplicar skills.
4. **Capa 8 — Selector de `github_owner` (orgs)**. (El otro Claude arrancando Capa A en paralelo del lado Agent — no requiere coordinacion.)
5. **PRP propio para migrar `auto-commit-service` y `sync` al SF Agent** (post-Capa 2). Cuando este listo, los botones deshabilitados se vuelven funcionalidad real ruteada por `agent_commands`.
6. **Cleanup post-migracion**: borrar los servicios FS ahora orphan (lista detallada en "Estado actual"), borrar `installSkillToProject` y `<DirectoryPicker>`.
7. Resto de capas en el PRP global (vive en el repo del SF Agent: `.claude/PRPs/prp-global-manager-agent-roadmap.md`).

## Decisiones arquitectonicas

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

- **`useTracking` sigue firing fetch a `/api/tracking` al montar `/project/[name]`** — el boton de Start/Stop ya esta disabled pero el hook hace una request inicial que en Vercel va a 500. Una request por page load (no poll). Ruido en logs de prod, no funcionalidad rota. Mitigacion: queda hasta que se migre el tracking al Agent.
- **Servicios FS dead-but-not-deleted** — `auto-commit-service`, `git-service`, `scanner-service`, etc. siguen en disco pero sin consumers. Si alguien los re-importa por error, vuelve a violar el criterio Vercel-only. Mitigacion: el cleanup forma parte de Capa 2/3.
- **`work_sessions.duration_minutes` posiblemente inflado por watcher del Agent** — los rows del user actual muestran cifras irreales (5990 work_sessions, 4.9M minutos = 9.5 anios en SuscriptionsMgmt). Visible en `/dashboard` (tiempo total inflado) y `/reports` ($/hora muy bajo). Mitigacion: revisar el loop del watcher del Agent cuando se aborde la calidad de datos. No bloqueante para el Manager.
- **Coordinacion entre los dos Claudes** (uno por repo) tocando ambos Supabase — riesgo de race conditions o decisiones desincronizadas. Mitigacion actual: git push/pull + auto-sync, bitacora compartida via repo. Vigilar si crece la friccion.
- **PRP global vive en otro repo** (SF Agent) — el contexto completo del roadmap no esta en este repo; hay que pedirlo o consultarlo manualmente cuando haga falta detalle.

## Done

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

## Done Test 11 de mayo 00:03
