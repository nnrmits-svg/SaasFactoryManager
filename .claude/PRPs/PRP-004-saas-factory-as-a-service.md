# PRP-004: SaaS Factory as a Service

> **Estado**: PENDIENTE
> **Fecha**: 2026-03-21
> **Proyecto**: SaasFactoryManager

---

## Objetivo

Convertir el Factory Manager en una plataforma web donde cualquier usuario pueda definir su idea de SaaS, generar la arquitectura completa (CLAUDE.md + skills + brief), pasar por un ciclo de refinamiento (Sensei), y obtener todo listo para que Claude Code construya el proyecto en Antigravity.

## Por Que

| Problema | Solucion |
|----------|----------|
| Construir un SaaS requiere conocimiento tecnico para configurar el proyecto | La app genera toda la config automaticamente |
| El proceso idea → codigo no tiene estructura | Pipeline guiado: Strategy → Product → Refine → Build |
| Cada dev configura su fabrica manualmente | La app genera el setup descargable personalizado |
| No hay forma de compartir el template en equipo | Multiples metodos de sincronizacion (GitHub, file picker, SharePoint) |

**Valor de negocio**: Reducir el tiempo de setup de un SaaS de horas a minutos. Permitir que usuarios no tecnicos definan su producto y obtengan la arquitectura lista para construir.

## Que

### Criterios de Exito
- [ ] Usuario completa wizard con asistencia de IA
- [ ] La app genera CLAUDE.md + BUSINESS_LOGIC.md personalizados
- [ ] Usuario puede exportar brief para Sensei y reimportarlo refinado
- [ ] Usuario puede descargar setup completo (zip con .claude/ + CLAUDE.md + skills)
- [ ] Pipeline visual muestra etapa de cada proyecto
- [ ] Proyectos se importan via GitHub OAuth, file picker, o manual
- [ ] Settings por usuario con multiples repos y configuraciones
- [ ] Multi-tenant funcional (cada usuario ve solo sus proyectos)

### Pipeline del Producto

```
Consulting Engine (Strategy)
    → Wizard + AI Agent ayuda a responder las 9 preguntas
    → Genera brief V1

Design Labs (Product)
    → Seleccion de design system
    → Preview visual del estilo elegido

Sensei (Refine)
    → Export del brief formateado
    → Import de la version refinada del Sensei
    → Brief V2 guardado

Claude Code / Antigravity (Build)
    → Genera CLAUDE.md + skills + estructura
    → Usuario descarga/sincroniza con su proyecto local
    → Claude Code lee las instrucciones y construye
```

---

## Features por Fase

### Fase 1: AI Agent en el Wizard
**Objetivo**: El agente de IA ayuda al usuario a responder las 9 preguntas del wizard
**Que incluye**:
- Chat con IA embebido en cada paso del wizard
- Sugerencias contextuales basadas en respuestas anteriores
- Boton "Ayudame a responder" que genera opciones
- Usa Vercel AI SDK v5 + OpenRouter
**Validacion**: Usuario completa wizard con asistencia de IA, brief queda guardado

### Fase 2: Generador de Setup
**Objetivo**: La app genera los archivos que Claude Code necesita para construir
**Que incluye**:
- Genera CLAUDE.md personalizado con el brief del proyecto
- Genera BUSINESS_LOGIC.md con especificacion tecnica
- Incluye skills relevantes segun el tipo de proyecto
- Boton "Descargar Setup" → zip con toda la estructura .claude/
- Boton "Copiar prompt" → prompt listo para pegar en Claude Code
**Validacion**: Usuario descarga zip, lo descomprime en su proyecto, Claude Code lo lee

### Fase 3: Export/Import Sensei
**Objetivo**: Ciclo de refinamiento con consultor externo
**Que incluye**:
- Boton "Exportar para Sensei" → genera brief formateado (markdown/PDF)
- Campo "Importar refinamiento" → pegar o subir la respuesta del Sensei
- Diff visual: que cambio entre brief V1 y V2
- Actualizar el brief en Supabase con la version refinada
**Validacion**: Usuario exporta, recibe refinamiento, lo importa, brief se actualiza

