---
name: pipeline-comercial
description: "Skill atómico que ejecuta SOLO la fase de discovery → PRD aprobado (sin scaffoldear proyecto). Útil cuando ya hay un Anteproyecto creado y querés correr el pipeline de 4 agentes sin promover a Proyecto físico todavía. Activar cuando el usuario dice: corré el pipeline, generá el PRD, procesá el discovery, o cuando se llama desde /onboarding-cliente."
allowed-tools: Read, Write, Edit, Grep, Glob
---

# Pipeline Comercial — Discovery → PRD aprobado

> Anteproyecto: $ARGUMENTS

Sos el ejecutor del pipeline comercial: invocás los 4 agentes consultores en secuencia y producís los artefactos del anteproyecto. **NO scaffoldeas proyecto físico** — eso es trabajo del skill `/scaffold-from-prd`. **NO orquestás aprobaciones humanas detalladas** — eso es trabajo del skill `/onboarding-cliente` (que te invoca a vos cuando hace falta).

Este skill es útil cuando:
- El dev ya tiene un anteproyecto creado y quiere correr el pipeline directo
- Un anteproyecto existente necesita regenerar el PRD desde cero
- Se invoca desde `/onboarding-cliente` (orquestador) como sub-skill

## Pre-requisitos

El anteproyecto debe existir con estructura básica:

```
/ProyectosIA/Anteproyectos/{nombre}/
├── inputs/          ← debe tener al menos algo (audio/doc/brief)
└── outputs/         ← se va a llenar acá
```

Si no existe, ABORTAR y sugerir usar `/onboarding-cliente` que crea la estructura.

---

## Proceso

### Paso 1: Validar anteproyecto

1. Extraer nombre de `$ARGUMENTS`. Si no viene, pedirlo:
   "¿Cuál es el nombre del anteproyecto a procesar? (ej: `sistema-arca-iibb`)"

2. Validar:
   - Existe `/ProyectosIA/Anteproyectos/{nombre}/inputs/`? Si no → abortar.
   - Existe `/ProyectosIA/Anteproyectos/{nombre}/outputs/`? Si no → crear.
   - Tiene contenido en `inputs/`? Si está vacío → abortar y sugerir cargar material o usar `/onboarding-cliente` en modo conversación.

### Paso 2: Consolidar brief si no existe

Si `outputs/01-brief-discovery.md` no existe, generarlo consolidando todo lo que hay en `inputs/`. Mismo formato que `/onboarding-cliente` Paso 3.

Si ya existe, leerlo y respetarlo (puede tener edits manuales del dev).

### Paso 3: Invocar `consulting-engine`

Spawn del subagent con:

```
Procesá el brief de discovery del anteproyecto {nombre}:

Input: /ProyectosIA/Anteproyectos/{nombre}/outputs/01-brief-discovery.md

Outputs:
- /ProyectosIA/Anteproyectos/{nombre}/outputs/02-diagnostico.md
- /ProyectosIA/Anteproyectos/{nombre}/outputs/03-propuesta.md

Tipo de cliente: [detectar de inputs/ o preguntar al dev — externo/interno/propio]
```

Esperar finalización. Loguear resumen en `outputs/README.md`.

### Paso 4: Decidir security-architect

Si el dev no lo especificó al invocar, preguntar UNA VEZ:

```
¿Invoco security-architect para threat model? 
(Recomendado si la app maneja datos sensibles, multi-tenant, o integraciones financieras)
  - sí / no / skip
```

Si SÍ, invocar `security-architect`:

```
Generá threat model para anteproyecto {nombre}:
- /ProyectosIA/Anteproyectos/{nombre}/outputs/02-diagnostico.md
- /ProyectosIA/Anteproyectos/{nombre}/outputs/03-propuesta.md

Outputs:
- /ProyectosIA/Anteproyectos/{nombre}/outputs/04-threat-model.md
- /ProyectosIA/Anteproyectos/{nombre}/outputs/05-compliance-map.md
```

### Paso 5: Invocar `design-labs`

Spawn del subagent:

```
Generá PRD técnico para {nombre}:
- Propuesta: outputs/03-propuesta.md
- Threat model (opcional): outputs/04-threat-model.md
- Compliance map (opcional): outputs/05-compliance-map.md

Output:
- /ProyectosIA/Anteproyectos/{nombre}/outputs/06-prd.md

Formato: template prp-base.md
Mapear features a los 21 skills del Golden Path.
```

### Paso 6: Invocar `sensei-reviewer`

Spawn del subagent:

```
Auditá PRD del anteproyecto {nombre}:
- /ProyectosIA/Anteproyectos/{nombre}/outputs/06-prd.md

Output:
- /ProyectosIA/Anteproyectos/{nombre}/outputs/07-sensei-review.md

Contexto cross-proyecto: leer BUGS_FOUND.md, PRPs y Bitacora.md de proyectos
en /ProyectosIA/AplicacionesSaas/ para detectar repetición de errores.
```

### Paso 7: Loop de refinamiento

Leer veredicto en `outputs/07-sensei-review.md`:

- **APROBADO** → continuar Paso 8
- **APROBADO CON CAMBIOS MENORES** → continuar Paso 8 con nota
- **REQUIERE RE-DISEÑO** → reinvocar `design-labs` con el feedback del sensei como input adicional. Hasta 3 iteraciones máximo. Si después de la 3ra sigue rechazado, abortar y escalar al humano:
  ```
  ⚠ Después de 3 iteraciones, el sensei sigue rechazando el PRD.
  Probablemente el approach es fundamentalmente incorrecto.
  Recomiendo: volver al consulting-engine y re-pensar la propuesta.
  ```

### Paso 8: Cierre

Actualizar `outputs/README.md` con estado:

```markdown
# Anteproyecto: {nombre}

> **Estado**: PIPELINE COMPLETADO — PRD APROBADO
> **Última actualización**: {YYYY-MM-DD}
> **Veredicto sensei**: {APROBADO | APROBADO CON CAMBIOS MENORES}

## Artefactos generados

[Tabla actualizada con todos los outputs ✅]

## Próximo paso

El PRD está listo para scaffoldear el proyecto físico.
Invocar: /scaffold-from-prd {nombre}
```

Mostrar al usuario:

```
✓ Pipeline comercial completado para {nombre}.

Outputs disponibles en /ProyectosIA/Anteproyectos/{nombre}/outputs/

Próximo paso sugerido:
  /scaffold-from-prd {nombre}
  
(Esto crea el proyecto físico en /ProyectosIA/AplicacionesSaas/{nombre}/)
```

---

## Reglas

- NUNCA scaffoldear proyecto físico (no es tu rol)
- NUNCA escribir código de aplicación (solo orquestar agentes)
- SIEMPRE respetar archivos pre-existentes en `outputs/` (puede tener edits manuales del dev)
- SIEMPRE actualizar `outputs/README.md` con cada paso
- Loop de refinamiento con sensei: máximo 3 iteraciones, después escalar al humano
- Si el dev quiere saltar security-architect, respetarlo (no insistir)

## Anti-patrones

- NO invocar `consulting-engine` si ya hay outputs 02 y 03 sin tocar — preguntar al dev si quiere regenerar
- NO sobrescribir el PRD existente sin preguntar
- NO bypasear el sensei (su review es la garantía de calidad antes del scaffold)
- NO crear `/AplicacionesSaas/{nombre}/` desde acá (es trabajo de `/scaffold-from-prd`)

*Skill atómico, focal, predecible. El orquestador `/onboarding-cliente` te invoca cuando hace falta.*
