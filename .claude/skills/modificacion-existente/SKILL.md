---
name: modificacion-existente
description: "Skill para modificar una app existente del Grupo ITS. Conversacional, sin formulario rígido. Detecta el tipo de modificación (feature pequeña / grande / refactor / bug fix / optimización / migración) y rutea al sub-skill correspondiente con auto-update de bitácora y project_plan. Activar cuando el usuario dice: modificá X, agregá feature, refactor de Y, hay un bug, optimizar, migrar a versión nueva, o cuando arranca desde init.sh tipo modificacion."
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

# Modificación Existente — Trabajo sobre app ya creada (Caso D)

> Proyecto: $ARGUMENTS (opcional — si no viene, usa el directorio actual)

Sos el ejecutor del flow de modificación sobre apps existentes del Grupo ITS. Tu rol: detectar el tipo de modificación con UNA pregunta libre, rutear al sub-skill correcto, y asegurar que `bitacora.md` y `project_plan.md` se mantengan actualizados.

Este skill es distinto de:
- `/procesar-lead` — para Leads nuevos con transcripción
- `/nuevo-desde-kit-comercial` — para handoff del comercial
- `/nuevo-desde-cero` — para apps nuevas sin contexto

---

## Pre-requisitos

- El proyecto a modificar debe existir en `~/ProyectosIA/AplicacionesSaas/{nombre}/`
- Idealmente el dev ya corrió `/primer` para cargar contexto
- Tener `bitacora.md` y `project_plan.md` (si no existen, alertar — proyecto debería haber sido scaffoldeado con `init.sh` o similar)

---

## Proceso

### Paso 1: Validar contexto + chequeo de árbol

1. Detectar el proyecto:
   - Si `$ARGUMENTS` viene → usar ese nombre
   - Si no → usar el directorio actual (`pwd`). Si no es un proyecto SaaS válido → pedir nombre.

2. **Chequeo de árbol del proyecto** — validar archivos clave:

   Archivos obligatorios (existen?):
   - `package.json`
   - `bitacora.md`
   - `project_plan.md`
   - `.claude/agents/` (carpeta)
   - `.claude/skills/` (carpeta, puede estar vacía si solo usa skills globales)

   Skills críticos para Caso D que deberían estar disponibles:
   - `.claude/skills/bucle-agentico/SKILL.md`
   - `.claude/skills/primer/SKILL.md`
   - `.claude/skills/bitacora/SKILL.md`
   - `.claude/skills/project-plan/SKILL.md`
   - `.claude/skills/fluya-brand/SKILL.md`

   Agents críticos:
   - `.claude/agents/consulting-engine.md`
   - `.claude/agents/design-labs.md`
   - `.claude/agents/sensei-reviewer.md`
   - `.claude/agents/its-code-reviewer.md` (si existe en el repo central)

3. **Si faltan archivos críticos**, mostrar al dev:

   ```
   ⚠️  Detecté que faltan archivos en el árbol del proyecto:

   Archivos faltantes:
   {lista concreta}

   Esto puede pasar si:
   - El proyecto es viejo y se creó antes de tener estos defaults
   - Alguien borró archivos accidentalmente
   - El proyecto no fue scaffoldeado con init.sh

   ¿Querés que actualice el árbol con la última versión de la SaaS Factory?
   (kit-comercial/dev/saas-factory/.claude/)

     - sí → copio los archivos faltantes desde la SF base (no toca lo existente)
     - no → seguimos como está, pero algunos comandos pueden fallar
   ```

4. **Si dev dice SÍ a actualizar**:

   - Path fuente: `~/ProyectosIA/kit-comercial/dev/saas-factory/.claude/`
     - (Si no existe, alertar: "kit-comercial no está clonado o está en otra ruta. Especificá la ruta.")
   - Copiar SOLO los archivos faltantes (NO sobrescribir lo existente):
     ```bash
     # Conceptual — el skill lo hace via Read/Write con cuidado
     cp -n {SF_SOURCE}/skills/{nombre}/SKILL.md {PROYECTO}/.claude/skills/{nombre}/SKILL.md
     # cp -n: no overwrite
     ```
   - Loguear en `bitacora.md`:
     ```
     ## {fecha} — Árbol actualizado

     Archivos copiados desde SaaS Factory base:
     - {lista}

     Razón: faltaban archivos críticos para el flow de modificación.
     ```

5. **Si dev dice NO**:

   Continuar pero alertar:
   ```
   OK, seguimos sin actualizar. Tené en cuenta que si algún sub-skill falla
   por archivo faltante, podés volver a correr /modificacion-existente y
   elegir actualizar.
   ```

6. Recomendar correr `/primer` si no se corrió en esta sesión:
   ```
   💡 Te conviene correr /primer primero para cargar el contexto del proyecto
   (bitacora.md + project_plan.md + PRPs ejecutados).

   ¿Lo corrés? (y/n)
   ```

### Paso 2: Detectar tipo de modificación (CONVERSACIONAL, una pregunta)

**NO pedir 10 preguntas one-by-one**. Hacer UNA sola pregunta:

```
¿Qué tipo de modificación querés hacer? Pegame en UN mensaje:

1. Feature nueva (pequeña — menos de 1 día)
2. Feature nueva (grande — necesita PRP)
3. Refactor de código existente
4. Bug fix
5. Optimización (performance, accesibilidad, seguridad)
6. Migración (de una versión vieja del Golden Path a la actual)

Y describime brevemente qué necesitás. Yo proceso el resto.
```

Esperar respuesta libre. Procesarla.

### Paso 3: Rutear al sub-skill correspondiente

Según la respuesta del dev:

#### Camino A: Feature pequeña → skill atómico

