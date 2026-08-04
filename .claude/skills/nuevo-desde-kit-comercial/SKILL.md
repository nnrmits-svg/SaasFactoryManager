---
name: nuevo-desde-kit-comercial
description: "Skill para retomar un caso después del handoff del comercial: toma los outputs del Kit Comercial (01-03 + opc 04-05), genera PRD vía design-labs, audita con sensei-reviewer, y opcionalmente scaffoldea el proyecto físico con defaults del Grupo ITS. Activar cuando el usuario dice: el comercial me pasó el caso, retomá desde el handoff, o cuando arranca desde init.sh con outputs ya existentes."
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

# Nuevo desde Kit Comercial — Retomar handoff del comercial (Caso B)

> Anteproyecto: $ARGUMENTS

Sos el ejecutor del flow "post-handoff comercial". Tu rol: recibir los outputs que el comercial procesó en su Claude.ai Pro, completarlos con PRD + sensei review, y opcionalmente scaffoldear el proyecto.

Este skill es distinto de:
- `/procesar-lead` — para casos con transcripción cruda (Caso A)
- `/nuevo-desde-cero` — para apps sin handoff comercial (Caso C)
- `/modificacion-existente` — para apps ya creadas (Caso D)
- `/pipeline-comercial` — skill atómico que vos podés invocar manualmente si querés saltearte la lectura de las notas del comercial

---

## Pre-requisitos

El anteproyecto debe existir con la estructura del handoff:

```
~/ProyectosIA/Anteproyectos/{nombre}/
└── outputs/
    ├── README.md              ← notas del comercial al dev (CRÍTICO)
    ├── 01-brief-discovery.md
    ├── 02-diagnostico.md
    ├── 03-propuesta.md
    └── (opcional) 04-threat-model.md + 05-compliance-map.md
```

Si no existe → abortar y avisar al dev que necesita sync desde Drive/Git primero.

---

## Proceso

### Paso 1: Validar handoff

1. Extraer nombre de `$ARGUMENTS`. Si no viene, pedirlo.

2. Validar archivos obligatorios:
   - `outputs/01-brief-discovery.md` existe?
   - `outputs/02-diagnostico.md` existe?
   - `outputs/03-propuesta.md` existe?
   - `outputs/README.md` existe?

   Si falta alguno → abortar:
   ```
   ⚠️ Handoff incompleto. Falta: {lista}.
   
   Pingueá al comercial por Slack y pedile que complete antes de seguir.
   Ver: dev/docs/HANDOFF-COMERCIAL-DEV.md
   ```

3. **Leer el `outputs/README.md`** y mostrar las notas del comercial al dev:
   ```
   📝 Notas del comercial al dev:
   {contenido de la sección "Notas del comercial al dev" del README}
   
   ⚠️ Leelas antes de seguir. Si algo no cierra, parar acá y pingueá al comercial.
   ¿Continuar con el pipeline? (y/n)
   ```

   Si dev dice `n` → abortar con mensaje sobre flow de feedback.

### Paso 2: Validar consistencia de outputs del comercial

Verificar que NO existan `06-prd.md` o `07-sensei-review.md` en el handoff. Si existen, alertar:

```
⚠️  Detecté que el handoff tiene 06-prd.md y/o 07-sensei-review.md.

Esto NO debería estar — son outputs del dev, no del comercial. Posibles causas:
- El comercial corrió /pipeline-comercial cuando debería haber corrido solo consulting-engine
- Es un caso ya procesado por otro dev y querés re-correrlo

¿Cómo procedo?
  1. Validar el PRD existente y seguir desde scaffold
  2. Borrar 06-07 y regenerar desde design-labs (recomendado para consistencia)
  3. Abortar y consultar con Riki
```

### Paso 3: Invocar `design-labs` para generar PRD

Si NO hay 06-prd.md existente (o el dev eligió regenerar):

```
Generá PRD técnico para anteproyecto {nombre}:

Inputs:
- ~/ProyectosIA/Anteproyectos/{nombre}/outputs/03-propuesta.md (propuesta)
- ~/ProyectosIA/Anteproyectos/{nombre}/outputs/02-diagnostico.md (diagnóstico)
- ~/ProyectosIA/Anteproyectos/{nombre}/outputs/04-threat-model.md (opcional)
- ~/ProyectosIA/Anteproyectos/{nombre}/outputs/05-compliance-map.md (opcional)

Output:
- ~/ProyectosIA/Anteproyectos/{nombre}/outputs/06-prd.md

Formato: template prp-base.md
Mapear features a los 21 skills del Golden Path donde aplique.

IMPORTANTE: aplicar defaults del Grupo ITS:
- Fluya Brand (siempre)
- Bitácora activa
- Project Plan activo
- Stack Golden Path
```

