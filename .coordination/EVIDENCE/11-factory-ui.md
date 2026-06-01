# PASO 11 — UI Factory "Trabajando ahora"

## Construido
- `factory-sessions-action.ts` → listFactoryProjects(): projects + sesiones activas
  (project_active_sessions JOIN agent_instances + profiles) + owner + type + lifecycle + contributor_count.
- `factory-table.tsx`: tabla limpia, 1 línea x proyecto: Proyecto | Type (badge) | Owner | Trabajando ahora | 👥 N ▸.
  Status: 🟢 editing/synced · 🟡 stale · 🔴 conflict · ⚪ sin sesión. Secciones: En producción / Pipeline / Archivados.
- `/leader/proyectos/page.tsx`: server, gate isLeader.
- `factory-detail-action.ts` + `project-detail-card.tsx` + `/leader/proyectos/[id]/page.tsx`:
  ventana detalle con tabs [Resumen] [Contributors] [Historia] [Configuración].
  Contributors lee la view project_contributors; Historia lee project_activity_log.
  Deployments y acciones (Transferir/Archivar) = placeholder/deshabilitados (Sprint D / STOP).

## Verificación
- Build verde (30 rutas). Smoke sin sesión: /leader/proyectos y /leader/usuarios → 307 /login (auth-gate OK, sin crash).
- Infra de datos: 7 projects (todos con owner_user_id). project_active_sessions=0,
  project_contributors=0 → el Factory hoy muestra los 7 con "⚪ sin sesión / 👥 0".

## ⚠️ Test e2e 11.5 — pendiente (depende de 2 cosas que no controlo en autónomo)
1. **Login de leader** (sin credenciales en autónomo) → para ver la UI renderizada.
2. **El Agent autenticado escribiendo project_active_sessions** (hoy el Agent no está
   logueado — ver PDF: "Sign in failed"). Cuando ambas pasen, el proyecto donde corre el
   Agent mostrará "🟢 ricardo @ MacBookPro-2016".
   → La cadena Agent→Supabase→Manager está lista del lado Manager; falta el login del Agent + el de un leader.
