---
name: buscar-conocimiento
description: |
  Busca en la SF Knowledge Base central (Supabase del SF Manager) soluciones, decisiones,
  patrones y gotchas que ya resolvió el equipo en otros proyectos. Búsqueda full-text en
  español. Usar cuando topás un problema y querés saber si ya hay conocimiento al respecto
  ANTES de resolverlo de cero.
  Activar PROACTIVAMENTE cuando: el user pregunta "¿esto ya lo resolvimos?", "buscá en la
  KB ...", "¿hay algo sobre X en la base?", o cuando estás por encarar un problema típico
  (RLS, auth, pagos, deploy, migraciones) y conviene chequear la KB primero.
  Triggers: buscar conocimiento, buscá en la kb, esto ya lo resolvimos, hay algo sobre,
  consultá la base de conocimiento, kb search, search knowledge base.
allowed-tools: Bash
---

# Buscar Conocimiento — consultar la SF Knowledge Base

> Consulta la KB **central** antes de resolver algo de cero.
> Lo que encuentres lo resolvió otro dev en otro proyecto — reusalo, no reinventes.
> Spec: `kit-comercial/dev/docs/SF-KNOWLEDGE-BASE.md`.

---

## Cuándo activarte

- El user pregunta si algo ya se resolvió.
- Estás por encarar un problema típico (RLS, auth, pagos, deploy, migración, anti-bot...).
- Antes de invertir tiempo en un workaround: chequeá si ya existe.

---

## Qué necesitás del entorno

```
SF_MANAGER_URL   → ej: https://saasfactory.grupo-its.com.ar
SF_KB_TOKEN      → (opcional para lectura de items approved; requerido para ver pending)
```

---

## Cómo buscar

### 1. Lanzá la consulta

```bash
curl -fsS -G "$SF_MANAGER_URL/api/knowledge/search" \
  --data-urlencode "q=rls policy supabase" \
  --data-urlencode "limit=5" \
  ${SF_KB_TOKEN:+-H "Authorization: Bearer $SF_KB_TOKEN"}
```

Devuelve un JSON con los items rankeados por relevancia (full-text español + veces usado).

### 2. Mostrá los resultados inline

Formateá legible para el dev:

```
📚 KB — 2 resultados para "rls policy supabase":

🔧 RLS write policy faltante en project_active_sessions   #supabase #rls · usado 4x
   "Faltaba una policy FOR ALL. El upsert fallaba con violates RLS."
   CREATE POLICY users_manage_own_sessions ON project_active_sessions
     FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

💡 Cliente Supabase necesita URL base sin /rest/v1/   #supabase #gotcha · usado 2x
   "Si le pasás la URL con /rest/v1/ el cliente rompe. Usá la base."
```

### 3. Si no hay resultados

```
📚 KB — sin resultados para "X".
   → Si lo resolvés ahora, capturalo con /capturar-conocimiento para el próximo.
```

---

## Reglas

- Probá variantes de la query si la primera no trae nada (sinónimos, términos en inglés/español).
- Si un item trae `code_snippet`, mostralo — es lo más útil.
- Cerrá siempre sugiriendo `/capturar-conocimiento` si el dev terminó resolviendo algo nuevo.
- No inventes resultados: si la API no devuelve nada, decí que no hay.