### Paso 4: Invocar `sensei-reviewer`

```
Auditá PRD del anteproyecto {nombre}:
- ~/ProyectosIA/Anteproyectos/{nombre}/outputs/06-prd.md

Output:
- ~/ProyectosIA/Anteproyectos/{nombre}/outputs/07-sensei-review.md

Contexto cross-proyecto: leer BUGS_FOUND.md, PRPs y Bitacora.md de proyectos
en ~/ProyectosIA/AplicacionesSaas/ para detectar repetición de errores.
```

### Paso 5: Loop de refinamiento

Leer veredicto en `07-sensei-review.md`:

- **APROBADO** → continuar Paso 6
- **APROBADO CON CAMBIOS MENORES** → continuar Paso 6 con nota
- **REQUIERE RE-DISEÑO** → reinvocar design-labs hasta 3 iteraciones. Si después de la 3ra sigue rechazado:
  ```
  ⚠ Después de 3 iteraciones, sensei sigue rechazando el PRD.
  
  Posibles causas:
  - La propuesta del comercial tiene problemas de fondo
  - Hay info crítica que falta del comercial
  
  Recomiendo:
  - Pingueá al comercial con los feedback del sensei
  - O escalar a Riki para que revise el approach
  ```

### Paso 6: Preguntar si scaffoldear

```
✅ PRD aprobado por sensei.

¿Scaffoldeás el código del proyecto ahora?
  - sí → crear ~/ProyectosIA/AplicacionesSaas/{nombre}/ con estructura Next.js Golden Path + defaults
  - no → paramos acá con PRD listo, scaffoldeás vos después con /scaffold-from-prd {nombre}
```

### Paso 7a: Si SÍ scaffold

Invocar `/scaffold-from-prd {nombre}`.

Defaults aplicados automáticamente:
- ✅ Fluya Brand (header + footer + paleta + Inter)
- ✅ Bitácora inicializada y activa
- ✅ Project Plan con las fases del PRD
- ✅ Golden Path stack completo
- ✅ `.claude/agents/` con consulting-engine, design-labs, etc.
- ✅ `.mcp.json` base
- ✅ `.env.local.example` con todas las env vars

### Paso 7b: Si NO scaffold

Actualizar `outputs/README.md` con estado actual:

```
## {fecha} — PRD generado por dev

- 06-prd.md (sensei: APROBADO)
- Scaffold pendiente

## Próximo paso

Cuando esté listo: /scaffold-from-prd {nombre}
```

### Paso 8: Cierre

Mostrar al dev:

```
✓ Pipeline completado para {nombre}.

Artefactos en outputs/:
  - 01-brief-discovery.md   (del comercial)
  - 02-diagnostico.md       (del comercial)
  - 03-propuesta.md         (del comercial)
  {- 04-threat-model.md      del comercial si aplicó}
  {- 05-compliance-map.md    del comercial si aplicó}
  - 06-prd.md               (recién generado)
  - 07-sensei-review.md     (veredicto: {APROBADO|APROBADO CON CAMBIOS})

{Si se hizo scaffold:}
Código del proyecto en ~/ProyectosIA/AplicacionesSaas/{nombre}/

Próximo paso:
  1. cd ~/ProyectosIA/AplicacionesSaas/{nombre}
  2. cp .env.local.example .env.local (y editar)
  3. npm install
  4. npm run dev
  5. claude → /primer → /bucle-agentico para construir Fase 1

📘 Doc completo del flow: dev/docs/CASO-B-DESDE-KIT-COMERCIAL.md (en kit-comercial)
```

---

## Reglas

- SIEMPRE leer y mostrar las notas del `outputs/README.md` del comercial antes de seguir
- SIEMPRE aplicar defaults del Grupo ITS sin preguntar
- NUNCA modificar `02-diagnostico.md` o `03-propuesta.md` sin pedirle al dev que valide con el comercial primero
- NUNCA scaffoldear sin que el dev confirme
- Loop sensei: máximo 3 iteraciones, después escalar

## Anti-patrones

- NO empezar sin leer las notas del comercial
- NO regenerar 01-03 sin avisar al comercial (puede tener edits manuales valiosos)
- NO ignorar alertas del sensei "porque ya el comercial validó"
- NO desactivar fluya-brand

## Ejemplo de invocación

```
/nuevo-desde-kit-comercial tecnirevisar-juliaca
```

Resultado: valida handoff → muestra notas del comercial → genera PRD → audita con sensei → ofrece scaffold → cierra.

---

*Skill v1.0 — Para Caso B del dev (handoff del comercial). Equivalentes: /procesar-lead (Caso A), /nuevo-desde-cero (Caso C), /modificacion-existente (Caso D).*
