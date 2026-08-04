# PRP-001: Business OS — Factory Manager

> **Estado**: APROBADO
> **Fecha**: 2026-03-17
> **Proyecto**: SaasFactoryManager

---

## Objetivo

Transformar el Factory Manager de un escaner simple a un **Business OS** completo: plataforma de gestion de proyectos SaaS con portfolio dashboard, tracking de versiones/commits, calculo de tiempo efectivo de trabajo, configuracion automatica de entornos nuevos, y un skill de design system inyectable.

## Por Que

| Problema | Solucion |
|----------|----------|
| No hay visibilidad del estado de los proyectos en cartera | Portfolio Dashboard con estado, version, commits |
| No se sabe cuanto tiempo se invirtio en cada proyecto | Calculo de tiempo efectivo basado en commits |
| Crear un proyecto nuevo requiere pasos manuales | Configuracion automatica: template + design system + perfilado |
| El design system Fluya no se puede reutilizar facilmente | Skill `apply-design-system` inyectable en cualquier proyecto |
| No hay secuencia de versiones entre proyectos | Version tracker con historial de commits |

**Valor de negocio**: Saber el costo real de desarrollo de cada proyecto. Crear nuevos proyectos en minutos. Gestionar el portfolio desde un solo lugar.

## Que

### Criterios de Exito
- [ ] Dashboard muestra todos los proyectos con: nombre, version, ultimo commit, tiempo total invertido, estado
- [ ] Click en un proyecto abre detalle con historial de commits y timeline
- [ ] Tiempo efectivo calculado desde commits (diferencia entre timestamps = sesiones de trabajo)
- [ ] Crear proyecto nuevo: inyecta template + design system + abre en Antigravity
- [ ] Skill `apply-design-system` funcional y reutilizable desde cualquier proyecto SaaS Factory
- [ ] Design system Fluya aplicado al propio Factory Manager
- [ ] `npm run typecheck` pasa
- [ ] `npm run build` exitoso

### Comportamiento Esperado

**Portfolio Dashboard (Happy Path):**
1. Usuario abre `/dashboard` → ve tabla/grid con todos los proyectos
2. Cada proyecto muestra: nombre, version SF, ultimo commit (fecha + mensaje), tiempo total trabajado, status badge
3. Click en proyecto → vista detalle con timeline de commits, grafico de actividad, costo estimado
4. Tiempo efectivo = suma de sesiones (un commit < 2h del anterior = misma sesion)

**Crear Proyecto Nuevo (Happy Path):**
1. Usuario va a `/factory` → llena nombre + directorio
2. Sistema crea proyecto con `saas-factory` template
3. Sistema inyecta design system seleccionado (Fluya por defecto)
4. Sistema abre en Antigravity
5. Usuario entra a Claude y ejecuta `/new-app` para la entrevista de negocio

**Skill apply-design-system:**
1. Desde cualquier proyecto SF, el usuario dice "aplica el design system Fluya"
2. El skill lee `fluya_design_system.md`, genera/actualiza:
   - `tailwind.config.ts` con colores custom (fluya-purple, fluya-green, fluya-blue)
   - `src/shared/components/navbar.tsx`
   - `src/shared/components/footer.tsx`
   - `src/app/globals.css` con variables base
   - `src/app/layout.tsx` con dark theme + Navbar + Footer
3. Todo funciona con un `npm run dev`

---

## Contexto

### Referencias
- `src/features/factory-manager/` — Feature existente (scanner, sync, create, open)
- `fluya_design_system.md` — Design system completo de Fluya Studio
- `.claude/design-systems/` — 5 design systems disponibles
- `.claude/skills/skill-creator/SKILL.md` — Formato para crear skills

### Arquitectura Propuesta (Feature-First)

```
src/
├── features/
│   ├── factory-manager/          # EXISTENTE — Extender
│   │   ├── components/
│   │   │   ├── factory-dashboard.tsx   # Actualizar: separar crear vs portfolio
│   │   │   ├── directory-picker.tsx    # Existente, no tocar
│   │   │   ├── project-card.tsx        # NUEVO: card de proyecto en grid
│   │   │   └── project-detail.tsx      # NUEVO: vista detalle con commits
│   │   ├── services/
│   │   │   ├── scan-action.ts          # Existente
│   │   │   ├── create-action.ts        # Extender: inyectar design system
│   │   │   ├── git-service.ts          # NUEVO: leer commits, calcular tiempo
│   │   │   └── ...existentes
│   │   └── types/
│   │       └── index.ts                # Extender con ProjectDetail, CommitInfo, etc.
│   │
│   └── dashboard/                # ACTIVAR — Portfolio view
│       ├── components/
│       │   ├── portfolio-grid.tsx       # Grid de proyectos
│       │   ├── stats-bar.tsx            # Metricas globales
│       │   └── activity-chart.tsx       # Grafico de actividad (simple)
│       ├── services/
│       │   └── portfolio-service.ts     # Agregar datos de multiples proyectos
│       └── types/
│           └── index.ts
│
├── app/
│   ├── (main)/
│   │   ├── dashboard/page.tsx          # Portfolio Dashboard
│   │   ├── factory/page.tsx            # Crear + Config proyectos
│   │   └── project/[name]/page.tsx     # NUEVO: Detalle de proyecto
```

### Nuevo Skill: apply-design-system

```
.claude/skills/apply-design-system/
├── SKILL.md                            # Instrucciones del skill
└── references/
    └── fluya-design-system.md          # Copia del design system (o referencia)
```

### Modelo de Datos (Supabase + Git sync)

Supabase como fuente de verdad para proyectos y metricas. Git se lee del filesystem y se sincroniza a BD.

