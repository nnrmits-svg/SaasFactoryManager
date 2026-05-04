# Bitacora — SaaS Factory Manager

> Registro cronologico de sesiones de trabajo. Mas reciente arriba.
> Mantenida automaticamente por el skill `bitacora`.
> Plan vivo del proyecto: ver `project_plan.md`.

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
