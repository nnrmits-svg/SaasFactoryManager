---
name: flow-map
description: Generar WORKFLOW.md de un SaaS — diagrama de pantallas, estados, eventos e intenciones de usuario en un solo archivo Mermaid + Markdown. Combina inventario automático del codebase con entrevista al humano para producir documentación viva que sirve como input para `fluya-ai-agent` (system prompt + intent map) y como onboarding para humanos. Activar cuando el usuario dice mapa de pantallas, flujo de la app, diagrama de la app, workflow.md, intent map, intenciones de usuario, screen flow, mapeo, o antes de instalar un asistente IA.
license: MIT
---

# Flow-Map — Mapa de Pantallas + Eventos + Intents

## Filosofía

Toda app tiene un mapa mental que vive en la cabeza del fundador. **Este skill lo extrae y lo escribe en un archivo.** El producto final, `WORKFLOW.md`, sirve para tres consumidores:

1. **Humanos nuevos** (onboarding, inversores, soporte) — entienden la app sin leer código
2. **Agente IA asistente** (`fluya-ai-agent`) — usa el archivo como system prompt + lista de intents/tools
3. **El propio agente Claude** — al volver a tocar la app, lee el archivo y se ubica en segundos

Sin este archivo, la app vive solo en el código y en la memoria humana. Con el archivo, vive en un lugar leíble por máquinas y humanos.

---

## Cuándo usarlo

- "Quiero el mapa de pantallas de esta app"
- "Hacé el WORKFLOW.md"
- "Generá el flow-map / intent map / diagrama"
- Antes de invocar `/fluya-ai-agent` (pre-requisito, le da el contexto al chatbot)
- Después de un sprint grande que cambió varias pantallas (regenerar el doc)
- Para presentar la app a inversores / nuevos integrantes

## Qué genera

Un único archivo en la raíz del proyecto: **`WORKFLOW.md`**

Estructura:

| Sección | Formato | Para qué sirve |
|---------|---------|----------------|
| **1. Resumen narrativo** | Texto plano (3-5 oraciones) | Pitch de 30 segundos en lenguaje natural |
| **2. Screen flow** | `mermaid flowchart LR` | Mapa de pantallas y transiciones |
| **3. State diagrams** | `mermaid stateDiagram-v2` (uno por entidad clave) | Estados de las entidades del dominio |
| **4. Event catalog** | Tabla MD: evento → trigger → mensaje al usuario | Inventario de avisos / toasts / badges |
| **5. Intent map** | Tabla MD: frase natural → intención → acción/screen/SQL | Núcleo del asistente AI — define qué entiende y ejecuta |
| **6. Glosario** | Términos técnicos → traducción no-técnica | El asistente lo usa para hablar humano |

---

## Cómo se ejecuta — flujo

### Fase 0 — Detección de stack y pre-requisitos

1. Verificar que el cwd sea un proyecto (existe `package.json` o equivalente)
2. Detectar framework (Next.js, Remix, otra). Para Next.js leer `src/app/**`. Para otros, ajustar.
3. Verificar si ya existe `WORKFLOW.md`:
   - **Sí existe** → modo "actualización": leerlo, identificar gaps, preguntar solo lo que falta
   - **No existe** → modo "creación": full interview

### Fase 1 — Inventario automático (sin preguntar al humano)

**Pantallas**: ejecutar `scripts/inventory-routes.sh` (o equivalente) para listar rutas. En Next.js esto se deriva de `src/app/**/page.tsx` y agrupando por `(group)`.

**Estados**: leer migraciones SQL (`supabase/migrations/**`) o tipos TypeScript (`src/**/types/**`) y extraer ENUMs / status fields. Cada uno es candidato a state diagram.

**Eventos**: grep de patrones comunes:
- `toast(...)`, `notify(...)`, `alert(...)`
- `aria-label="..."` en componentes de status (badges)
- `throw new Error(...)` que llegan al usuario
- Mensajes literales en `<p>`, `<span>` que parezcan estados ("Hace X min", "Sincronizado", etc.)

**Output intermedio**: presentar al humano un resumen del inventario:

```
Pantallas detectadas (12):
  - / (home)
  - /login
  - /dashboard
  - /project/[name]
  - ...

Estados detectados:
  - project_skills.status: synced, divergent, missing, external
  - tracking.status: idle, running, paused

Eventos detectados (24): 
  - "Sincronizado con catálogo" (badge tooltip)
  - "Falta el skill" (badge tooltip)
  - ...
```

Pedir al humano: **"¿Te falta alguna pantalla / estado / evento que el inventario no detectó?"**

### Fase 2 — Entrevista de intents (lo único no derivable)

El intent map es lo que NO se puede sacar del código. Se necesita la cabeza del fundador.

**Pregunta 1 — Personajes:**
> "¿Quién va a usar esta app? Listame los 2-4 tipos de usuario distintos (ej: admin, cliente final, soporte). Para cada uno, decí en una oración qué busca."

**Pregunta 2 — Tareas frecuentes (por personaje):**
> "Para [personaje X], ¿cuáles son las 5-10 cosas que va a hacer más seguido en la app? Decimelas en lenguaje natural, como si las dijera él (ej: 'quiero ver mis facturas pendientes', no 'GET /api/invoices?status=pending')."

**Pregunta 3 — Frases ambiguas o coloquiales:**
> "¿Hay alguna palabra que tu usuario diría pero no es jerga técnica? (ej: cliente dice 'mis pendientes' = invoices.status='unpaid'). Lo necesito para que el asistente IA entienda."

