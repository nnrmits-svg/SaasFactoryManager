# Mig 001 — APLICADA vía Dashboard Supabase

> **Fecha**: 2026-05-31
> **Aplicada por**: Riki (Leader) vía Dashboard SQL Editor
> **Coordinado por**: Nexo (esta sesión)
> **DB**: prod `fxlvexilnrfkkcbzwskr` (Fluya IA Team, free plan)

---

## Por qué via dashboard

El bloqueo del Manager autonomous mode tenía 2 puntos:
1. `mcp__supabase__apply_migration` denegado por safeguard (necesitaba backup binario real)
2. `git commit/push` denegado por false positive del Content Integrity classifier

Decisión del Leader: aplicar las 2 migrations manualmente desde dashboard SQL Editor.
Safeguards considerados suficientes:
- PITR automático del plan free (1 día retention, backup binario continuo)
- Backup lógico hecho por Manager (`01-backup-pre-mig-001.sql`) cubre rollback específico
- Migrations son reversibles excepto `ADD VALUE 'comercial'` que es inocuo

## Cómo se aplicaron

Paso 1 — Mig 001a (rename enum):
```sql
ALTER TYPE user_role RENAME VALUE 'founder'  TO 'leader';
ALTER TYPE user_role RENAME VALUE 'operator' TO 'dev';
ALTER TYPE user_role RENAME VALUE 'client'   TO 'cliente';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'comercial' AFTER 'dev';
```
Resultado: `Success. No rows returned`

Paso 2 — Verify intermedio:
```
valores
─────────
leader
dev
comercial
cliente
```
✅ 4 valores presentes en el enum.

Paso 3 — Mig 001b (backfill + helpers + tablas + columnas projects):
Aplicada en una sola transacción.
Resultado: `Success. No rows returned`

Paso 4 — 4 Verifies finales (todos OK confirmado por Leader):
1. `SELECT email, role FROM profiles` → 3 rows con leader/dev/comercial
2. `is_leader`, `is_leader_or_dev` existen (viejos NO)
3. `project_assignments`, `client_project_access` creadas
4. `sold_by_user_id`, `sold_at` agregadas a `projects`

## Estado post-mig 001

- enum `user_role` = `{leader, dev, comercial, cliente}`
- profiles backfilled:
  - ricardo@grupoits.com.ar → leader
  - nnrmits@gmail.com → dev
  - rmarchetti@grupoits.com.ar → comercial
- helpers renombrados (preservaron OID, las 18 dependencias siguen válidas)
- 2 tablas nuevas con RLS: project_assignments, client_project_access
- 2 columnas nuevas en projects: sold_by_user_id, sold_at + índice

## Próximos pasos

- Sesión Manager retoma desde PASO 2 (refactor TS strings de roles)
- TODO el plan autónomo nocturno sigue válido a partir de aquí
- Pendiente: rotar DB password (estuvo en contexto de chat para esta operación)
- Próximo bloqueo coordinado: Mig 003 (cross-repo con Agent)

## Coordinación con sesión Agent

La sesión Agent completó las 6 fases del bloque autónomo durante la noche:
- 42/42 tests passing
- AgentInstanceService con fallback graceful (42703/42P01) — sigue funcionando con el schema viejo y NO va a romper con el ALTER de Mig 003
- Activity-tracker service standalone
- Sessions tab UI funcional con data real

Cuando Manager llegue a Mig 003, coordinamos el ALTER de `agent_instances` con la sesión Agent para minimizar downtime.

---
*Generado por nexo. Manager puede continuar con su plan autónomo.*
