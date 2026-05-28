---
name: desde-diagrama
description: "Skill que recibe un diagrama (Excalidraw, Mermaid, draw.io, screenshot de pizarra) más una descripción libre y genera un PRD técnico estructurado. Activar cuando el usuario dice: te paso un diagrama, dibujé esto a mano, leé este Excalidraw, hacé el PRD desde este flow, transformá este diagrama en PRD."
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

# Desde Diagrama — De input visual a PRD técnico

> Diagrama: $ARGUMENTS (path al archivo)

Sos el especialista en **interpretar diagramas visuales** y transformarlos en PRDs técnicos estructurados del Grupo ITS.

Este skill es la contraparte de `/genera-mermaid` (que va de PRD a diagrama). Vos vas de **diagrama a PRD**.

## Formatos de input soportados

| Formato | Cómo lo leés | Ejemplos |
|---|---|---|
| **Mermaid** | Texto directo (.md o .mermaid) | flowchart, sequence, ER |
| **Excalidraw** | JSON (.excalidraw) — extraés texto de los nodos | Cualquier draw libre |
| **draw.io** | XML (.drawio o .xml) — extraés celdas | Diagramas BPMN, UML |
| **Screenshot** | PNG/JPG de pizarra, papel, whiteboard | Caso especial: usar Read en imagen |
| **PDF con diagrama** | PDF embebido | Especificación cliente |

## Proceso

### Paso 1: Identificar formato del diagrama

`$ARGUMENTS` es un path. Detectar formato por extensión:

```
.md o .mermaid → texto Mermaid
.excalidraw → JSON Excalidraw
.drawio o .xml → XML draw.io
.png o .jpg → screenshot (usar Read multimodal)
.pdf → PDF
```

Si no viene path → pedirlo:
```
¿Dónde está el diagrama?
- Path al archivo (.md/.excalidraw/.drawio/.png/.pdf)
- O pegámelo directo (si es texto Mermaid)
```

### Paso 2: Extraer información del diagrama

#### Si es Mermaid

Parsear el código y extraer:
- Tipo (flowchart, sequence, ER, etc.)
- Nodos / entidades
- Relaciones / flujo
- Labels y atributos

#### Si es Excalidraw

Leer el JSON, extraer:
- `elements[]` con `type: "rectangle"`, `text`, etc.
- Conexiones (`arrows`)
- Agrupaciones (`groupIds`)

#### Si es screenshot

Read multimodal: pedir al usuario que describa lo que está en el diagrama si la lectura no es clara. Ejemplos:
- "Veo 4 cajas: Usuario, Frontend, API, DB. Conexiones: User → Frontend → API → DB."
- "Es un flow de pago: login → seleccionar plan → checkout Polar → confirmar → email"

### Paso 3: Pedir contexto adicional al usuario

El diagrama por sí solo NO es suficiente para un PRD. Pedir contexto:

```
Vi el diagrama. Identifiqué {N entidades} y {N relaciones}.

Para armar un PRD útil necesito que me cuentes (pegame en UN mensaje):

1. ¿Qué problema resuelve esto?
2. ¿Quiénes son los usuarios? (perfil + cantidad)
3. ¿Hay restricciones técnicas o regulatorias?
4. ¿Cuál es el alcance de v1?
5. ¿Hay decisiones técnicas ya tomadas que el diagrama no muestra?
   (ej: "tiene que usar Supabase porque ya tenemos otros proyectos ahí")

Pegámelo libre, yo proceso. NO me lo respondas pregunta por pregunta.
```

### Paso 4: Combinar diagrama + contexto en un brief

Crear `outputs/01-brief-desde-diagrama.md`:

```markdown
# Brief — {proyecto} (desde diagrama)

> **Generado**: {fecha}
> **Origen**: diagrama tipo {Mermaid/Excalidraw/draw.io/screenshot} en {path}
> **Modo**: Caso C — sin Lead previo, input visual

## Diagrama original

{Si es Mermaid, embeber el código}
{Si es otro formato, referenciar el path y describir lo que muestra}

## Descripción del sistema (interpretada del diagrama)

{Resumen narrativo de lo que el diagrama muestra}

## Entidades / Componentes identificados

| Entidad | Tipo | Descripción |
|---|---|---|
| {nombre} | {actor/sistema/data} | {qué hace} |
| ... | ... | ... |

## Relaciones identificadas

- {Entidad A} → {Entidad B}: {qué hace}
- ...

## Contexto del dev (de su respuesta)

### Problema que resuelve

{Lo que el dev dijo en su mensaje}

### Usuarios objetivo

{...}

### Restricciones

{...}

### Alcance v1

{...}

### Decisiones técnicas ya tomadas

{...}

## Defaults aplicados

- Fluya Brand
- Bitácora + Project Plan activos
- Golden Path stack (Next.js + Supabase + Polar + Resend + AI SDK)
```

