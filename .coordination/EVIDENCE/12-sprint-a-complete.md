# Sprint A — COMPLETO (lado Manager) · 2026-06-01

> Branch `feat/sprint-a-1-base` · todo pusheado · **NO mergeado** (PR review con Riki pendiente).

## Migraciones (001-006) — todas aplicadas a prod y verificadas

| Mig | Qué | Estado |
|---|---|---|
| 001 | roles enum rename + backfill + project_assignments/client_project_access + RLS | ✅ (`1af906b`) |
| 002 | ABM: user_invitations + user_audit_log view + status 'deactivated' | ✅ (`e9c0a5e`) |
| 003 | ownership + agent_instances ALTER + active_sessions + capabilities + transfers | ✅ (`0831871`) |
| 004 | history: activity_log + summaries + handoff_notes + view project_contributors | ✅ (`72b68a0`) |
| 005 | project_types (11) + projects cols + templates (8) + get_type_defaults | ✅ (`72b68a0`) |
| 006 | deployments + previews + RLS | ✅ (`72b68a0`) |

**13 tablas + 4 enums.** Conflictos detectados y resueltos en el camino:
- Mig 001: ADD VALUE en tx → split 001a/001b; DROP FUNCTION con 18 deps → ALTER RENAME (OID).
- Mig 003: #1 dup machine_name → Opción B (sin UNIQUE, decisión nexo); #2 ADD VALUE redundante;
  #3 backfill caps existentes; #4 policies redundantes; #5 colisión nombre índice → idx_active_sessions_*.
- Mig 004: 'current_role' keyword → entrecomillado.
- Sincronizado .sql de 003 con fix de prod (constraint incluye 'active', v1/v2).

## Código (TS / UI)

| Commit | Qué |
|---|---|
| `0df32b0` | refactor roles (founder/operator/client → leader/dev/comercial/cliente), 14 archivos |
| `5d3ad88` | middleware role-based + roles.ts |
| `2258da2` | /leader/usuarios (master list) |
| `d5ef6af` | /leader/usuarios/[id] (detalle) |
| `22fccfb` | audit resource='user' + actions alineadas con view |
| `e5d92e2` | Factory "Trabajando ahora" + /leader/proyectos + [id] (tabs) |

Build verde en cada commit. 30 rutas.

## Estado funcional
- Roles: 3 profiles backfilled (ricardo=leader, nnrmits=dev, rmarchetti=comercial).
- user_capabilities: 3 (leader/dev/comercial) con defaults correctos.
- agent_instances v2: el Agent v1.1.29 sigue reportando (online, last_seen_at). Schema v2 listo.
- Factory UI lee project_active_sessions (hoy 0 — el Agent reporta tras autenticarse).

## ⚠️ Pendiente (Riki / coordinación)
1. **Login del Agent** (ver PDF: "Sign in failed") → para que escriba project_active_sessions y el Factory muestre "🟢 … @ …".
2. **E2E autenticado** del Manager (sin credenciales en autónomo): login leader/dev/comercial.
3. **PR review + merge a main** (12.2 — coordinado con Riki).
4. STOPs vigentes: Resend/invites, acciones reales (Cambiar rol/Suspender/Desactivar/Transferir/Archivar), Sprint B.
