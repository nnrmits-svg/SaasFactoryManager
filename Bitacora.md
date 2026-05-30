# Bitacora — SaaS Factory Manager

> Registro cronologico de sesiones de trabajo. Mas reciente arriba.
> Mantenida automaticamente por el skill `bitacora`.
> Plan vivo del proyecto: ver `project_plan.md`.

---

## 2026-05-30 — Limpieza: screenshots removidos del root
**Maquina**: MacBookPro-2016.local

### Hecho
- Eliminados 32 archivos `.png` del root del repo (screenshots de validacion: capa2, capa25, capa8, dashboard, reports, wizard, brand, etc.). Eran capturas de verificacion durante sprints anteriores, no assets del producto.
- Actualizacion de `project_plan.md` con estado de Capa 2, Capa 2.5, Capa 8, Cleanup M, Brand Fluya y Sprint AI completados.

---

## 2026-05-15 — Cierre: Sprint AI Fluya chatbot + Brand + Cleanup + Capa 2.5
**Maquinas**: NNRM-iMac-275.local + MacBookPro-2016.local

### Hecho

**Sprint AI Fluya (Capa A) — 2026-05-11**
- **Sprint A.1** (commit `88b52b2`): seed de tablas `help_categories`, `help_articles`, `faqs`, `article_feedback` con RLS. Contenido inicial de ayuda.
- **Sprint A — Chatbot** (commit `bdf99a0`): `/api/help/chat` con OpenRouter streaming (gemini-2.0-flash) + knowledge base WORKFLOW.md + datos dinamicos de BD. `ChatbotWidget` (FAB global, auth-gated) + `AIAssistant` (pagina completa en `/help`). Instalado `lucide-react`.
- **Sprint A.2 — Tool use** (commit `13bc3ea`): 5 tools scopeadas por user_id: `list_my_projects`, `get_project_status`, `list_problematic_skills`, `get_cost_summary`, `search_articles`. El bot lee datos reales del usuario.
- **Bug fixes AI** (commits `ece3a63`→`e9bac88`): tool flow con stopWhen=5, root cause Responses API vs Chat Completions, drop compatibility flag, fix column `sf_version`, fecha dinamica en system prompt, search_articles no inventa URLs. Endpoint debug `/api/help/chat-debug` agregado y removido.
- **Fix deploy** (commit `2d4ad33`): push cuando local esta ahead sin cambios pending.

**Marca Fluya — 2026-05-07**
- **Brand skill** (commit `f9aaa47`): FluyaLogo component, navbar/footer con logo, Tailwind extendido con namespace `fluya.*`, manifest.json PWA + iconos, middleware whitelist para manifest.

**Capa 2.5 — Sync state badges — 2026-05-06/07**
- **Surface 4** (commit `9db67a2`): migration `20260506100000` agrega `local_hash` y `registry_hash` a `project_skills`. Badges de estado sync en `<SkillPanel>`.
- **Pending state** (commit `8fe7cf0`): 5to SyncState `pending` para rows pre-Agent-push (evita falso "missing" rojo en rows legacy).

**Reports y Capa 1 cierre — 2026-05-05**
- **$/h estable + AI Activity tab** (commit `6823bbc`): fix formula $/h (dividir por total work_session del proyecto, no solo las linkeadas). Tab "AI Activity" en `/project/[name]`.
- **Fix wizard** (commit `0254612`): arrancar en paso name (-1) en vez de saltar a "El Dolor".

**Cleanup Sprint M — 2026-05-06**
- **Chunk 1** (commit `8383cf9`): eliminados servicios FS muertos: `sync-action`, `browse-action`, `scan-action`, `resolve-path`, `design-system-service`, `<DirectoryPicker>`, `useAuth`, `installSkillToProject` + `copyDir`. `tsconfig.tsbuildinfo` a `.gitignore`. Pausados (consumers vivos): `auto-commit-service`, `/api/tracking`, `git-service`, `scanner-service`.

### Decidido
- **Modelo AI chatbot**: gemini-2.0-flash via OpenRouter (costo bajo, tool calling funcional). GPT-4o-mini probado y descartado por problemas de tool flow.
- **Chat API usa Vercel AI SDK `streamText` + tools**, streaming text-plain compatible con componentes existentes.
- **Fecha dinamica en system prompt** (`__TODAY__`, `__CURRENT_MONTH__`) para evitar alucinaciones temporales.
- **`search_articles` NO inventa URLs** — solo `/help/<slug>` relativos desde BD.
- **Formula $/h**: costo claude del proyecto / total minutos work_session del proyecto (no solo sesiones linkeadas).
- **SyncState tiene 5 valores**: `synced`, `divergent`, `missing`, `external`, `pending`. Pending = rows legacy sin hashes hasta que el Agent pushee.

### Pendiente
- Aplicar migraciones pendientes en Supabase si no se aplicaron.
- Capa 3 del roadmap — CRUD remoto desde Manager.
- Migrar `auto-commit-service` y tracking al Agent (sprint dedicado).
- Cleanup chunk 2: `git-service`, `scanner-service`, `git-sync-action`.

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