Detectar si la feature mapea a un skill atómico:

- "login", "auth" → `/add-login`
- "pagos", "polar", "stripe", "suscripciones" → `/add-payments`
- "emails", "transactional", "resend" → `/add-emails`
- "mobile", "responsive" → `/add-mobile`
- "security", "RLS", "RBAC" → `/add-security`
- "AI", "chat", "RAG", "vision" → `/ai`
- "3D", "landing" → `/website-3d`

Si mapea claramente:
```
Detecté que lo que querés es {feature}. Voy a invocar el skill atómico /add-{tipo}.
Confirmá si está bien (y/n).
```

Si confirma, invocar el sub-skill.

Si NO mapea o el dev dice "es algo más" → ir a Camino B.

#### Camino B: Feature grande → /prp + /bucle-agentico

```
Esto necesita un PRP. Te voy a guiar.

Paso 1: Generar PRP con tu descripción
Paso 2: Vos revisás/aprobás
Paso 3: /bucle-agentico ejecuta por fases

¿Arrancamos con el PRP? (y/n)
```

Si SÍ:
- Pasar el texto del dev como contexto al skill `/prp`
- Esperar generación del PRP
- Mostrar al dev y pedir aprobación
- Si aprueba → invocar `/bucle-agentico`

#### Camino C: Refactor

```
Refactors necesitan auditoría previa. Voy a:
1. Invocar `its-code-reviewer` sobre el módulo a refactorear
2. Mostrate los hallazgos
3. Generar PRP de refactor basado en eso
4. Ejecutar con /bucle-agentico

¿Qué módulo refactoreás? (path)
```

Esperar respuesta. Invocar `its-code-reviewer` con el path.

#### Camino D: Bug fix

```
Necesito:
1. Path del archivo con el bug
2. Cómo reproducís el bug
3. Mensaje de error (si hay)
4. Comportamiento esperado vs actual

Pegámelo todo junto.
```

Procesar. Spawnear `its-code-reviewer` en modo bug-fix sobre el archivo. Generar fix + test. Confirmar con dev antes de aplicar.

#### Camino E: Optimización

```
Para optimizar necesito:
1. Qué tipo (performance / accesibilidad / seguridad / SEO)
2. Métrica actual (ej. tiempo de carga, Lighthouse score)
3. Métrica objetivo
4. Path/módulo afectado

Pegámelo junto.
```

Procesar. Invocar `its-code-reviewer` en modo optimización. Generar plan priorizado.

#### Camino F: Migración

```
Para migrar a la versión actual del Golden Path voy a invocar /update-sf.
Esto sincroniza el proyecto con el template SF actual.

⚠️ Puede romper cosas. Antes:
1. Asegurate de tener todo committeado
2. Hacé branch nuevo para la migración

¿Continuamos? (y/n)
```

Si SÍ → invocar `/update-sf`.

### Paso 4: Auto-update de bitácora y project_plan

**Después de cualquier camino**, asegurar que se actualicen automáticamente:

```
Actualizando bitacora.md con la modificación realizada...
```

Invocar el skill `/bitacora` (o directamente editar `bitacora.md`) agregando una entrada con:

```markdown
## {fecha} — {tipo de modificación}

- Modificación: {descripción breve}
- Skills/agents usados: {lista}
- Archivos modificados: {lista}
- Tests: {pasaron/agregados}
- Decisión técnica clave: {si aplica}
```

Invocar `/project-plan` para actualizar estado de fases si la modificación impacta el plan.

### Paso 5: Cierre

Mostrar al dev:

```
✓ Modificación completada en {proyecto}.

Tipo: {feature pequeña/grande/refactor/bug/optimización/migración}
Skills/agents usados: {lista}

Archivos modificados:
  {lista}

Bitácora actualizada: bitacora.md
Project Plan actualizado: project_plan.md

Próximos pasos sugeridos:
  - Correr tests: npm test
  - Verificar build: npm run build
  - Commit + push cuando estés conforme

📘 Doc completo del flow: dev/docs/CASO-D-MODIFICAR-EXISTENTE.md (en kit-comercial)
```

---

## Reglas

- SIEMPRE recomendar `/primer` al inicio si no se corrió
- SIEMPRE actualizar `bitacora.md` después de cualquier modificación
- SIEMPRE actualizar `project_plan.md` si la modificación impacta fases
- NUNCA hacer 10 preguntas one-by-one (eso es el SF Manager que no funciona)
- NUNCA modificar archivos sin pedir confirmación al dev
- NUNCA saltearse `its-code-reviewer` en refactors

## Cuándo escalar al humano

Antes de hacer las siguientes modificaciones, alertar al dev que necesita permiso de Riki:

- Cambios al stack (reemplazar Polar por Stripe, etc.)
- Schema de Supabase en tablas críticas (`users`, `accounts`)
- Middleware de auth o RLS policies
- Branding Fluya
- Dependencias nuevas grandes fuera del Golden Path

## Anti-patrones

- NO hacer formulario tipo SF Manager (esa fue la queja del usuario)
- NO modificar bitacora.md ni project_plan.md a mano sin pasar por los skills correspondientes
- NO commitear sin que pasen los tests
- NO saltearse el `/primer` al inicio (perdés contexto)

## Ejemplo de invocación

```
cd ~/ProyectosIA/AplicacionesSaas/gestion-arca
claude
/primer
/modificacion-existente
```

Después el skill pregunta el tipo de modificación. Vos pegás libre. El skill rutea.

---

*Skill v1.0 — Para Caso D del dev (modificar app existente). Equivalentes: /procesar-lead (Caso A), /nuevo-desde-kit-comercial (Caso B), /nuevo-desde-cero (Caso C).*
