---
name: scaffold-from-prd
description: "Skill atómico que toma un Anteproyecto con PRD aprobado y materializa el Proyecto físico en /AplicacionesSaas/. Invoca /new-app, crea estructura Feature-First, copia artefactos del anteproyecto, opcionalmente hace git init + repo GitHub. Activar cuando el usuario dice: scaffold del proyecto, materializar anteproyecto, crear el proyecto real, o cuando se invoca desde /onboarding-cliente."
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

# Scaffold From PRD — Anteproyecto → Proyecto físico

> Anteproyecto a materializar: $ARGUMENTS

Sos el ejecutor de la transición Anteproyecto → Proyecto. Tomás un anteproyecto con PRD aprobado y creás el proyecto físico en `/AplicacionesSaas/{nombre}/` listo para que el dev arranque `/add-login`, `/add-security` y `/bucle-agentico` cuando decida.

**NO arrancás `/bucle-agentico` ni implementás código de features**. Esa decisión queda explícitamente para el dev en fase de proyecto.

## Pre-requisitos

El anteproyecto debe tener:
- `/ProyectosIA/Anteproyectos/{nombre}/outputs/06-prd.md` (PRD generado)
- `/ProyectosIA/Anteproyectos/{nombre}/outputs/07-sensei-review.md` (review aprobado)

Si el review no está aprobado, ADVERTIR y pedir confirmación explícita antes de continuar.

---

## Proceso

### Paso 1: Validar anteproyecto y nombre del proyecto

1. Extraer nombre de `$ARGUMENTS`. Si no viene, pedirlo.

2. Validar anteproyecto existe:
   ```bash
   ls /ProyectosIA/Anteproyectos/{nombre}/outputs/
   ```
   Si no existe `06-prd.md` → abortar.

3. Leer veredicto en `outputs/07-sensei-review.md`:
   - Si NO está APROBADO → preguntar:
     ```
     ⚠ El sensei NO aprobó el PRD. Veredicto actual: {veredicto}
     
     ¿Querés scaffoldear igual?
       - SÍ → continuar (asumís el riesgo)
       - NO → volver a /pipeline-comercial para iterar
     ```

4. Chequear conflicto con proyecto físico:
   ```bash
   ls /ProyectosIA/AplicacionesSaas/{nombre}/
   ```
   Si ya existe → preguntar:
   - "Ya existe un proyecto con ese nombre. Querés (a) elegir otro nombre, (b) abortar, (c) sobrescribir (peligroso)"

### Paso 2: Crear estructura del proyecto

```bash
mkdir -p /ProyectosIA/AplicacionesSaas/{nombre}
cd /ProyectosIA/AplicacionesSaas/{nombre}
```

### Paso 3: Invocar `/new-app` con los datos del PRD

Invocar el skill existente `/new-app`. Como `/new-app` hace su propia entrevista de 7 preguntas, tenés dos opciones según preferencia del dev (preguntar al inicio):

**Opción A (rápida)**: pasarle al dev los datos del PRD a la vista, que él confirme rápido las respuestas a las 7 preguntas con el PRD abierto en otra ventana. `/new-app` corre normal.

**Opción B (futura)**: si en el futuro `/new-app` soporta `--headless` con archivo de input, podemos pasarle directamente los datos del PRD. Hoy no es así, por eso vamos con A por default.

Después de que `/new-app` termina:
- Debe haber generado `BUSINESS_LOGIC.md` y `PROJECT_BRIEF.md`
- Estructura Next.js base lista
- `.claude/` del proyecto creada

### Paso 4: Copiar artefactos del anteproyecto al proyecto

```bash
mkdir -p /ProyectosIA/AplicacionesSaas/{nombre}/docs/clientes/{nombre}/

cp /ProyectosIA/Anteproyectos/{nombre}/outputs/02-diagnostico.md \
   /ProyectosIA/AplicacionesSaas/{nombre}/docs/clientes/{nombre}/01-diagnostico.md

cp /ProyectosIA/Anteproyectos/{nombre}/outputs/03-propuesta.md \
   /ProyectosIA/AplicacionesSaas/{nombre}/docs/clientes/{nombre}/02-propuesta.md

# Si hay threat model
if [ -f /ProyectosIA/Anteproyectos/{nombre}/outputs/04-threat-model.md ]; then
  cp /ProyectosIA/Anteproyectos/{nombre}/outputs/04-threat-model.md \
     /ProyectosIA/AplicacionesSaas/{nombre}/docs/clientes/{nombre}/03-threat-model.md
  cp /ProyectosIA/Anteproyectos/{nombre}/outputs/05-compliance-map.md \
     /ProyectosIA/AplicacionesSaas/{nombre}/docs/clientes/{nombre}/04-compliance-map.md
fi

# PRD va al directorio especial .claude/PRPs/ con nombre PRP-001-{nombre}
cp /ProyectosIA/Anteproyectos/{nombre}/outputs/06-prd.md \
   /ProyectosIA/AplicacionesSaas/{nombre}/.claude/PRPs/PRP-001-{nombre}.md

cp /ProyectosIA/Anteproyectos/{nombre}/outputs/07-sensei-review.md \
   /ProyectosIA/AplicacionesSaas/{nombre}/.claude/PRPs/PRP-001-sensei-review.md
```

**Importante**: COPIAR, no mover. El anteproyecto queda intacto para auditoría.

### Paso 5: Crear `.claude/memory/clients/{nombre}.md`

Memoria del proyecto que sintetiza el contexto del cliente para futuras sesiones de Claude Code:

```markdown
# Cliente: {nombre}

> **Tipo**: [externo | interno | producto propio]
> **Inicio anteproyecto**: {fecha del anteproyecto}
> **Proyecto scaffoldeado**: {YYYY-MM-DD}
> **Anteproyecto original**: /ProyectosIA/Anteproyectos/{nombre}/

## Dolor principal
{1-2 párrafos del diagnóstico — extraer de 02-diagnostico.md}

## Propuesta aprobada
{Resumen de 03-propuesta.md: fases, esfuerzo total, decisiones comerciales}

## Decisiones de seguridad
{Si hubo threat model, resumir top 3 riesgos y mitigaciones}

## Compliance aplicable
{Lista de normativas relevantes}

## Próximas acciones (Fase 1 del PRD)
{Extraer del Blueprint del PRD}

## Historia de iteraciones del anteproyecto
{Si hubo iteraciones con sensei-reviewer, listarlas brevemente}
```

### Paso 6: Setup Supabase (si corresponde)

Si el PRD menciona Supabase (siempre lo hace en el Golden Path), preparar:

- Crear `.env.local.example` con placeholders de Supabase
- Crear carpeta `supabase/migrations/` vacía
- Si el dev tiene Supabase MCP configurado y quiere arrancar con DB ya creada → preguntar y guiarlo

Si NO quiere setup Supabase todavía, dejar instrucciones en `README.md` del proyecto.

### Paso 7: Git init + Repo GitHub (con consulta)

Preguntar al usuario:

```
¿Hacemos git init + creamos repo en GitHub?

  - (a) SÍ, completo:
       - git init
       - Primer commit ("feat: initial scaffold from PRP-001-{nombre}")
       - gh repo create grupo-its/{nombre} --private
       - git push origin main
       - Setup CI/CD a Vercel
       
  - (b) SOLO git local:
       - git init
       - Primer commit
       - SIN push a GitHub (lo hacés vos después manual)
       
  - (c) NADA por ahora:
       - Carpeta queda como folder local, sin git
       - Configurás vos después
```

Si (a):
```bash
cd /ProyectosIA/AplicacionesSaas/{nombre}
git init -b main
git add .
git commit -m "feat: initial scaffold from PRP-001-{nombre}

Anteproyecto: /ProyectosIA/Anteproyectos/{nombre}/
Generado con /scaffold-from-prd"

gh repo create grupo-its/{nombre} --private --source=. --remote=origin
git push -u origin main
```

Para CI/CD Vercel, sugerir al dev usar `vercel link` manualmente o guiarlo si tiene `vercel-deployer` agent disponible.

### Paso 8: Cierre y handoff al dev

Actualizar el anteproyecto:

```markdown
# Anteproyecto: {nombre}

> **Estado**: PROMOVIDO A PROYECTO
> **Promovido el**: {YYYY-MM-DD}
> **Proyecto**: /ProyectosIA/AplicacionesSaas/{nombre}/
> **Repo GitHub**: {URL si se creó}
```

Mostrar al usuario:

```
✓ Proyecto {nombre} scaffoldeado.

Ubicación: /ProyectosIA/AplicacionesSaas/{nombre}/

Artefactos copiados:
  ✓ docs/clientes/{nombre}/01-diagnostico.md
  ✓ docs/clientes/{nombre}/02-propuesta.md
  ✓ .claude/PRPs/PRP-001-{nombre}.md
  ✓ .claude/PRPs/PRP-001-sensei-review.md
  ✓ .claude/memory/clients/{nombre}.md
  ✓ BUSINESS_LOGIC.md (de /new-app)
  ✓ PROJECT_BRIEF.md (de /new-app)

Git: {creado / solo local / sin git}
Repo GitHub: {URL o N/A}

PRÓXIMOS PASOS (los hace el dev en fase de proyecto):

  1. cd /ProyectosIA/AplicacionesSaas/{nombre}
  2. claude
  3. > /primer  (para que Claude cargue contexto del proyecto)
  4. > /add-login  (Auth + RLS — siempre Fase 1)
  5. Si hay threat model con datos sensibles: > /add-security
  6. > /bucle-agentico  (arranca implementación según Fase 1 del PRD)

SF Agent va a detectar el nuevo proyecto en el próximo scan.
SF Manager va a mostrarlo en el dashboard.

Anteproyecto original queda en: /ProyectosIA/Anteproyectos/{nombre}/
Recomendación: NO borrarlo. Sirve para auditoría futura.
Para archivarlo: mv /ProyectosIA/Anteproyectos/{nombre} /ProyectosIA/Anteproyectos/_archivados/
```

---

## Reglas

- SIEMPRE COPIAR del anteproyecto, NUNCA MOVER. El anteproyecto debe quedar intacto.
- SIEMPRE preguntar antes de git init / repo GitHub. No asumir.
- NUNCA arrancar `/bucle-agentico` desde este skill. Esa decisión es del dev en fase de proyecto.
- NUNCA arrancar `/add-login` o `/add-security` automático. Mismo motivo.
- Si el sensei NO aprobó el PRD, preguntar explícitamente antes de scaffoldear.
- Validar siempre que el anteproyecto tenga todos los outputs necesarios antes de empezar.
- Si `/new-app` falla, ABORTAR antes de copiar artefactos (no dejar proyecto a medias).

## Anti-patrones

- NO mover archivos del anteproyecto al proyecto (siempre copiar)
- NO ejecutar `/bucle-agentico` automático
- NO crear repo GitHub sin preguntar
- NO sobrescribir proyectos existentes sin confirmación explícita
- NO asumir credenciales de Supabase/Vercel (preguntar al dev cuándo conectar)
- NO archivar el anteproyecto automáticamente (es decisión del dev hacerlo manual)

*La transición Anteproyecto → Proyecto es un momento sagrado: hay que hacerlo bien una vez para que el dev no tenga que limpiar después.*