### Fase 4: Pipeline Visual
**Objetivo**: Ver en que etapa esta cada proyecto
**Que incluye**:
- Barra de progreso: Strategy → Product → Refine → Build → Live
- Estado automatico basado en datos (tiene brief? tiene setup? tiene commits?)
- En la lista de proyectos y en la pagina de detalle
**Validacion**: Pipeline refleja el estado real de cada proyecto

### Fase 5: Importacion de Proyectos
**Objetivo**: Multiples formas de importar proyectos existentes
**Que incluye**:
- **GitHub/GitLab OAuth**: Conectar cuenta(s), listar repos, detectar version SF
- **File picker**: `showDirectoryPicker()` para leer carpeta local (Chrome/Edge)
- **Upload CLAUDE.md**: Fallback para otros browsers
- **Manual**: Wizard actual (ya implementado)
- Deteccion automatica de version SF en todos los metodos
- Alerta si la version esta desactualizada
**Validacion**: Proyecto importado aparece en el dashboard con version detectada

### Fase 6: Settings por Usuario
**Objetivo**: Centro de configuracion personal
**Que incluye**:
- Perfil (nombre, email, avatar)
- Repositorios conectados (multiples GitHub/GitLab, cada uno con su token/OAuth)
- Almacenamiento SharePoint (Microsoft OAuth, para docs y exports)
- Factory config (version SF preferida, design system default, AI provider key)
- Equipo (invitar miembros, permisos por proyecto)
**Validacion**: Usuario configura sus conexiones, se persisten en Supabase

### Fase 7: Upgrade de Version SF
**Objetivo**: Actualizar proyectos desactualizados desde la app
**Que incluye**:
- Detectar version actual vs ultima disponible
- Boton "Actualizar a VX" en cada proyecto
- Si conectado via GitHub: crear branch, aplicar cambios, crear PR
- Si local: generar zip con archivos actualizados para descargar
- Preservar .claude/memory/ y skills-custom/ al actualizar
**Validacion**: Proyecto actualizado, version nueva reflejada

### Fase 8: Backup y Replica
**Objetivo**: Seguridad de datos mas alla de GitHub
**Que incluye**:
- Export automatico de briefs y config a SharePoint (si conectado)
- Boton "Exportar todo" → zip con proyectos + briefs + config
- Supabase point-in-time recovery (ya incluido en el plan)
- Historial de versiones de cada brief (JSONB con timestamps)
**Validacion**: Datos recuperables desde multiples fuentes

---

## Modelo de Datos (nuevas tablas/columnas)

```sql
-- Ya existente: projects.business_brief (JSONB)

-- Nueva: etapa del pipeline por proyecto
ALTER TABLE projects ADD COLUMN pipeline_stage TEXT
  DEFAULT 'strategy'
  CHECK (pipeline_stage IN ('strategy', 'product', 'refine', 'build', 'live'));

-- Nueva: conexiones de repositorio por usuario
CREATE TABLE user_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('github', 'gitlab', 'bitbucket', 'sharepoint')),
  provider_username TEXT,
  access_token TEXT, -- encriptado
  refresh_token TEXT, -- encriptado
  scopes TEXT[],
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'
);

ALTER TABLE user_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own connections" ON user_connections
  FOR ALL USING (auth.uid() = user_id);

-- Nueva: historial de briefs (versionado)
CREATE TABLE brief_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  version INT NOT NULL DEFAULT 1,
  brief JSONB NOT NULL,
  source TEXT CHECK (source IN ('wizard', 'sensei', 'manual', 'ai')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE brief_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users access brief versions" ON brief_versions
  FOR ALL USING (auth.role() = 'authenticated');

-- Nueva: settings de usuario
CREATE TABLE user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL UNIQUE,
  default_design_system TEXT DEFAULT 'fluya',
  default_sf_version TEXT DEFAULT 'V4',
  ai_provider TEXT DEFAULT 'openrouter',
  ai_api_key TEXT, -- encriptado
  sharepoint_tenant TEXT,
  preferences JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own settings" ON user_settings
  FOR ALL USING (auth.uid() = user_id);
```

---

## Arquitectura Feature-First

