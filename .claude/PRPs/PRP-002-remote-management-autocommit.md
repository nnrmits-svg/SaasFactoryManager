# PRP-002: Remote App Management + Auto-Commit + Skill Extraction

> **Estado**: COMPLETADO
> **Fecha**: 2026-03-18
> **Proyecto**: SaaS Factory Manager

---

## Objetivo

Convertir el Factory Manager en un **control center completo** que pueda gestionar cualquier app del portfolio: trackear tiempo de desarrollo con precision via auto-commit, aplicar skills remotamente, y extraer patterns reutilizables de apps existentes como SuscriptionsMgmt.

---

## Por Que

| Problema | Solucion | Valor |
|----------|----------|-------|
| El tiempo de desarrollo se calcula mal (solo commits manuales, muestra "1m") | Auto-commit en cada cambio detectado, tracking granular | Metricas reales de tiempo invertido por proyecto |
| No puedo gestionar apps existentes desde el Factory Manager | Management remoto: aplicar skills, ver estado, deploy | Un solo punto de control para todo el portfolio |
| SuscriptionsMgmt tiene 17 features maduras pero no son reutilizables | Extraer patterns como skills del SaaS Factory | Cada app nueva arranca con features probadas en produccion |
| Cada app se gestiona por separado, sin vista unificada | Dashboard centralizado con acciones remotas | Reduccion de context-switching entre proyectos |

---

## Que

### Criterios de Exito

- [ ] Auto-commit funciona: cada cambio en un proyecto trackeado genera un commit automatico
- [ ] Start/Stop tracking desde la UI del Factory Manager (por proyecto)
- [ ] El tiempo de desarrollo se calcula con precision real (basado en auto-commits)
- [ ] Puedo aplicar skills (design system, login, payments) a cualquier proyecto desde el FM
- [ ] Al menos 3 skills extraidos de SuscriptionsMgmt estan disponibles
- [ ] La vista de detalle de proyecto muestra acciones de gestion (tracking, skills, abrir IDE)

### Comportamiento Esperado

**Auto-Commit (Happy Path)**:
1. Desde Portfolio, abro un proyecto y hago click en "Start Tracking"
2. El Factory Manager inicia un file watcher en ese proyecto
3. Mientras desarrollo (en Antigravity/Claude Code), cada cambio se auto-commitea
4. Los commits tienen formato: `[auto] dev-session YYYY-MM-DD HH:mm`
5. Los cambios se agrupan (debounce 30s) para no generar commits por cada keystroke
6. Al terminar, hago click en "Stop Tracking"
7. El Portfolio ahora muestra tiempo real de desarrollo

**Gestion Remota (Happy Path)**:
1. Desde Portfolio, veo todas mis apps con estado de salud
2. Click en un proyecto → vista detalle con acciones:
   - Tracking: Start/Stop auto-commit
   - Skills: Aplicar design system, login, payments, emails, etc.
   - Abrir: IDE, terminal, browser
   - Info: commits, tiempo, version SF, deps
3. Click en "Aplicar Skill" → selecciono skill → se ejecuta en el proyecto target

**Skill Extraction (Happy Path)**:
1. Analizo SuscriptionsMgmt y extraigo patterns como skills reutilizables
2. Los skills quedan en `.claude/skills/` del SaaS Factory (template)
3. Disponibles para aplicar a cualquier proyecto desde el FM

---

## Contexto

### Referencias

- PRP-001: Business OS Factory Manager (COMPLETADO - portfolio, git tracking, design system)
- SuscriptionsMgmt: App de gestion de suscripciones con 17 features
- Skills existentes: add-login, add-payments, add-emails, add-mobile, apply-design-system

### SuscriptionsMgmt - Features Extractables

| Feature | Descripcion | Candidato a Skill? |
|---------|-------------|-------------------|
| subscriptions CRUD | CRUD completo con status tracking, filtros, paginacion | SI - `add-subscriptions` |
| alerts/expiration | Alertas por email 15 dias antes de vencimiento + recordatorios diarios | SI - `add-alerts` |
| admin dashboard | Panel admin con metricas financieras, usuarios, exchange rates | SI - `add-admin` |
| software catalog | Catalogo pre-cargado de servicios populares | NO - muy especifico |
| finance metrics | Graficos con Recharts, breakdown por pais/categoria | PARCIAL - `add-charts` |
| demo mode | Fallback con datos demo cuando Supabase no esta configurado | SI - `add-demo-mode` |
| PDF generation | jsPDF + html2canvas para exportar reportes | PARCIAL - util pero nicho |

**Skills prioritarios a extraer**: `add-subscriptions`, `add-alerts`, `add-admin`

### Arquitectura: Auto-Commit Engine

```
Factory Manager (Next.js)
    |
    ├── API Route: /api/tracking/start
    |     → Spawn child process (chokidar watcher)
    |     → Watch: src/, public/ (ignore: node_modules, .next, .git)
    |     → Debounce: 30 segundos
    |     → On change: git add -A && git commit -m "[auto] dev-session ..."
    |
    ├── API Route: /api/tracking/stop
    |     → Kill child process
    |     → Final commit si hay cambios pendientes
    |
    ├── API Route: /api/tracking/status
    |     → Lista de proyectos con tracking activo
    |
    └── State: Supabase table `tracking_sessions`
          → project_id, started_at, ended_at, status, pid
```

**Patron de debounce**:
```
Cambio detectado → Timer 30s → Si mas cambios, reiniciar timer
                              → Si no mas cambios, auto-commit
```

