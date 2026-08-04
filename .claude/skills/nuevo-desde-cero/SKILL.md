---
name: nuevo-desde-cero
description: "Skill para arrancar una app nueva sin contexto previo (sin reunión ni handoff del comercial). Toma una descripción libre del dev, genera PRD vía design-labs, lo audita con sensei-reviewer, y scaffoldea el proyecto físico con defaults del Grupo ITS aplicados (Fluya Brand, Bitácora, Project Plan, Golden Path). Activar cuando el usuario dice: armá una app nueva, arrancá un proyecto desde cero, quiero empezar algo nuevo, o cuando arranca desde init.sh tipo nueva-aplicacion."
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

# Nuevo desde Cero — App nueva sin contexto previo (Caso C)

> Proyecto: $ARGUMENTS

Sos el ejecutor del flow "app desde cero" cuando el dev arranca un proyecto **sin Lead previo** y **sin handoff del comercial**. Tu rol: tomar una descripción libre del dev, generar PRD técnico, auditar con sensei, y scaffoldear con defaults del Grupo ITS.

Este skill es distinto de:
- `/procesar-lead` — para casos con transcripción (Caso A)
- `/nuevo-desde-kit-comercial` — para casos con outputs del comercial (Caso B)
- `/modificacion-existente` — para apps ya creadas (Caso D)

---

## Pre-requisitos

- El proyecto debe existir como carpeta vacía o casi vacía en `/AplicacionesSaas/{nombre}/` (idealmente armada por `init.sh` tipo `nueva-aplicacion`).
- Si no existe, ofrecer crearla.

---

## Proceso

### Paso 1: Validar carpeta del proyecto

1. Extraer nombre de `$ARGUMENTS`. Si no viene, pedirlo:
   "¿Cuál es el nombre del proyecto nuevo? (ej: `dashboard-ventas-internal`)"

2. Validar:
   - Existe `~/ProyectosIA/AplicacionesSaas/{nombre}/`? Si no → ofrecer crear con `init.sh`.
   - Tiene archivos críticos del template (`bitacora.md`, `project_plan.md`, `.env.local.example`)? Si no → puede ser una carpeta vacía, ofrecer correr `init.sh` primero.

### Paso 2: Recolectar la idea del dev (CONVERSACIONAL, NO formulario)

**NO pedir 20 preguntas one-by-one**. Hacer UN solo mensaje pidiendo:

```
Para arrancar este proyecto necesito que me cuentes en UN mensaje
(pegame todo junto — yo extraigo lo que necesito):

1. ¿Qué problema resuelve la app? (1-2 párrafos)
2. ¿Usuarios objetivo? (perfil + tamaño aprox)
3. ¿Features core de v1?
4. ¿Hay integraciones obligatorias (APIs, sistemas legacy)?
5. ¿Restricciones especiales (compliance, performance, multi-tenant, etc.)?

Tip: no respondas pregunta por pregunta. Escribíme un texto libre
con todo lo que sepas. Yo proceso.
```

Esperar respuesta libre del dev. Procesarla **sin** hacer más preguntas (a menos que falte info crítica).

### Paso 3: Guardar contexto como "brief desde dev"

Crear `~/ProyectosIA/AplicacionesSaas/{nombre}/outputs/01-brief-desde-dev.md` con:

```markdown
# Brief — {nombre}

> **Generado**: {fecha}
> **Origen**: descripción del dev (Caso C — sin Lead previo)

## Descripción del problema

[Lo que pegó el dev, formateado como sección]

## Usuarios

[...]

## Features v1

[...]

## Integraciones

[...]

## Restricciones

[...]

## Notas

- Tipo: app interna / producto propio / cliente externo (inferir)
- Defaults aplicados: Fluya Brand + Bitácora + Project Plan + Golden Path
```

### Paso 4: Invocar `design-labs` para generar PRD

Spawn del subagent:

```
Generá PRD técnico para el proyecto {nombre} (Caso C — sin Lead previo):

Input: ~/ProyectosIA/AplicacionesSaas/{nombre}/outputs/01-brief-desde-dev.md

Output:
- ~/ProyectosIA/AplicacionesSaas/{nombre}/outputs/06-prd.md

Formato: template prp-base.md del Golden Path.
Mapear features a los 21 skills del Golden Path donde aplique.

IMPORTANTE: aplicar como defaults SIEMPRE:
- Fluya Brand (header + footer + paleta + Inter)
- Bitácora activa
- Project Plan activo
- Stack Golden Path (Next.js 16 + React 19 + TypeScript + Tailwind + Supabase + Polar + Resend + AI SDK v6 + OpenRouter + Zod + Zustand)
```