```
src/features/
├── factory-manager/          # Ya existente — wizard, CRUD, dashboard
│   ├── components/
│   │   ├── factory-dashboard.tsx    # Lista de proyectos
│   │   ├── project-wizard.tsx       # Wizard de 9 preguntas
│   │   ├── ai-assistant.tsx         # [NUEVO] Chat IA en el wizard
│   │   ├── pipeline-badge.tsx       # [NUEVO] Visual del pipeline
│   │   └── import-project.tsx       # [NUEVO] File picker + GitHub import
│   └── services/
│       ├── project-crud-action.ts   # CRUD existente
│       ├── setup-generator.ts       # [NUEVO] Genera CLAUDE.md + zip
│       ├── brief-export.ts          # [NUEVO] Export/import Sensei
│       └── github-sync.ts           # [NUEVO] GitHub API integration
│
├── settings/                 # [NUEVO] Configuracion por usuario
│   ├── components/
│   │   ├── settings-page.tsx
│   │   ├── connections-manager.tsx
│   │   └── profile-form.tsx
│   └── services/
│       ├── settings-action.ts
│       └── connections-action.ts
│
├── ai-agent/                 # [NUEVO] Agente de IA
│   ├── components/
│   │   └── chat-panel.tsx
│   └── services/
│       └── ai-action.ts      # Vercel AI SDK + OpenRouter
│
└── auth/                     # Ya existente
```

---

## Stack

| Capa | Tecnologia |
|------|------------|
| Framework | Next.js 16 + React 19 + TypeScript |
| Estilos | Tailwind CSS 3.4 |
| Backend | Supabase (Auth + DB + RLS) |
| AI | Vercel AI SDK v5 + OpenRouter |
| Git Integration | GitHub REST API + OAuth |
| File Access | File System Access API (browser) |
| Docs Storage | SharePoint via Microsoft Graph API |

---

## Orden de Implementacion Recomendado

```
Fase 1: AI Agent en Wizard ............ (valor alto, base para todo)
Fase 2: Generador de Setup ............ (core del producto)
Fase 3: Export/Import Sensei ........... (cierra el loop del pipeline)
Fase 4: Pipeline Visual ............... (UX, muestra progreso)
Fase 5: Importacion de Proyectos ...... (GitHub + file picker)
Fase 6: Settings por Usuario .......... (necesario para Fase 5)
Fase 7: Upgrade de Version SF ......... (gestion de versiones)
Fase 8: Backup y Replica .............. (seguridad, SharePoint)
```

---

## Fase 9: Roles de Usuario (Admin / Manager / Developer)
**Objetivo**: Control de acceso por rol
**Que incluye**:
- Columna `role` en tabla profiles (admin, manager, developer)
- Admin: ve todos los proyectos de todos los usuarios + dashboard global
- Manager: ve proyectos de su equipo
- Developer: ve solo sus proyectos
- RLS policies filtran segun rol
- Dashboard Admin con KPIs globales
**Validacion**: Admin ve todo, developer ve solo lo suyo

## Fase 10: Business OS — Integracion entre Apps (FUTURO)
**Objetivo**: Dashboard unificado que agrega datos de todas las apps del portfolio
**Estado**: PENDIENTE DE DEFINICION — retomar cuando el Business OS este mas claro
**Concepto**:
- Cada app existente (con su propia DB) expone un endpoint `/api/business-os/status`
- Factory Manager consume esos endpoints y muestra metricas agregadas
- Tabla `app_connections` almacena URL + API key de cada app
- No se comparte auth (cada app tiene su login propio)
- SSO posible en el futuro con Supabase como identity provider central
**Nota**: Las apps existentes ya tienen su propia DB, no se unifica

---

## Gotchas

- [ ] `showDirectoryPicker()` no funciona en Safari/Firefox — necesita fallback
- [ ] Tokens de GitHub/SharePoint deben encriptarse en Supabase (no guardar en texto plano)
- [ ] Vercel AI SDK necesita OPENROUTER_API_KEY en env vars de Vercel
- [ ] RLS en user_connections es critico — tokens de acceso son sensibles
- [ ] SharePoint API requiere Azure AD app registration
- [ ] El zip generado no debe incluir node_modules ni .git

## Anti-Patrones

- NO guardar API keys en texto plano en Supabase
- NO hacer git push desde la web app sin confirmacion del usuario
- NO asumir que el usuario tiene GitHub — siempre ofrecer alternativas
- NO mezclar SharePoint con codigo fuente (solo para docs/exports)

---

*PRP pendiente aprobacion. No se ha modificado codigo.*
