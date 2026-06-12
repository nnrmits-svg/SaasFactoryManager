---
name: capturar-conocimiento
description: |
  Captura una pieza de conocimiento reutilizable (solución, decisión, patrón, gotcha o
  anti-patrón) y la guarda en la SF Knowledge Base central (Supabase del SF Manager),
  como pending_review para que el Leader la apruebe.
  Es la captura MANUAL de la KB (la automática la hace el harvester en Capa 2).
  Activar PROACTIVAMENTE cuando: el usuario dice "guardá esto en la KB", "esto vale la
  pena documentarlo", "capturá este aprendizaje", "agregá a la base de conocimiento",
  o cuando acabás de resolver un bug raro / tomar una decisión técnica / descubrir un
  gotcha que el próximo dev va a topar.
  Triggers: capturar conocimiento, guarda esto en la kb, agregá a la base de conocimiento,
  documentá este aprendizaje, esto vale la pena guardarlo, kb capture, save to knowledge base.
allowed-tools: Read, Bash
---

# Capturar Conocimiento — alimentar la SF Knowledge Base

> Guarda conocimiento reutilizable en la KB **central** (Supabase del SF Manager).
> NO es memoria local (eso es `memory-manager`) ni bitácora cronológica (`bitacora`).
> Lo que capturás acá lo encuentra **cualquier dev en cualquier proyecto** con `/buscar-conocimiento`.
> Spec: `kit-comercial/dev/docs/SF-KNOWLEDGE-BASE.md`.

---

## Cuándo activarte

- El user lo pide explícito ("guardá esto en la KB").
- Resolviste algo no obvio que se va a repetir (un bug raro, un workaround).
- Tomaste una decisión técnica con un porqué que conviene no perder.
- Descubriste un gotcha / anti-patrón.

Si dudás entre capturarlo o no: **preguntá al user** "¿lo guardo en la KB?".

---

## Qué necesitás del entorno

Dos variables (las setea `setup-workstation`; viven en el shell del dev o en `~/.sf/env`):

```
SF_MANAGER_URL   → ej: https://saasfactory.grupo-its.com.ar
SF_KB_TOKEN      → token de ingesta de la KB (Bearer)
```

Si falta alguna, avisá al user: "Falta SF_KB_TOKEN/SF_MANAGER_URL — configurá setup-workstation o cargalas a mano".

---

## Cómo capturar (paso a paso)

### 1. Estructurá el item con el user

Determiná estos campos (preguntá lo mínimo, inferí el resto del contexto de la sesión):

| Campo | Valores / ejemplo |
|---|---|
| `dimension` | casi siempre `development` (manual). `platform` solo si es un cambio del kit |
| `item_type` | `solution` · `decision` · `pattern` · `gotcha` · `anti_pattern` |
| `title` | una línea clara y buscable ("RLS write policy faltante en sessions") |
| `body` | el conocimiento en sí, conciso |
| `context` | el PORQUÉ / cuándo aplica |
| `code_snippet` | el código de la solución si aplica |
| `tags` | `["supabase","rls"]` |
| `tech_stack` | `["nextjs","supabase"]` |

### 2. Insertá vía la API del Manager

Armá el JSON y mandalo. **Confirmá con el user antes de mandar** (mostrale el título + tipo):

```bash
curl -fsS -X POST "$SF_MANAGER_URL/api/knowledge/capture" \
  -H "Authorization: Bearer $SF_KB_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "dimension": "development",
    "item_type": "gotcha",
    "title": "RLS write policy faltante en project_active_sessions",
    "body": "El upsert del session-reporter fallaba con violates RLS. Faltaba una policy FOR ALL.",
    "context": "Pasa cuando una tabla tiene RLS enabled pero solo policies de SELECT.",
    "code_snippet": "CREATE POLICY users_manage_own_sessions ON project_active_sessions\n  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());",
    "tags": ["supabase","rls","gotcha"],
    "tech_stack": ["supabase","nextjs"],
    "source_type": "manual_dev",
    "source_ref": "captura manual"
  }'
```

La API inserta con `status = pending_review` y devuelve el `id`.

### 3. Confirmá al user

```
✅ Guardado en la KB (pending_review): "RLS write policy faltante en project_active_sessions"
   El Leader lo va a aprobar desde el Manager → Conocimiento.
```

---

## Reglas

- **Nunca** metas secretos/credenciales en el body o snippet. Si el ejemplo tiene una key, reemplazala por `<TOKEN>`.
- Un item = una idea. Si hay 3 aprendizajes, son 3 capturas.
- `title` tiene que ser **buscable** (pensá qué tipearía el próximo dev).
- Si el user no confirma, no mandes nada.
- Errores de red/token: reportá el status HTTP y no reintentes en loop.