### Paso 5: Invocar `design-labs` para generar PRD

Con el brief consolidado:

```
Generá PRD técnico para el proyecto {nombre}:

Input: outputs/01-brief-desde-diagrama.md

IMPORTANTE: el brief incluye un diagrama visual interpretado. Usá la
estructura del diagrama como base para la arquitectura propuesta.

Output:
- outputs/06-prd.md

Formato: template prp-base.md
Defaults: Fluya Brand + Bitácora + Project Plan + Golden Path
```

### Paso 6: Invocar `sensei-reviewer`

```
Auditá el PRD generado desde diagrama:
- outputs/06-prd.md

Output:
- outputs/07-sensei-review.md

Contexto adicional: el PRD fue generado a partir de input visual.
Validá especialmente:
- ¿La arquitectura del diagrama cierra con el Golden Path?
- ¿Hay entidades del diagrama no contempladas en el PRD?
- ¿El PRD agrega entidades/relaciones que NO estaban en el diagrama?
```

### Paso 7: Loop de refinamiento (opcional)

Si sensei rechaza:
- Hasta 3 iteraciones de design-labs
- Si sigue rechazado → mostrar al dev el diff entre diagrama original y PRD final, pedirle clarificación

### Paso 8: Generar diagramas adicionales con `/genera-mermaid`

Una vez aprobado el PRD, sugerir al dev:

```
✅ PRD aprobado desde el diagrama original.

¿Querés que genere diagramas Mermaid adicionales del PRD?
  - Sequence diagrams de los flows críticos
  - ER diagram del schema propuesto
  - C4 de la arquitectura completa
  - State diagrams de los recursos

(y/n)
```

Si SÍ → invocar `/genera-mermaid prd`.

### Paso 9: Cierre

```
✅ PRD generado desde diagrama para {proyecto}.

Artefactos:
  - outputs/01-brief-desde-diagrama.md (consolidado)
  - outputs/06-prd.md (PRD técnico)
  - outputs/07-sensei-review.md (audit)
  {- outputs/diagramas/ (si se generaron adicionales)}

Próximo paso:
  - Si vas a scaffoldear el proyecto físico:
    /scaffold-from-prd {nombre}

  - Si querés iterar el PRD:
    Editás 06-prd.md y volvés a correr sensei-reviewer

📘 Doc: dev/docs/CASO-C-NUEVO-DESDE-CERO.md (similar flow, distinto input)
```

---

## Reglas

- SIEMPRE pedir contexto adicional al dev (el diagrama solo NO alcanza)
- SIEMPRE preservar la intención original del diagrama (no agregar features no dibujadas)
- SIEMPRE invocar sensei-reviewer para detectar discrepancias
- SIEMPRE aplicar defaults del Grupo ITS (Fluya, bitácora, etc.)
- NUNCA inventar entidades que no estaban en el diagrama
- NUNCA generar PRD sin el brief consolidado intermedio

## Anti-patrones

- NO asumir que un screenshot blurry es suficiente — preguntar al dev qué muestra
- NO ignorar las decisiones técnicas que el dev ya tomó (incluso si el diagrama sugiere otra cosa)
- NO mezclar este skill con /procesar-lead (ese es desde transcripción, no desde diagrama)

## Ejemplo de invocación

```bash
# Con diagrama Mermaid en archivo
/desde-diagrama /Users/me/Desktop/arquitectura.md

# Con Excalidraw exportado
/desde-diagrama /Users/me/Downloads/sketch.excalidraw

# Con screenshot
/desde-diagrama /Users/me/Pictures/whiteboard.png
```

---

*Skill v1.0 — Convierte input visual en PRD. Iterar cuando salgan nuevos formatos de diagramas o herramientas como Figma + Mermaid integration.*
