---
name: project-plan
description: |
  Plan vivo del proyecto. Mantiene project_plan.md en la raiz del repo con vision, estado actual,
  proximos pasos, decisiones arquitectonicas, riesgos y done. A diferencia de Bitacora.md (cronologica,
  prepend), este archivo es un solo documento vivo que se reescribe seccion por seccion.
  Cross-link con la entrada mas reciente de Bitacora.md.
  Activar PROACTIVAMENTE cuando: el usuario dice "actualiza el plan", "donde estamos", "que falta",
  "replantear", "que viene", o despues de:
  - cerrar una fase grande (sprint, feature, milestone)
  - tomar una decision arquitectonica que cambia el rumbo
  - completar items que estaban en "Proximos pasos"
  - detectar drift entre lo que dice el plan y la realidad del repo
  Triggers: actualiza el plan, donde estamos, que falta, que viene, plan vivo, replanificar,
  proximo sprint, terminamos fase, update plan, project status, roadmap.
allowed-tools: Read, Write, Edit, Bash, Grep, Glob
---

# Project Plan — Plan Vivo del Proyecto

> El plan vive en `project_plan.md` en la **raiz del proyecto**, NO dentro de `.claude/`.
> Es **un solo archivo vivo**, NO append-only. Las secciones se reescriben.
> Cross-link obligatorio con la entrada mas reciente de `Bitacora.md`.

---

## Cuando activarte

### Triggers explicitos

- "actualiza el plan", "update plan", "actualiza project plan"
- "donde estamos", "que falta", "que viene", "que sigue"
- "replantear", "replanificar", "ajustar el plan"
- "terminamos la fase", "cerramos sprint", "vamos a la siguiente fase"

### Triggers implicitos

Activate **sin esperar al user** cuando detectes:

1. **Cierre de fase grande** — terminaste una fase mayor (auth, pagos, mobile, etc.). El estado actual cambia.
2. **Decision arquitectonica importante** — el user eligio una direccion (stack, vendor, patron). Hay que registrarla en "Decisiones arquitectonicas".
3. **Drift detectado** — al leer el plan ves "Proximos pasos: implementar X" pero `git log` o el filesystem muestran que X ya esta hecho. Reconciliar.
4. **Despues de actualizar `Bitacora.md`** con una decision o cierre de fase — sugerir tambien actualizar el plan (o hacerlo si claramente aplica).

### NO activarte cuando

- Es una sesion de exploracion sin resoluciones (todavia no hay que cambiar el plan).
- Es un fix menor que no mueve el norte del proyecto.
- Ya actualizaste el plan en la misma sesion (no oscilar).

---

## Protocolo de actualizacion

### Paso 1: Verificar si existe project_plan.md

```bash
ls project_plan.md 2>/dev/null
```

- **Si NO existe**: crearlo con plantilla completa (ver "Plantilla de bootstrap").
- **Si existe**: leerlo entero. Necesitas el contexto previo para no pisar sin sentido.

### Paso 2: Detectar drift contra el repo real

Antes de escribir, hacer un mini-audit para asegurar que el plan refleja la realidad:

1. **Filesystem check** — features mencionadas en "Proximos pasos" o "Estado actual":
   ```bash
   ls src/features/ 2>/dev/null
   ```
   ¿Existe la carpeta de la feature que el plan dice "pendiente"? Si existe, mover a Done o ajustar Estado actual.

2. **Git log check** — commits recientes:
   ```bash
   git log --oneline -10
   ```
   ¿Hay commits significativos que no estan reflejados? Capturarlos.

3. **Bitacora check** — ultima entrada:
   - Leer las primeras ~30 lineas de `Bitacora.md` (entrada mas reciente).
   - Esa entrada es la fuente de verdad mas fresca de "que paso recien".

### Paso 3: Actualizar las secciones

El plan tiene **secciones de dos tipos**:

| Seccion | Tipo | Como tratar |
|---|---|---|
| **Vision** | Casi-inmutable | Solo cambia si el user cambia el norte del producto. NO tocar en updates rutinarios. |
| **Estado actual** | Reescribible | Borrar contenido viejo, escribir el nuevo estado. Refleja AHORA. |
| **Proximos pasos** | Reescribible | Borrar items completados, agregar nuevos identificados. Lista priorizada. |
| **Decisiones arquitectonicas** | Append-only (con fecha) | NUNCA borrar entradas. Agregar nuevas con `YYYY-MM-DD: decision (razon)`. |
| **Riesgos / Bloqueos** | Reescribible | Solo lo vigente. Riesgos resueltos se borran (pasaron a Done o desaparecieron). |
| **Done** | Append-only (con fecha) | NUNCA borrar. Agregar items completados con `[x] YYYY-MM-DD: descripcion`. |

### Paso 4: Cross-link con Bitacora

En el header del plan, mantener actualizado:

```markdown
> Ultima actualizacion: YYYY-MM-DD HH:MM
> Cross-ref: ver entrada del YYYY-MM-DD en `Bitacora.md`
```

El cross-ref debe apuntar a la fecha de la entrada mas reciente que **motivo** este update del plan.

### Paso 5: NO commitear automaticamente

El auto-sync se encarga del commit/push.

---