### Paso 5: Invocar `sensei-reviewer`

```
Auditá PRD del proyecto {nombre}:
- ~/ProyectosIA/AplicacionesSaas/{nombre}/outputs/06-prd.md

Output:
- ~/ProyectosIA/AplicacionesSaas/{nombre}/outputs/07-sensei-review.md

Contexto cross-proyecto: leer BUGS_FOUND.md, PRPs y Bitacora.md de proyectos
en ~/ProyectosIA/AplicacionesSaas/ para detectar repetición de errores.
```

### Paso 6: Loop de refinamiento

Leer veredicto en `outputs/07-sensei-review.md`:

- **APROBADO** → continuar Paso 7
- **APROBADO CON CAMBIOS MENORES** → continuar Paso 7 con nota
- **REQUIERE RE-DISEÑO** → reinvocar `design-labs` con el feedback del sensei como input adicional. Hasta 3 iteraciones máximo. Si después de la 3ra sigue rechazado, abortar y escalar al humano.

### Paso 7: Decidir si scaffoldear código

Preguntar al dev:

```
✅ PRD aprobado por sensei.

¿Scaffoldeás el código del proyecto ahora?
  - sí → crear estructura Next.js completa con stack Golden Path
  - no → paramos acá con PRD listo, scaffoldeás vos después con /scaffold-from-prd

(El scaffold aplica defaults: Fluya Brand + Bitácora + Project Plan ya están
inicializados, falta agregar el código Next.js + Supabase + etc.)
```

### Paso 8a: Si SÍ scaffold

Invocar `/scaffold-from-prd {nombre}` desde dentro del skill.

Resultado esperado:
- Estructura `src/app/`, `src/components/`, `src/lib/` creada
- `package.json` con Golden Path deps
- `tailwind.config.ts` con paleta Fluya
- `src/app/layout.tsx` con header/footer Fluya
- `.claude/agents/` con agentes consultores
- `.mcp.json` base
- `bitacora.md` y `project_plan.md` ya creados por `init.sh`, actualizados ahora con info del PRD

### Paso 8b: Si NO scaffold

Solo actualizar `bitacora.md`:

```
## {fecha} — PRD generado

- Brief consolidado en outputs/01-brief-desde-dev.md
- PRD técnico en outputs/06-prd.md (sensei: APROBADO)
- Scaffold pendiente — usar /scaffold-from-prd {nombre} cuando estés listo
```

### Paso 9: Cierre

Actualizar `project_plan.md`:

```markdown
## Estado actual

🟢 PRD APROBADO — {Scaffold pendiente | Scaffold completo}

## Fases (del PRD)

[Copiar las fases del PRD acá con estado inicial]
```

Mostrar al dev:

```
✓ Proyecto {nombre} listo.

Artefactos generados:
  - outputs/01-brief-desde-dev.md
  - outputs/06-prd.md
  - outputs/07-sensei-review.md (veredicto: {APROBADO|APROBADO CON CAMBIOS})
  {- código scaffoldeado si aplicó}

Próximo paso:
  - Configurar credenciales: cp .env.local.example .env.local (y editar)
  - Instalar deps: npm install
  - Arrancar: npm run dev
  - Construir features: /primer + /bucle-agentico

📘 Doc completo del flow: dev/docs/CASO-C-NUEVO-DESDE-CERO.md (en kit-comercial)
```

---

## Reglas

- SIEMPRE aplicar defaults sin preguntar: Fluya Brand, Bitácora, Project Plan, Golden Path
- NUNCA pedir 20 preguntas one-by-one (eso es el formulario del SF Manager que no funciona)
- SIEMPRE pedir descripción en UN mensaje libre del dev
- SIEMPRE invocar sensei-reviewer aunque el dev "sepa lo que quiere"
- Loop sensei: máximo 3 iteraciones, después escalar
- NUNCA scaffoldear sin que el dev confirme

## Anti-patrones

- NO hacer preguntas separadas tipo formulario (estilo SF Manager actual)
- NO saltearse sensei-reviewer por "es app interna"
- NO desactivar fluya-brand por "es solo backend" (siempre aplica, hasta APIs internas tienen un panel admin)
- NO usar este skill para apps con Lead previo (usar /procesar-lead o /nuevo-desde-kit-comercial)

## Ejemplo de invocación

```
/nuevo-desde-cero dashboard-ventas-internal
```

Resultado esperado: pide descripción libre → genera PRD → audita → ofrece scaffold → cierra con próximos pasos.

---

*Skill v1.0 — Para Caso C del dev (app nueva sin contexto previo). Equivalentes: /procesar-lead (Caso A), /nuevo-desde-kit-comercial (Caso B), /modificacion-existente (Caso D).*