**Archivos a ignorar** (no triggean auto-commit):
- `node_modules/`, `.next/`, `.git/`, `dist/`, `.env*`
- `*.lock`, `package-lock.json`
- Archivos binarios (imagenes, fonts)

### Modelo de Datos

**Nueva tabla: `tracking_sessions`**

```sql
CREATE TABLE tracking_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN ('active', 'stopped')) DEFAULT 'active',
  pid INTEGER, -- Process ID del watcher
  auto_commits INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tracking_project ON tracking_sessions(project_id, status);
```

**Tipos TypeScript**:

```typescript
interface TrackingSession {
  id: string;
  projectId: string;
  startedAt: string;
  endedAt: string | null;
  status: 'active' | 'stopped';
  pid: number | null;
  autoCommits: number;
}
```

### Arquitectura: Skill Application Remota

```
Factory Manager UI
    |
    ├── "Aplicar Skill" button (en project detail)
    |     → Modal con lista de skills disponibles
    |     → Seleccionar skill → Ejecutar
    |
    └── Server Action: applySkillToProject(projectPath, skillName)
          → Lee skill definition de .claude/skills/[name]/SKILL.md
          → Ejecuta las transformaciones en el proyecto target:
             - Copiar archivos necesarios
             - Modificar configs (tailwind, package.json)
             - Crear migraciones SQL
             - npm install si hay nuevas deps
```

---

## Blueprint (FASES SOLAMENTE)

### Fase 1: Auto-Commit Engine
**Objetivo**: Sistema de file watching + auto-commit controlado desde el FM.
- API routes para start/stop/status
- Child process con chokidar que watchea y auto-commitea
- Tabla tracking_sessions en Supabase
- UI en project detail: boton Start/Stop Tracking

**Validacion**: Inicio tracking en un proyecto, hago un cambio en un archivo, se genera un auto-commit en <30s.

### Fase 2: Mejora de Time Tracking
**Objetivo**: El tiempo de desarrollo se calcula con precision real usando auto-commits.
- Actualizar git-service.ts para reconocer auto-commits `[auto]`
- Los auto-commits dan tracking granular (cada 30s de actividad)
- Session gap reducido para auto-commits (5 min en vez de 2h)
- Dashboard muestra tiempo real vs estimado

**Validacion**: Despues de una sesion de tracking, el tiempo mostrado refleja la realidad.

### Fase 3: Project Management UI Mejorada
**Objetivo**: Vista detalle de proyecto como un control center completo.
- Boton tracking (start/stop con indicador visual)
- Seccion "Skills disponibles" con botones de aplicacion
- Estado del proyecto: version SF, deps, ultimo build
- Acciones: abrir IDE, abrir browser, abrir terminal

**Validacion**: Desde la vista detalle puedo controlar todo sobre un proyecto.

### Fase 4: Skill Extraction de SuscriptionsMgmt
**Objetivo**: Extraer 3+ skills reutilizables de la app existente.
- Analizar patterns de subscriptions CRUD
- Analizar sistema de alerts/expiration
- Analizar admin dashboard
- Documentar cada skill en formato `.claude/skills/[name]/SKILL.md`

**Validacion**: Los skills extraidos son aplicables a un proyecto nuevo.

### Fase 5: Skill Application Engine
**Objetivo**: Poder aplicar cualquier skill a cualquier proyecto desde el FM.
- Server action que ejecuta un skill en un proyecto target
- Lee la definicion del skill y aplica transformaciones
- Maneja dependencias (npm install), configs (tailwind), y migraciones
- Feedback visual del progreso

**Validacion**: Aplico `add-login` a un proyecto vacio desde el FM y funciona.

### Fase 6: Validacion Final e Integracion
**Objetivo**: Todo funciona end-to-end.
- Auto-commit + time tracking + portfolio se actualizan en tiempo real
- Skills se aplican correctamente
- Build limpio, sin errores de tipos
- Testing con Playwright del flujo completo

**Validacion**: Ciclo completo: creo app → start tracking → desarrollo → stop tracking → veo metricas reales → aplico skill → funciona.

---

## Gotchas

- [ ] Chokidar necesita instalarse como dependencia del FM (`npm install chokidar`)
- [ ] El child process del watcher debe limpiarse si el FM se cierra (handle SIGTERM)
- [ ] Auto-commits no deben incluir `node_modules/` ni `.env` (gitignore debe estar bien)
- [ ] El debounce de 30s es un balance entre granularidad y ruido en git log
- [ ] Los skills aplicados remotamente necesitan adaptarse al proyecto target (no todos los proyectos tienen la misma estructura)
- [ ] SuscriptionsMgmt usa Google AI + OpenAI, pero los skills extraidos deben usar el Golden Path (Vercel AI SDK + OpenRouter)
- [ ] Las migraciones SQL de los skills deben ser idempotentes (no fallar si la tabla ya existe)

---

## Anti-Patrones

- **NO** modificar la template base de SaaS Factory para el auto-commit. Va en el Factory Manager.
- **NO** hacer auto-commits cada keystroke. Debounce minimo 30 segundos.
- **NO** auto-commitear archivos sensibles (.env, secrets). Respetar .gitignore.
- **NO** extraer skills que son demasiado especificos de SuscriptionsMgmt (ej: catalogo de software). Solo patterns genericos.
- **NO** asumir que todos los proyectos tienen Supabase configurado. Los skills deben verificar prerequisites.
- **NO** correr multiples watchers en el mismo proyecto. Verificar que no hay tracking activo antes de iniciar.

---

## Aprendizajes

_(Se llena durante la ejecucion)_
