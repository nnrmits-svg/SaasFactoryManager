---
name: tablero
description: |
  Reporta el estado de ESTA sesión al Mission Control central de la SaaS Factory
  (qué proyecto, qué estás haciendo, en qué estado). Sirve para que el PMO/Arquitecto
  vea de un vistazo qué hace cada terminal/máquina/proyecto, en cualquier oficina.
  Activar PROACTIVAMENTE cuando: empezás a trabajar en un proyecto, cambiás de tarea,
  te quedás bloqueado, dejás algo en revisión, o terminás. También si el user dice
  "reportá al tablero", "actualizá el board", "marcá que estoy en X".
  Triggers: tablero, reportá al tablero, actualizá el board, mission control,
  marcá que estoy, estoy trabajando en, me bloqueé, dejo en revisión, terminé esto.
allowed-tools: Bash
---

# /tablero — Reportar al Mission Control

> Mantiene el tablero central al día con lo que hace ESTA sesión.
> El PMO/Arquitecto lo lee con `sf-board` para coordinar toda la Factory.

## Cuándo reportar
- Al **empezar** a trabajar en un proyecto → `status=working`.
- Al **bloquearte** (esperás algo) → `status=blocked` + qué te bloquea.
- Al dejar algo **en revisión** → `status=review`.
- Al **terminar** → `status=done`.

## Cómo (env de ~/.sf/env: SF_MANAGER_URL + SF_KB_TOKEN)

```bash
curl -s -X POST "$SF_MANAGER_URL/api/pmo" \
  -H "Authorization: Bearer $SF_KB_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"machine\": \"$(scutil --get ComputerName 2>/dev/null || hostname -s)\",
    \"project\": \"NOMBRE-DEL-PROYECTO\",
    \"role\": \"executor\",
    \"status\": \"working\",
    \"current_task\": \"qué estás haciendo ahora\",
    \"next_task\": \"qué sigue (opcional)\"
  }"
```

O el atajo (si el dev tiene los aliases): `sf-report "proyecto" "working" "qué hago"`.

## Reglas
- `machine` = `hostname -s` (la máquina actual). `project` = el repo/workstream.
- `role`: `executor` (proyecto normal), `hub` (el PMO), `agent` (el SF Agent).
- `status` ∈ working · blocked · review · idle · done.
- Mantenelo CORTO y actual — es un pulso, no un changelog. El upsert pisa el anterior.
- Si falta SF_MANAGER_URL/SF_KB_TOKEN, avisá que falta correr `setup-workstation`.
- Ver el tablero completo: `sf-board`.
