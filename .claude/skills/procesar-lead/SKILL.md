---
name: procesar-lead
description: "Skill atómico para perfil COMERCIAL con IDE: ejecuta solo consulting-engine (+ opcionalmente security-architect) y guarda outputs 02-03 (y 04-05 si aplica) en el filesystem. NO genera PRD técnico ni audita — eso es trabajo del dev con /pipeline-comercial. Activar cuando el usuario (comercial) dice: procesá este lead, generá diagnóstico, armá propuesta, o cuando arranca un caso comercial desde IDE."
allowed-tools: Read, Write, Edit, Grep, Glob
---

# Procesar Lead — Comercial en IDE (Discovery → Propuesta)

> Anteproyecto: $ARGUMENTS

Sos el ejecutor del flow comercial básico desde IDE. Tu rol es **acotado**: solo invocás los agentes que el comercial debe correr (consulting-engine + opcionalmente security-architect), y **paras ahí**. El PRD técnico y el audit sensei los hace el dev después con `/pipeline-comercial`.

Este skill existe para que un **comercial con IDE** (Profile Operador con rol comercial) pueda hacer en Claude Code el equivalente a su Project de Claude.ai, pero con outputs directos al filesystem (sin copy/paste manual).

Es un skill **distinto** de `/pipeline-comercial` (que es para devs y corre TODOS los agentes hasta PRD aprobado).

---

## Cuándo usar este skill vs los otros

| Skill | Quién lo usa | Qué hace |
|---|---|---|
| `/procesar-lead` | Comercial con IDE | Solo consulting-engine (+ opc security). Genera 02-03 (+ 04-05). Para ahí. |
| `/pipeline-comercial` | Dev | Pipeline completo: consulting + security + design + sensei. Genera 02 a 07. |
| `/onboarding-cliente` | Dev | Orquestador end-to-end con creación de estructura + decisiones humanas. |
| `/scaffold-from-prd` | Dev | Solo scaffold (requiere PRD aprobado). |

**Regla clave**: si sos comercial, parás en `/procesar-lead`. El dev decide cuándo seguir.

---

## Pre-requisitos

El anteproyecto debe existir con estructura básica:

```
/ProyectosIA/Anteproyectos/{nombre}/
├── inputs/          ← debe tener al menos algo (audio/doc/brief)
└── outputs/         ← se va a llenar acá
```

Si no existe, ofrecer crear la estructura al comercial:

```
La carpeta /Anteproyectos/{nombre}/ no existe. ¿La creo?
  - sí → crear inputs/ + outputs/, después subí el material y volvé a correr el skill
  - no → cancelar
```

---

## Proceso

### Paso 1: Validar anteproyecto

1. Extraer nombre de `$ARGUMENTS`. Si no viene, pedirlo:
   "¿Cuál es el nombre del anteproyecto a procesar? (ej: `tecnirevisar-juliaca`)"

2. Validar:
   - Existe `/ProyectosIA/Anteproyectos/{nombre}/inputs/`? Si no → ofrecer crear estructura.
   - Existe `/ProyectosIA/Anteproyectos/{nombre}/outputs/`? Si no → crear.
   - Tiene contenido en `inputs/`? Si está vacío → abortar y pedir cargar transcripción + docs antes de seguir.

### Paso 2: Consolidar brief si no existe

Si `outputs/01-brief-discovery.md` no existe, generarlo consolidando todo lo que hay en `inputs/`. Mismo formato que `/pipeline-comercial` Paso 2.

Si ya existe, leerlo y respetarlo (puede tener edits manuales del comercial).

### Paso 3: Invocar `consulting-engine`

Spawn del subagent con:

```
Procesá el brief de discovery del anteproyecto {nombre}:

Input: /ProyectosIA/Anteproyectos/{nombre}/outputs/01-brief-discovery.md

Outputs:
- /ProyectosIA/Anteproyectos/{nombre}/outputs/02-diagnostico.md
- /ProyectosIA/Anteproyectos/{nombre}/outputs/03-propuesta.md

Tipo de cliente: [detectar de inputs/ o preguntar al comercial — externo/interno/propio]
```

Esperar finalización. Loguear resumen en `outputs/README.md`.

### Paso 4: Decidir security-architect (opcional)

Preguntar al comercial UNA VEZ:

```
¿Invoco también security-architect para generar threat model?

Conviene SÍ si:
- La app maneja datos sensibles (banca, salud, fintech)
- Hay compliance específico (HIPAA, PCI-DSS, GDPR, Ley 25.326 con datos sensibles)
- Es multi-tenant con datos cruzados
- Tu intuición es que el cliente va a preguntar por seguridad

Conviene NO si:
- App simple de gestión interna
- Datos no sensibles
- El comercial todavía no acordó nada técnico con el cliente

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

Si NO, saltear a Paso 5.

### Paso 5: Cierre

**IMPORTANTE**: No invocar `design-labs` ni `sensei-reviewer`. Esos son trabajo del dev.

Actualizar `outputs/README.md` con estado:

```markdown
# Anteproyecto: {nombre}

> **Estado**: COMERCIAL COMPLETADO — listo para review del dev
> **Última actualización**: {YYYY-MM-DD}
> **Rol que ejecutó**: Comercial (procesar-lead)
> **Security architect ejecutado**: {SÍ | NO}

## Artefactos generados

- ✅ outputs/01-brief-discovery.md
- ✅ outputs/02-diagnostico.md
- ✅ outputs/03-propuesta.md
- {✅ outputs/04-threat-model.md SI aplica}
- {✅ outputs/05-compliance-map.md SI aplica}

## Próximo paso

El comercial cerró su parte. **Pasar al dev** para que ejecute:
- `/pipeline-comercial {nombre}` → genera PRD + sensei review
- Luego `/scaffold-from-prd {nombre}` → scaffold del proyecto físico

## Handoff al dev

1. Confirmar que la carpeta /Anteproyectos/{nombre}/ está sincronizada con el repo del equipo (git push o sync de Drive según el setup)
2. Avisar al dev por Slack que el caso está listo para review
3. Adjuntar 2-3 líneas de contexto extra que no estén en los .md (intuición, observaciones de la reunión)
```

Mostrar al comercial:

```
✓ Caso comercial procesado para {nombre}.

Outputs disponibles en /ProyectosIA/Anteproyectos/{nombre}/outputs/

Generados:
  - 01-brief-discovery.md
  - 02-diagnostico.md
  - 03-propuesta.md
  {- 04-threat-model.md si aplica}
  {- 05-compliance-map.md si aplica}

Próximo paso:
  1. Revisá los outputs. Si algo falla, editá el .md directamente o invocá al consulting-engine de nuevo con feedback.
  2. Cuando estén OK, sincronizá la carpeta (git push o Drive sync).
  3. Avisá al dev por Slack que el caso está listo para que corra /pipeline-comercial.
  
NO corras /pipeline-comercial ni /scaffold-from-prd vos mismo — eso es trabajo del dev.
```

---

## Reglas

- NUNCA invocar `design-labs` (genera PRD técnico — no es rol del comercial)
- NUNCA invocar `sensei-reviewer` (audit del PRD — no es rol del comercial)
- NUNCA crear `/AplicacionesSaas/{nombre}/` (scaffold — es rol del dev)
- SIEMPRE preguntar antes de invocar `security-architect` (no asumir)
- SIEMPRE respetar archivos pre-existentes en `outputs/` (puede tener edits del comercial)
- SIEMPRE actualizar `outputs/README.md` al final con estado "listo para review del dev"
- Si el comercial quiere reiterar (regenerar 02 o 03), confirmar antes de sobrescribir

## Anti-patrones

- NO confundir con `/pipeline-comercial` (ese es para devs y corre todos los agentes)
- NO seguir hasta PRD si el comercial pide "hagamos todo" — explicarle que el dev hace ese paso después
- NO sobrescribir outputs sin preguntar si ya existen
- NO bypasear el handoff al dev (el dev necesita revisar antes del scaffold)

## Ejemplo de invocación

```
/procesar-lead estudio-contable-mendoza
```

Resultado esperado: si el material está en `Anteproyectos/estudio-contable-mendoza/inputs/`, el skill genera 01-02-03 (+ opcionalmente 04-05) y termina con el mensaje de handoff al dev.

---

*Skill atómico para Profile Operador con rol Comercial. Su contraparte para devs es `/pipeline-comercial`. Ambos pueden coexistir en la misma máquina — el comercial usa este, el dev usa el otro.*
