# Plan del Proyecto — SaaS Factory Manager

> Plan vivo del producto. Una sola fuente de verdad de "donde estamos y a donde vamos".
> Mantenido por el skill `project-plan`. Cronologia detallada en `Bitacora.md`.
>
> Ultima actualizacion: 2026-05-04 18:34
> Cross-ref: ver entrada del 2026-05-04 18:34 en `Bitacora.md`

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

- **Fase**: post-MVP, Sprint Camino-3 cerrado (UI desacoplada del filesystem). Listo para arrancar Capa 2 del roadmap.
- **Stack**: Next.js 16 + React 19 + Supabase (proyecto ref `fxlvexilnrfkkcbzwskr`) + Vercel.
- **Auth**: middleware Supabase activo (`src/middleware.ts`), redirect a `/login` para rutas protegidas.
- **Wizard de creacion de proyectos**: completo — 10 pasos (9 brief + 1 skills), integrado con SF Agent via `agent_commands`.
- **Schema BD**:
  - Tabla `projects` extendida con 7 columnas para tracking async: `agent_status`, `local_path`, `github_repo_url`, `github_owner`, `agent_error`, `skills_to_apply`, `created_by_command_id`.
  - Tabla `agent_commands` soporta type `'create-project'` (Capa 3 *del proyecto* — no confundir con Capa 3 del roadmap global).
  - Tabla `claude_sessions` aplicada (lado Manager pendiente UI; ver "Proximos pasos").
  - Tabla `project_skills` poblada por SF Agent al boot (`pushInitialProjectSkills()`) + chokidar para cambios futuros. Lista para ser fuente de verdad de Capa 2.
- **Frontend del flujo de creacion**: hook `useProjectCreation` + componente `ProjectCreatingModal` cableados; `Project.localPath` mapeado y consumido por `<ProjectDetailView>` y `<PortfolioGrid>` con UI de espera cuando no hay path real.
- **Entorno**: `.env.local` rellenado manualmente desde dashboard de Supabase (Plan B aplicado tras incidencia con SOPS); `npm run dev` levanta limpio.
- **UI desacoplada de filesystem (Sprint Camino-3)**: 6 surfaces que tocaban filesystem desde el Manager quedan deshabilitadas con tooltip "⚠ Disponible próximamente vía Agent" — `<SyncButton>`, "Re-sync", "Auto-Commit Tracking", `<DirectoryPicker>`, catalogo de `<SkillRegistryDashboard>`. Fallbacks ilegales en `<SkillPanel>` y `<SkillRegistryDashboard>` eliminados (instalar skill ahora requiere Agent online). Codigo legacy borrado: `open-action.ts`, `create-action.ts`.
- **Servicios FS no eliminados** (cleanup queda para Capa 2/3): `auto-commit-service`, `git-service`, `scanner-service`, `git-sync-action`, `scan-action`, `browse-action`, `sync-action`, `sync-service`, `design-system-service`, `resolve-path`, `installSkillToProject`. Quedan en disco pero sin consumers desde la UI.

## Proximos pasos

1. **Decidir commit + push del Sprint Camino-3** para tener Vercel preview verde con la UI honesta. 7 archivos modificados + 1 borrado + 2 carpetas de skills sin trackear.
2. **Capa 2 — Skills visibles en Manager** (sprint siguiente, esfuerzo S):
   - Reemplazar `getProjectSkills(path)` (FS) por lectura de tabla `project_skills` en `<SkillPanel>`, `<PortfolioGrid>` y `<SkillRegistryDashboard>`. Pre-condicion del lado Agent **ya cubierta** (`pushInitialProjectSkills()` al boot + chokidar para cambios).
   - Estado por skill: `synced` / `divergent` / `missing`.
   - Reemplazar `discoverAllSkills()` (FS) por catalogo estatico en repo o tabla en Supabase (decidir).
3. **Capa 1 — Tracking fino de actividad** (sprint siguiente, esfuerzo M):
   - ~~Schema `claude_sessions`~~ ✓ aplicado 2026-05-04.
   - Versionar el SQL de la migration en `supabase/migrations/` (deuda inmediata: se aplico manualmente al dashboard sin quedar en el repo).
   - UI: leer `claude_sessions` en `/reports`, visualizar tokens / costo USD / model / prompt count.
4. **Capa 3 del roadmap — CRUD remoto** desde Manager: editar/borrar proyecto, re-aplicar skills.
5. **Capa 8 — Selector de `github_owner` (orgs)**.
6. **PRP propio para migrar `auto-commit-service` y `sync` al SF Agent** (post-Capa 2). Cuando este listo, deshabilitar tooltips se vuelven funcionalidad real ruteada por `agent_commands`.
7. **Cleanup post-migracion**: borrar los servicios FS ahora orphan (lista detallada en "Estado actual"), borrar `installSkillToProject` y `<DirectoryPicker>`.
8. Resto de capas en el PRP global (vive en el repo del SF Agent: `.claude/PRPs/prp-global-manager-agent-roadmap.md`).

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

- **Migration `claude_sessions` aplicada manualmente sin versionar en el repo** — la tabla existe en el proyecto Supabase pero el SQL no esta en `supabase/migrations/`. Cualquier ambiente nuevo (otra maquina, fresh clone, branch nuevo) NO la tendra. Mitigacion: pedirle al user el SQL y commitearlo apenas se pueda.
- **`useTracking` sigue firing fetch a `/api/tracking` al montar `/project/[name]`** — el boton de Start/Stop ya esta disabled pero el hook hace una request inicial que en Vercel va a 500. Una request por page load (no poll). Ruido en logs de prod, no funcionalidad rota. Mitigacion: queda hasta que se migre el tracking al Agent.
- **Servicios FS dead-but-not-deleted** — `auto-commit-service`, `git-service`, `scanner-service`, etc. siguen en disco pero sin consumers. Si alguien los re-importa por error, vuelve a violar el criterio Vercel-only. Mitigacion: el cleanup forma parte de Capa 2/3.
- **Coordinacion entre los dos Claudes** (uno por repo) tocando ambos Supabase — riesgo de race conditions o decisiones desincronizadas. Mitigacion actual: git push/pull + auto-sync, bitacora compartida via repo. Vigilar si crece la friccion.
- **PRP global vive en otro repo** (SF Agent) — el contexto completo del roadmap no esta en este repo; hay que pedirlo o consultarlo manualmente cuando haga falta detalle.

## Done

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