```sql
-- Proyectos en cartera
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  path TEXT NOT NULL,
  sf_version TEXT,
  design_system TEXT DEFAULT 'fluya',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'paused')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Commits sincronizados desde git
CREATE TABLE commits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  hash TEXT NOT NULL,
  message TEXT NOT NULL,
  author TEXT,
  committed_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, hash)
);

-- Sesiones de trabajo calculadas
CREATE TABLE work_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL,
  commit_count INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices
CREATE INDEX idx_commits_project ON commits(project_id, committed_at DESC);
CREATE INDEX idx_sessions_project ON work_sessions(project_id, started_at DESC);
```

```typescript
interface Project {
  id: string;
  name: string;
  path: string;
  sfVersion: string | null;
  designSystem: string;
  status: 'active' | 'archived' | 'paused';
  createdAt: Date;
  updatedAt: Date;
  // Computed from relations
  totalWorkMinutes?: number;
  lastCommit?: CommitInfo | null;
  commitCount?: number;
}

interface CommitInfo {
  id: string;
  projectId: string;
  hash: string;
  message: string;
  author: string;
  committedAt: Date;
}

interface WorkSession {
  id: string;
  projectId: string;
  startedAt: Date;
  endedAt: Date;
  durationMinutes: number;
  commitCount: number;
}
```

---

## Blueprint (Assembly Line)

> IMPORTANTE: Solo FASES. Las subtareas se generan al entrar a cada fase.

### Fase 1: Design System Fluya aplicado al Factory Manager
**Objetivo**: El propio Factory Manager usa el design system Fluya (dark theme, colores, glassmorphism, navbar, footer). Esto establece la base visual para todo lo demas.
**Validacion**:
- Tailwind config tiene colores fluya-purple, fluya-green, fluya-blue
- Layout root tiene Navbar + Footer Fluya
- Fondo `#0B001E`, cards con glassmorphism
- Screenshot confirma look Fluya

### Fase 2: BD + Git Service + Tipos
**Objetivo**: Crear tablas en Supabase (projects, commits, work_sessions). Servicio que lee commits de git, los sincroniza a BD, y calcula sesiones de trabajo. Tipos TypeScript alineados con BD.
**Validacion**:
- Tablas creadas con RLS habilitado
- `git log` parseado y sincronizado a tabla commits
- Sesiones calculadas (gap > 2h = nueva sesion) y guardadas
- typecheck pasa

### Fase 3: Portfolio Dashboard
**Objetivo**: `/dashboard` muestra grid de proyectos con nombre, version, ultimo commit, tiempo trabajado, status. Metricas globales arriba (total proyectos, horas totales, proyecto mas activo).
**Validacion**:
- Grid renderiza todos los proyectos escaneados
- Cada card muestra datos reales de git
- Stats bar con metricas agregadas
- Responsive y con estilo Fluya

### Fase 4: Vista Detalle de Proyecto
**Objetivo**: `/project/[name]` muestra timeline de commits, sesiones de trabajo, version actual, y acciones (abrir, sync). Ruta dinamica.
**Validacion**:
- Click en card navega a detalle
- Timeline de commits visible
- Sesiones de trabajo con duracion
- Boton "Abrir en IDE" funciona

### Fase 5: Mejorar Create App + Design System injection
**Objetivo**: Al crear un proyecto nuevo, se inyecta automaticamente el design system seleccionado (Fluya por defecto). El flujo es: crear → inyectar design system → abrir en Antigravity.
**Validacion**:
- Crear app nueva incluye Tailwind config con colores Fluya
- Navbar y Footer inyectados
- Layout con dark theme
- App abre en Antigravity lista para trabajar

### Fase 6: Skill apply-design-system
**Objetivo**: Crear skill reutilizable en `.claude/skills/apply-design-system/` que cualquier proyecto SaaS Factory pueda usar. Lee el design system y aplica: tailwind config, componentes base, layout, globals.css.
**Validacion**:
- Skill tiene SKILL.md con frontmatter valido
- Instrucciones claras paso a paso
- Referencia al design system incluida
- Probado en un proyecto existente

### Fase 7: Validacion Final
**Objetivo**: Sistema funcionando end-to-end
**Validacion**:
- [ ] `npm run typecheck` pasa
- [ ] `npm run build` exitoso
- [ ] Portfolio Dashboard con datos reales
- [ ] Detalle de proyecto con commits
- [ ] Crear proyecto inyecta design system
- [ ] Skill apply-design-system documentado
- [ ] Playwright screenshot confirma UI Fluya en todas las vistas

---

## Gotchas

- [ ] `git log` puede ser lento en repos grandes — limitar a ultimos 100 commits por defecto
- [ ] Proyectos sin git no tendran commits — manejar gracefully
- [ ] El calculo de sesiones (gap 2h) es heuristico — documentar la logica
- [ ] Server Actions no pueden ejecutar `git` directamente en el cliente — todo server-side
- [ ] `exec`/`spawn` de git en Server Actions necesita manejar paths con espacios
- [ ] El Factory Manager corre en puerto 3002 — links a otros proyectos son relativos al filesystem, no URLs
- [ ] Design system Fluya usa `bg-[#0B001E]` — verificar que no choque con clases existentes de gray-950

## Anti-Patrones

- NO leer git en cada request (sincronizar a BD y leer de ahi)
- NO hardcodear paths (usar las resoluciones existentes en resolve-path.ts)
- NO hacer cross-feature imports (dashboard importa de shared, no de factory-manager)
- NO meter logica de git en componentes (todo en services)
- NO ignorar errores de TypeScript
- NO crear componentes de mas de 500 lineas

---

*PRP pendiente aprobacion. No se ha modificado codigo.*
