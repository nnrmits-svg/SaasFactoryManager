---
name: audit-proyecto
description: "Skill orquestador que audita una app existente del Grupo ITS usando todos los engineers en paralelo (frontend, backend, supabase, vercel, performance, security, accessibility) y produce un reporte priorizado de mejoras. Activar cuando el usuario dice: auditá este proyecto, qué mejoras tiene, revisá esta app, encontrá oportunidades de mejora, o cuando quiera aplicar best practices nuevas a un proyecto existente."
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

# Audit Proyecto — Revisión integral con engineers especializados

> Proyecto: $ARGUMENTS (opcional — usa directorio actual si no viene)

Sos el orquestador que coordina a TODOS los engineers especializados para auditar un proyecto SaaS existente y generar un reporte priorizado de mejoras.

A diferencia de `/modificacion-existente` (que ejecuta una modificación específica), este skill **NO modifica código** — solo audita y reporta. Después el dev decide qué aplicar (con `/aplicar-mejoras` o `/bucle-agentico`).

---

## Cuándo usar este skill

- App ya construida hace tiempo y querés saber si tiene tech debt
- Salieron features nuevas (Next.js, Vercel) y querés modernizar
- Antes de un release importante (sanity check)
- Cliente reporta problemas vagos ("la app va lenta")
- Onboarding de dev nuevo (que entienda el estado actual)

---

## Pre-requisitos

- El proyecto debe existir como app SaaS Factory
- Debe tener `package.json` + `.claude/agents/` + (idealmente) `bitacora.md` y `project_plan.md`

---

## Proceso

### Paso 1: Validar contexto

1. Detectar proyecto:
   - Si `$ARGUMENTS` viene → usar nombre
   - Si no → usar directorio actual (`pwd`)
   - Si no es proyecto SaaS válido → pedir path correcto

2. Verificar que existen agents necesarios:
   - `.claude/agents/frontend-specialist.md`
   - `.claude/agents/backend-specialist.md`
   - `.claude/agents/supabase-admin.md`
   - `.claude/agents/vercel-deployer.md`
   - `.claude/agents/performance-engineer.md`
   - `.claude/agents/security-engineer.md`
   - `.claude/agents/accessibility-engineer.md`
   - `.claude/agents/its-code-reviewer.md` (opcional pero recomendado)

   Si faltan → recomendar correr `init.sh opción 0` desde kit-comercial para actualizar.

### Paso 2: Recolectar contexto del proyecto

Leer:
- `README.md`
- `bitacora.md` (decisiones técnicas)
- `project_plan.md` (estado actual)
- `package.json` (stack actual)
- `.claude/PRPs/` (PRPs ejecutados)
- Estructura `src/` (qué hay)
- `next.config.ts` / `vercel.ts`
- `tailwind.config.ts`

Mostrar al dev resumen del contexto detectado:

```
📋 Contexto detectado:

Proyecto: {nombre}
Stack: Next.js {versión} + Supabase + Polar + Resend
Última fase ejecutada: Fase {N}
Branding: {Fluya/custom}
Tests: {presentes/ausentes}
Bitácora: {actualizada/desactualizada}
PRPs ejecutados: {cantidad}

¿Continuamos con el audit completo? (y/n)
```

### Paso 3: Despachar engineers EN PARALELO

Spawn de los 7 engineers simultáneamente:

#### A. frontend-specialist
```
Auditá el frontend de {proyecto}:
- src/app/, src/components/
- Stack: detectar versión Next.js y React del package.json

Output: outputs/audit-frontend.md

Checklist:
- Uso correcto de Server Components vs Client Components
- Cache Components (use cache directive, cacheLife, cacheTag)
- React 19 features (useOptimistic, use(), Suspense)
- Bundle size
- Anti-patrones (useEffect para data, etc.)
```

#### B. backend-specialist
```
Auditá el backend de {proyecto}:
- src/app/api/, Server Actions, src/lib/

Output: outputs/audit-backend.md

Checklist:
- Validación Zod en todos los inputs
- withAuth helpers usados consistentemente
- Error handling estándar (no errores crudos al cliente)
- Rate limiting en endpoints sensibles
- Estructura de Server Actions vs API Routes
```

#### C. supabase-admin
```
Auditá la base de datos de {proyecto}:
- Schema (tablas en src/lib/supabase/)
- Migrations
- RLS policies

Output: outputs/audit-supabase.md

Checklist:
- RLS policies en TODAS las tablas
- Índices en FKs y WHERE clauses comunes
- Migrations ordenadas y reversibles
- Vault para secretos (no en .env)
- Edge Functions vs Server Actions usados correctamente
```

#### D. vercel-deployer
```
Auditá deployment de {proyecto}:
- vercel.ts o vercel.json
- next.config.ts

Output: outputs/audit-vercel.md

Checklist:
- Fluid Compute habilitado
- vercel.ts en lugar de vercel.json
- AI Gateway si usa AI features
- Cron jobs configurados
- Headers de seguridad
- Cache strategy
```

#### E. performance-engineer
```
Auditá performance de {proyecto}:
- Bundle size (npm run build con ANALYZE)
- Lighthouse score (si servidor accesible)
- Cache Components usage
- Image optimization

Output: outputs/audit-performance.md

Métricas a chequear:
- LCP < 2.5s
- INP < 200ms
- CLS < 0.1
- TTFB < 800ms
- Bundle JS < 300KB
```

