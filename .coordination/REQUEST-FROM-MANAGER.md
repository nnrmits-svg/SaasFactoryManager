# Request from Manager → Nexo (+ Agent)

> **Date**: 2026-05-30
> **From**: Sesión MANAGER (SaasFactoryManager)
> **Status**: BLOQUEANTE — recon de Sprint A completo, las migrations 001-006 NO encajan tal cual con la DB viva.
> **DB**: Supabase ref `fxlvexilnrfkkcbzwskr` (prod, compartida con SF Agent v1)

---

## 🔴 DECISIÓN #1 (la madre de todas) — Modelo de roles

El spec asume `CREATE TYPE user_role AS ENUM ('comercial','dev','cliente','leader')`.
**Pero ese enum YA EXISTE en prod con otros valores:**

```
user_role = { founder, operator, client }     ← VIVO, 3 profiles, 7 RLS policies, 4 functions, código TS
```

Mapeo conceptual evidente: `founder→leader`, `operator→dev`, `client→cliente`, **falta `comercial`**.

Pero NO puedo elegir solo, porque de esto dependen: `is_founder()`, `is_founder_or_operator()`,
`current_user_role()`, 7 policies RLS (`= 'operator'::user_role`, etc.), `navbar.tsx`,
`features/auth/services/permissions.ts`, y el callback de invites.

**Necesito que NEXO/Riki elija UNA:**

- **Opción A — Renombrar in-place** (`ALTER TYPE ... RENAME VALUE founder→leader, operator→dev, client→cliente` + `ADD VALUE comercial`).
  - ✅ Limpio a largo plazo, alinea con specs y rutas `/leader /dev /comercial /cliente`.
  - ⚠️ Rompe en cascada todo el código/funcs/policies que comparan con los literales viejos → hay que refactorizar `is_founder()`, policies, `permissions.ts`, `navbar.tsx` en el MISMO PR. Costo alto, una sola vez.
- **Opción B — Mantener {founder,operator,client} + agregar `comercial`** y mapear en una capa de traducción (`ROLE_ALIAS`).
  - ✅ No rompe nada vivo, rápido.
  - ⚠️ Deuda permanente: el enum dice `founder` pero la UI dice `/leader`. Confunde.
- **Opción C — enum nuevo `app_role` v2** y migración de datos + deprecación del viejo. Más trabajo, más limpio que B, menos disruptivo que A en el código existente.

> **Mi recomendación (Manager): Opción A**, hecha con cuidado en un solo PR atómico, porque los 4 roles del spec son la fundación de todo el Sprint A y arrastrar alias (B) ensucia los 6 sprints siguientes. Pero es decisión de NEXO.

---

## 🔴 DECISIÓN #2 — `agent_instances` ya existe (contrato VIVO del Agent v1)

Mig 003 hace `CREATE TABLE agent_instances (...)`. **Ya existe, 5 rows, la usa el SF Agent hoy.**

| Spec 003 quiere | Realidad (Agent v1) |
|---|---|
| `machine_name, hostname, os_version, agent_version, first_seen_at, last_seen_at, status(online/offline/inactive)` | `machine_name, machine_id, os_type, agent_version, last_heartbeat, status(default offline), config jsonb` |
| `UNIQUE(user_id, machine_name)` | (verificar índice actual) |

→ `CREATE TABLE` fallaría. Y cambiar columnas que el Agent ya escribe rompe a la otra sesión.

**Request al Agent (vía Nexo):** ¿la sesión Agent puede adoptar el schema del spec (`hostname`, `os_version`, `first_seen_at`, `last_seen_at`) o conviene que Manager haga un `ALTER TABLE ADD COLUMN` aditivo y mapee `last_heartbeat`↔`last_seen_at`, `os_type`↔`os_version`? **Esto es contrato compartido — no lo toco sin OK del Agent.**

---

## 🔴 DECISIÓN #3 — `project_active_sessions` (dependencia crítica del Agent)

NO existe aún. La crea mig 003. **El Agent la necesita para reportar sesiones.** Tan pronto NEXO valide
el schema de 003, la creo y aviso por commit `@nexo` para desbloquear a la sesión Agent.

**Request:** confirmar que el schema del spec (status `editing/synced/stale/conflict`, unique index `editing` por proyecto) es el contrato final que el Agent va a escribir, antes de que lo cree.

---

## 🟡 CONFLICTO #4 — `projects` no tiene lo que asumen 003/005

- Mig 003: `ADD owner_user_id ... backfill = created_by` → **no existe `projects.created_by`** (hay `user_id` y `created_by_command_id`). → backfilleo desde `user_id`.
- Mig 003: `ALTER TYPE project_lifecycle_status ADD VALUE 'preproject'` → **el enum `project_lifecycle_status` NO existe**. `projects.status` es `TEXT CHECK (active/archived/paused)`. → ¿creamos el enum nuevo `project_lifecycle_status` y migramos `status`→`lifecycle_status`, o agregamos `preproject` al CHECK de text actual?

**Request:** ¿migro `projects.status` (text) a un enum `project_lifecycle_status` nuevo (con `preproject, active, paused, completed, archived`), o mantengo `status` text y solo extiendo el CHECK? El spec asume enum.

---

## 🟡 CONFLICTO #5 — audit log duplicado

Spec 002 crea `user_audit_log`. Ya existe `audit_logs` (genérico, 7 rows, `founders_read_audit_logs`, con `action/resource/details/ip`).
**Request:** ¿reutilizo `audit_logs` (ya cubre el caso) o creo `user_audit_log` separada como pide el spec? Mi voto: reutilizar `audit_logs`, evitar 2 tablas de auditoría.

---

## 🟢 SIN CONFLICTO (puedo crear apenas se aprueben 1-4)

`project_assignments`, `client_project_access`, `user_capabilities` (+trigger), `project_transfers`,
`project_activity_log`, `contributor_summaries`, `project_handoff_notes`, view `project_contributors`,
`project_templates` (+seed), `project_deployments`, `project_deployment_previews`,
columnas nuevas en `projects` (`project_type`, `has_database`, `has_auth`, `is_multi_tenant`, `deploys_to`, `runtime_stack`).
`pgcrypto` instalado → `gen_random_uuid()` OK.

---

## Datos útiles para Nexo

- **Profiles (3):** `ricardo@grupoits.com.ar` (founder/leader), `nnrmits@gmail.com` (operator), `rmarchetti@grupoits.com.ar` (operator). **El email del spec `nnrm.its@gmail.com` NO existe** → el backfill `SET role='leader' WHERE email='nnrm.its@gmail.com'` no matchearía. ¿Cuál es el leader real? (asumo `ricardo@grupoits.com.ar`).
- **Projects (7):** SaasFactoryAgent, ConsultorFinanciero, SaasFactoryManager, SuscriptionsMgmt, Yuseff-inmobiliaria, **dibseguros** (existe! discovered), gestion-arca. Ninguno tiene `client_id` seteado.
- **Migrations versionadas en repo:** prefijo `20260504...20260520`. Las del Sprint A entrarían como `20260530_001..006`.

---

## Pregunta de proceso

¿NEXO quiere que aplique las migrations contra un **branch de Supabase** (`create_branch`, testeo, merge) o **directo a prod con cuidado**? El spec pide branch. Espero indicación.

---

*Esperando validación de NEXO sobre Decisiones #1-#5 antes de tocar DDL.*
