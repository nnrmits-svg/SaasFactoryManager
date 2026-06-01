# Sprint A — Estado final overnight (sesión Manager, 2026-06-01)

> Branch: `feat/sprint-a-1-base` · todo pusheado a remote.

## Pasos completados (plan autónomo)

| Paso | Qué | Commit | Estado |
|---|---|---|---|
| 1 | Mig 001 (roles enum + backfill + tablas RLS) | `1af906b` (aplicada por Riki vía dashboard) | ✅ aplicada + verificada |
| 2 | Refactor TS strings de rol + helpers | `0df32b0` | ✅ build verde |
| 3 | RLS / SECURITY DEFINER en código | (no-op, en `0df32b0`) | ✅ enforcement ya en DB |
| 4 | E2E middleware (smoke sin sesión) | evidence | ⚠️ login autenticado pendiente Riki |
| 5 | Middleware role-based enforcement + roles.ts | `5d3ad88` | ✅ build + smoke OK |
| 6 | Mig 002 (ABM: invitations + audit view + deactivated) | `e9c0a5e` (aplicada MCP) | ✅ aplicada + verificada |
| 7 | UI master list `/leader/usuarios` | `2258da2` | ✅ build verde |
| 8 | UI detalle `/leader/usuarios/[id]` | `d5ef6af` | ✅ build verde |

## Estado de la DB (prod, verificado)

- `user_role` = {leader, dev, comercial, cliente} · 3 profiles: ricardo=leader, nnrmits=dev, rmarchetti=comercial
- `is_leader()` / `is_leader_or_dev()` (renombradas preservando OID; 18 policies intactas)
- `project_assignments`, `client_project_access` creadas + RLS
- `projects` + sold_by_user_id, sold_at
- `user_status` = {active, suspended, pending, deactivated}
- `profiles` + deactivated_at, deactivated_by, last_login_at
- `user_invitations` (tabla + RLS) · `user_audit_log` (view sobre audit_logs)

## Build

`npm run build` verde en cada paso. Última: 28 rutas, typecheck OK, sin errores.

## ⚠️ Pendiente para Riki (cuando vuelva)

1. **E2E autenticado** (no pude — sin credenciales): loguear con los 3 users y confirmar
   navbar/user-menu/rol + enforcement del middleware + render de `/leader/usuarios` y `[id]`.
   Si me dejás credenciales de test, lo corro con Playwright.
2. **Alinear `resource='user'` vs `'profile'`** en las server actions de audit (user-actions.ts)
   para que el tab Historial del detalle muestre datos (hoy la view filtra 'user', el código
   loguea 'profile'). Decidir: cambiar el código o ampliar el WHERE de la view.
3. **Conflicto resuelto con criterio** (revisar si coincidís): middleware NO redirige a
   `/{rol}/dashboard` (no existen); usa `/dashboard` como landing/fallback común. Cuando se
   creen los layouts por rol, activar `DEFAULT_LANDING_BY_ROLE` (ya está en roles.ts).
4. **Merge a main + deploy**: la branch no se mergeó ni deployó (decisión tuya, tras E2E).

## STOPs respetados (NO tocados)

- Mig 003 (agent_instances — coordinación con Agent)
- Setup Resend/SMTP → por eso NO hay botón "Invitar" ni acciones reales
- Acciones Cambiar rol / Suspender / Desactivar → botones deshabilitados (solo UI)
- Mig 004+
