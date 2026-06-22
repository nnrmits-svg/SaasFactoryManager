# Review — Motor de Presupuesto MVP

> Revisión de código del Manager (Claude) sobre `feat/motor-presupuesto`, 2026-06-22.
> **Para retomar mañana con el Arquitecto.** Borrar este archivo antes del merge a main
> (igual que la página temp `app/(main)/leader/test-presupuesto/`).
>
> Estado: typecheck limpio · tipos resuelven OK · diff = 4 archivos
> (`labor-estimator.ts`, `labor-estimator-action.ts`, `budget-step.tsx`, `factory-table.tsx`).
> **Mergeable cuando Riki dé OK.** Nada bloqueante salvo F1 (recomendado cerrar antes de uso comercial real).

---

## ✅ Lo que está bien
- Separación correcta: estimador server-only (OpenRouter, `OPENROUTER_API_KEY`) detrás de server action con auth. El client nunca ve la key.
- `extractJson` defensivo: limpia fences ` ```json ` + fallback regex `{...}`.
- `reasoning` se construye server-side (determinístico), no se confía en el modelo para el resumen.
- `normalizeFeature` ordena min/max y clampea confidence 0..1.
- Complementa `ai-estimator.ts` sin pisarse (uno estima tokens/USD, el otro horas).

---

## 🔴 F1 — Estimación-cero silenciosa (cerrar antes de uso comercial)
**Archivo:** `services/labor-estimator.ts` — `RawSchema` (líneas ~58-65) + `estimateLaborHours`.

Todos los campos de `RawSchema` tienen `.default()`. Si la respuesta de la IA se trunca
(`finish_reason: 'length'`) o sale corrupta → `extractJson` devuelve `{}` → `RawSchema.parse({})`
**NO tira error**: parsea a un estimate "válido" con `must_have: []`, `total: 0h`, `confidence: 0.5`.
El comercial vería **"IA estima: 0–0h, confianza 50%"** como respuesta real, y `applySuggestedHours`
aplicaría 0h al presupuesto.

`max_tokens: 6000` reduce la probabilidad pero no la elimina (brief con ~15 features + notas largas
todavía trunca).

**Fix sugerido (~10 líneas en `estimateLaborHours`):**
- Leer `data.choices[0].finish_reason`; si es `'length'` → `throw new Error('respuesta truncada, reintentá')`.
- Tras `RawSchema.parse`, si `must_have_estimations.length === 0` → `throw` (en vez de devolver 0h).

---

## 🟡 Menores (caen naturalmente al wirear el flujo de Anteproyecto)
- **F2 — sin timeout en `fetch`** a OpenRouter: si cuelga, el botón queda "Estimando…" hasta el
  timeout de la función (300s). Agregar `AbortController` ~45s.
- **F3 — la action solo valida `getUser()`, sin rol.** Hoy OK (wizard huérfano, no alcanzable).
  Al wirearlo al flujo de Anteproyecto, agregar `requireRole(['leader','comercial'])` — sino
  cualquier autenticado puede quemar tokens de OpenRouter.
- **F4 — `baselineHoursMin/Max` y `mustHave/niceToHave` están en `LaborEstimateInput` pero la UI
  no los pasa** (solo `{brief, complexity}`). El anclaje al baseline del `project_template` queda
  pendiente de wiring — natural para el próximo bloque.
- **F5 (nit) — `overall_confidence` se toma crudo del modelo**, sin cross-check contra las
  confidences por-feature. Aceptable; es criterio del modelo.

---

## Recordatorios de merge (del handoff del Arquitecto)
- Mergear **solo los 4 archivos del Motor** — NO arrastrar el ruido de `.claude/` del working tree
  (`.sf-version.json`, `skills/`, backups — son del lío del kit del 18/6).
- Borrar la página temp `app/(main)/leader/test-presupuesto/` (hoy está untracked, no entra al merge).
- Borrar este `REVIEW-motor-presupuesto.md`.
- El Motor NO es alcanzable en la UI tras el merge (vive en el wizard huérfano). Su hogar es el
  flujo de Anteproyecto (Capa Comercial). No esperar verlo "funcionando" en prod.