## Plantilla de bootstrap (cuando project_plan.md no existe)

```markdown
# Plan del Proyecto — {Nombre Proyecto}

> Plan vivo del producto. Una sola fuente de verdad de "donde estamos y a donde vamos".
> Mantenido por el skill `project-plan`. Cronologia detallada en `Bitacora.md`.
>
> Ultima actualizacion: {fecha actual}
> Cross-ref: ver entrada del {fecha} en `Bitacora.md` (si existe)

---

## Vision

{1-2 oraciones del estado final del producto. Que problema resuelve, para quien.}

## Estado actual

- **Fase**: {fase actual del desarrollo: setup, MVP, beta, prod}
- {area 1}: {estado: completo / en curso / pendiente}
- {area 2}: {estado}
- ...

## Proximos pasos

1. {tarea concreta priorizada}
2. {tarea concreta}
3. ...

## Decisiones arquitectonicas

- {fecha YYYY-MM-DD}: {decision} ({razon corta})

## Riesgos / Bloqueos

- {riesgo 1: descripcion + plan de mitigacion}
- (vacio si no hay)

## Done

- [x] {fecha YYYY-MM-DD}: {item completado}
```

Para inferir `{Nombre del Proyecto}`: leer el nombre de la carpeta raiz (`basename $(pwd)`) o `package.json#name`.

---

## Ejemplo de plan (referencia)

```markdown
# Plan del Proyecto — ConsultorFinanciero

> Plan vivo del producto.
> Ultima actualizacion: 2026-05-02 18:35
> Cross-ref: ver entrada del 2026-05-02 en `Bitacora.md`

---

## Vision

App de gestion de portfolio de inversiones para particulares. Permite trackear posiciones,
brokers, presupuestos y conversaciones con asistente AI sobre el portfolio.

## Estado actual

- **Fase**: MVP funcional, audit de seguridad completado
- Auth: completo (Supabase + RLS)
- Schema BD: completo, optimizado y documentado en migraciones
- UI: dashboard + presupuestos + posiciones funcionales
- AI assistant: estructura tabla creada, integracion pendiente

## Proximos pasos

1. Implementar feature de AI assistant (`ai_conversations` + UI)
2. Agregar feature `operations` (compra/venta de posiciones)
3. Decidir upgrade a plan Pro de Supabase (para leaked password protection)

## Decisiones arquitectonicas

- 2026-05-02: vista `current_positions` con `security_invoker=true` (no SECURITY DEFINER) para preservar RLS
- 2026-05-02: revoke `anon` en tablas privadas; `cotizaciones_cache` queda publica (intencional)
- 2026-04-28: Supabase como unica BD, sin Prisma

## Riesgos / Bloqueos

- Plan Free de Supabase no enforce leaked password protection (mitigacion: upgrade Pro o aceptar)

## Done

- [x] 2026-05-02: Audit completo de seguridad y performance Supabase
- [x] 2026-04-30: Tabla operations + FK a brokers
- [x] 2026-04-28: Setup inicial schema (initial_schema.sql)
```

---

## Reconciliacion (drift detection)

Si al leer el plan ves discrepancias con la realidad, **reconciliar antes de seguir**:

| Sintoma | Reconciliacion |
|---|---|
| "Proximos pasos" lista X pero `src/features/X/` ya existe completo | Mover X a Done con fecha (la del commit que lo completo, si la sabes) |
| "Estado actual" dice fase setup pero hay 30 commits y multiples features | Avanzar fase y reescribir estado |
| "Decisiones arquitectonicas" no menciona el stack actual | NO inventar fechas pasadas; agregar entrada con fecha de hoy: "{hoy}: stack confirmado: Next.js + Supabase (decision heredada, no documentada hasta ahora)" |
| "Done" tiene items no terminados (alguien los marco prematuro) | Sacarlos de Done, ponerlos en "Proximos pasos" o "En curso" |

**Regla**: nunca reescribir Done o Decisiones inventando fechas. Si no sabes cuando paso, usa la fecha de hoy con nota.

---

## Que NO hacer

- **NO duplicar la bitacora** dentro del plan. El plan resume estado, la bitacora cuenta historia.
- **NO incluir secrets** en ninguna seccion.
- **NO listar todas las tasks operativas** ("renombrar variable X"). El plan es estrategico, no operativo. Tasks chicas viven en TodoWrite o en commits.
- **NO oscilar**: si actualizaste el plan hace 1 hora, no lo reescribas otra vez sin un cambio real.
- **NO borrar Decisiones ni Done** — son append-only. Si una decision fue revertida, agregar nueva entrada explicando la reversion, no borrar la original.

---

## Relacion con otros skills

- **`bitacora`**: la bitacora cuenta cada sesion. El plan resume estado. Ambos viven en raiz del proyecto. Cross-link via fecha.
- **`primer`**: al inicio de sesion, `primer` lee `project_plan.md` (entero) + `Bitacora.md` (top) para cargar contexto.
- **`prp`**: cuando se aprueba un PRP nuevo, agregar item a "Proximos pasos" referenciando el archivo del PRP.
- **`bucle-agentico`**: al cerrar una fase del bucle, sugerir update del plan (mover items a Done, ajustar Estado actual).