#### F. security-engineer
```
Auditá seguridad de {proyecto}:
- Headers HTTP
- Rate limiting
- Input validation (Zod everywhere)
- Auth patterns
- RLS bypasses (uso de service_role)
- Webhook signatures
- Secret management

Output: outputs/audit-security.md
```

#### G. accessibility-engineer
```
Auditá accesibilidad de {proyecto}:
- HTML semántico
- ARIA labels en componentes
- Contraste de colores Fluya Brand
- Navegación por teclado
- Forms con labels
- Imágenes con alt

Output: outputs/audit-accessibility.md

Target: Lighthouse Accessibility 100/100, WCAG AA.
```

### Paso 4: Consolidar findings

Mientras los engineers trabajan en paralelo, esperar todos los outputs.

Cuando estén listos, generar `outputs/audit-{fecha}-resumen.md` consolidando:

```markdown
# Audit Integral — {proyecto} — {fecha}

> Generado por /audit-proyecto
> Engineers ejecutados: frontend, backend, supabase, vercel, performance, security, accessibility

## 📊 Resumen ejecutivo

**Score general**: {calculado del promedio de severidad}

- 🔴 Críticos: {N}
- 🟡 Importantes: {N}
- 🟢 Sugerencias: {N}

## 🔴 Findings Críticos

{Consolidar todos los críticos de los 7 reportes, ordenados por impacto.

Cada finding con formato:

### {N}. {Título corto}
- **Área**: {frontend/backend/security/etc.}
- **Archivo**: {path:línea}
- **Impacto**: {qué pasa si no se resuelve}
- **Fix recomendado**: {acción concreta}
- **Esfuerzo**: {bajo/medio/alto}
}

## 🟡 Findings Importantes

{Top 10 importantes, mismo formato}

## 🟢 Sugerencias (top 10)

{Los más impactantes de sugerencias}

## Plan de implementación recomendado

### Sprint 1 — Críticos (esfuerzo bajo/medio)
- [ ] Finding #1
- [ ] Finding #3
- [ ] Finding #5
Tiempo estimado: {X horas}

### Sprint 2 — Importantes (top impacto)
- [ ] Finding #N
...

### Backlog
- {sugerencias para más adelante}

## Próximos pasos

1. Revisar este reporte con el equipo
2. Priorizar findings según impacto al cliente
3. Aplicar con: `/aplicar-mejoras {audit-{fecha}-resumen.md}` (cuando esté disponible)
   O manualmente: invocar a los engineers correspondientes con los findings específicos.

## Referencias

- Detalle frontend: outputs/audit-frontend.md
- Detalle backend: outputs/audit-backend.md
- Detalle supabase: outputs/audit-supabase.md
- Detalle vercel: outputs/audit-vercel.md
- Detalle performance: outputs/audit-performance.md
- Detalle security: outputs/audit-security.md
- Detalle accessibility: outputs/audit-accessibility.md
```

### Paso 5: Actualizar bitácora

Agregar entrada en `bitacora.md`:

```markdown
## {fecha} — Audit integral ejecutado

- Skill: /audit-proyecto
- Engineers consultados: 7
- Findings totales: {N críticos + N importantes + N sugerencias}
- Reporte: outputs/audit-{fecha}-resumen.md

### Resumen de áreas de mejora detectadas
{Top 3 áreas con más findings críticos}
```

### Paso 6: Cierre

```
✅ Audit integral completado para {proyecto}.

Findings totales: {N}
  🔴 Críticos: {N}
  🟡 Importantes: {N}
  🟢 Sugerencias: {N}

Reporte principal: outputs/audit-{fecha}-resumen.md
Detalle por área: outputs/audit-{frontend|backend|...}.md

Próximos pasos sugeridos:
  1. Revisá outputs/audit-{fecha}-resumen.md
  2. Priorizá con el equipo
  3. Aplicá los críticos primero
     - Para cada finding: invocar al engineer correspondiente:
       "{security/performance/frontend}-engineer: implementar fix
        para el finding {ID} del audit"
     - O usar /bucle-agentico para automatizar varios juntos

¿Querés que muestre los 3 findings más críticos ahora? (y/n)
```

---

## Reglas

- SIEMPRE despachar a TODOS los engineers en paralelo (no secuencial — tarda 3-5x más)
- SIEMPRE consolidar en un resumen ejecutivo (no dejar al dev leer 7 reportes sueltos)
- NUNCA modificar código — solo auditar y reportar
- SIEMPRE actualizar bitácora con el audit ejecutado
- SIEMPRE priorizar findings por impacto al usuario (no por elegancia técnica)

## Anti-patrones

- NO ejecutar engineers en secuencia (muy lento)
- NO auditar sin contexto previo (leer bitácora + project_plan)
- NO inventar findings — basarse en código real
- NO confundir con /modificacion-existente (este solo audita, no modifica)

## Ejemplo de invocación

```bash
cd ~/ProyectosIA/AplicacionesSaas/gestion-arca
claude
/audit-proyecto
```

O con argumento:
```
/audit-proyecto gestion-arca
```

Resultado esperado: 7 reports en outputs/ + 1 reporte consolidado en ~10 minutos.

---

*Skill v1.0 — Orquesta a los 7 engineers especializados. Iterar cuando se agreguen más engineers (db-architect, cost-optimizer, etc.).*