**Pregunta 4 — Escenarios de error:**
> "Cuando algo falla, ¿qué pregunta hace el usuario? ('¿por qué no se sincronizó?', '¿dónde está mi proyecto?'). El asistente tiene que saber responder esas."

Cada respuesta del humano se mapea a una fila del **intent map**:

| Frase del usuario | Intención (categoría) | Acción / screen / SQL |
|-------------------|----------------------|----------------------|
| "muéstrame proyectos con problemas" | filter_portfolio | `/dashboard?status=divergent,missing` |
| "creame uno de delivery" | new_project | wizard `/factory` con preset=delivery |
| "por qué add-emails está raro" | explain_state | leer estado de skill X y traducir |

### Fase 3 — Generación de Mermaid

Usar `references/mermaid-cheatsheet.md` como referencia de sintaxis (no inventar).

**Screen flow** (`flowchart LR`):
- Cada pantalla es un nodo
- Auth gate como diamante: `Login{Logueado?}`
- Acciones que cambian de pantalla = flecha con label

**State diagrams** (`stateDiagram-v2`):
- Uno por cada ENUM/status detectado en Fase 1
- Estados como nodos, transiciones con triggers como labels

**Validar Mermaid antes de escribir**: si hay dudas, generar el bloque y mentalmente "renderizarlo" — los errores comunes son: identificadores con espacios, ramas no cerradas, etiquetas con caracteres especiales sin escape.

### Fase 4 — Glosario auto-generado

Tomar términos técnicos del schema/UI (ej: "RLS", "synced", "registry_hash") y pedirle al humano una traducción de una línea.

> "Cómo le explicarías a un usuario no técnico qué significa 'divergent'?"

Ejemplo de output:
- `divergent` → "El skill local tiene cambios que no están en el catálogo central"
- `synced` → "Todo está alineado, no hay diferencias"

### Fase 5 — Escritura del archivo

Escribir `WORKFLOW.md` en la raíz del proyecto siguiendo `references/workflow-template.md`. **Nunca** escribir en otro lugar — el archivo tiene que estar a la vista en GitHub.

### Fase 6 — Verificación

1. Mostrar al humano el archivo final renderizado (los bloques Mermaid se ven en GitHub/VS Code)
2. Preguntar: **"¿Algo te suena raro o falta?"**
3. Iterar si hace falta

---

## Reglas duras

- **Un archivo, un lugar**: siempre `WORKFLOW.md` en la raíz. Nunca en `docs/`, nunca en `src/`.
- **Mermaid sin alucinar**: usar solo tipos verificados (`flowchart`, `stateDiagram-v2`, `sequenceDiagram`, `erDiagram`). No inventar sintaxis.
- **Idioma**: el archivo se escribe en el idioma del proyecto (mirar `BUSINESS_LOGIC.md`, comentarios del código). Si está en español, todo en español.
- **Intent map exhaustivo**: no menos de 10 filas. Si el humano da 3, presionar con ejemplos hasta llegar a 10+.
- **Glosario obligatorio**: cualquier término técnico que aparezca en la UI tiene que estar traducido. Sin glosario, el asistente no puede hablar humano.
- **Sin código fuente**: el archivo describe la app, no la implementa. No incluir snippets de TS/SQL salvo en ejemplos del intent map (y ahí sólo el target, no la implementación).

## Anti-patrones

- ❌ Listar pantallas sin transiciones (es un índice, no un mapa)
- ❌ State diagrams sin labels en las transiciones (no se entiende qué dispara el cambio)
- ❌ Intent map con frases técnicas ("user wants to filter table by status") — tienen que ser frases NATURALES en boca del usuario
- ❌ Glosario que copia el JSDoc del código — la traducción es para humanos, no para devs
- ❌ Generar el archivo sin entrevistar — el inventario solo cubre el 60%, el resto es la cabeza del fundador

---

## Composición con otros skills

`flow-map` es **input** de:

- **`fluya-ai-agent`** — el chatbot lee `WORKFLOW.md` como system prompt + intent map (el intent map se traduce a tools del LLM)
- **`prp`** — al planificar una feature nueva, leer `WORKFLOW.md` para no romper flujos existentes
- **`primer`** — al cargar contexto de un proyecto, `WORKFLOW.md` se prioriza junto a `BUSINESS_LOGIC.md`

`flow-map` es **regenerable**: después de un sprint que tocó pantallas/estados, re-ejecutar y se actualiza el archivo (modo "actualización" de Fase 0).

---

## Archivos del skill

```
.claude/skills/flow-map/
├── SKILL.md                       (este archivo)
├── references/
│   ├── mermaid-cheatsheet.md      (sintaxis Mermaid validada)
│   └── workflow-template.md       (estructura del WORKFLOW.md)
├── scripts/
│   └── inventory-routes.sh        (helper para listar rutas Next.js)
└── assets/
    └── workflow-example.md         (ejemplo real de un WORKFLOW.md)
```

---

## Ejemplo de uso

```
Usuario: "/flow-map"

Claude:
1. Inventario detectado: 18 pantallas, 4 entidades con estado, 30 mensajes de UI.
2. ¿Te falta alguna pantalla? [usuario responde]
3. ¿Quiénes son los 2-4 tipos de usuario? [entrevista]
4. ¿10 frases típicas que diría cada uno? [entrevista]
5. Glosario: "synced" en una línea para un no-técnico [respuesta]
6. → Genera WORKFLOW.md en raíz, lo abre en VS Code
7. ¿Algo raro? [iteración final]
```

Tiempo estimado: 20-30 min de entrevista para un proyecto de 15-20 pantallas.

---

> **Recordá**: el output no es para developers, es para *cualquier humano* y *cualquier IA*. Si una persona sin contexto técnico no entiende el archivo, fallaste.
