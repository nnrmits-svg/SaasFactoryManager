# PRP-003: Skill Registry Central + Detección de Proyectos

> **Estado**: PENDIENTE
> **Fecha**: 2026-03-19
> **Proyecto**: SaaS Factory Manager

---

## Objetivo

Crear un **Skill Registry centralizado** en el Factory Manager que descubra dinámicamente todos los skills disponibles, permita copiarlos a cualquier proyecto del portfolio, y detecte automáticamente proyectos existentes (como SuscriptionsMgmt) combinando scan automático con registro manual.

---

## Por Qué

| Problema | Solución | Valor |
|----------|----------|-------|
| Skills hard-coded en array de 10 — los nuevos no aparecen | Discovery dinámico desde `.claude/skills/` del FM | Cada skill creado aparece automáticamente |
| No puedo instalar un skill en otro proyecto desde el FM | Copiar SKILL.md + references/ al proyecto destino | Un click para inyectar capacidades |
| No sé qué skills tiene cada proyecto | Escanear `.claude/skills/` de cada proyecto registrado | Vista clara de qué tiene cada app |
| SuscriptionsMgmt no aparece en el portfolio | Scan automático + registro manual | Todos los proyectos visibles y gestionables |
| Skills nuevos (add-admin, add-alerts) no llegan a otros proyectos | Registry central con catálogo browseable | Reutilización real entre proyectos |

---

## Qué

### Criterios de Éxito

- [ ] Skill Registry descubre TODOS los skills del FM dinámicamente (no hard-coded)
- [ ] Cada skill muestra: nombre, descripción, categoría, prerequisites, si tiene SKILL.md
- [ ] Se puede copiar/instalar un skill en cualquier proyecto registrado
- [ ] Se puede ver qué skills tiene instalado cada proyecto
- [ ] SuscriptionsMgmt aparece detectada en el portfolio
- [ ] Scan automático del directorio configurado detecta proyectos Next.js/.claude
- [ ] Se pueden agregar/remover proyectos manualmente
- [ ] UI de Skill Registry con filtros por categoría

---

## Modelo de Datos

### Skills (no necesitan tabla — son archivos)

```
Fuente: .claude/skills/*/SKILL.md del Factory Manager
Cada skill tiene:
  - name (nombre del directorio)
  - YAML frontmatter (description, category, allowed-tools, etc.)
  - Contenido markdown (instrucciones, código, ejemplos)
  - Subdirectorios opcionales (references/, scripts/)
```

### Proyecto → Skills instalados (detección por filesystem)

```
Para cada proyecto registrado:
  - Escanear {projectPath}/.claude/skills/
  - Comparar con el registry del FM
  - Status: installed | not-installed | outdated (si difiere del FM)
```

---

## Fases

### Fase 1: Discovery Dinámico de Skills
Reemplazar el array hard-coded por discovery real del filesystem.
- Leer `.claude/skills/*/SKILL.md` del FM
- Parsear YAML frontmatter para metadata
- Clasificar en: "injectable" (features para proyectos) vs "meta" (proceso del FM)
- Reemplazar `skill-catalog-action.ts` con versión dinámica

### Fase 2: Detección de Proyectos (Auto + Manual)
- Mejorar el scanner para detectar proyectos Next.js con o sin `.claude/`
- Agregar registro manual de proyectos (path input)
- Detectar SuscriptionsMgmt y registrarla automáticamente
- Escanear qué skills tiene cada proyecto (`{path}/.claude/skills/`)

### Fase 3: Skill Registry UI
- Panel de skills browseable con filtros por categoría
- Vista de cada skill con descripción, prerequisites, y preview del contenido
- Indicador de qué proyectos tienen cada skill instalado
- Acción "Instalar en proyecto" — seleccionar destino

### Fase 4: Instalación de Skills
- Copiar skill completo (SKILL.md + references/ + scripts/) al proyecto destino
- Verificar prerequisites antes de instalar
- Feedback de éxito/error
- Actualizar vista de skills instalados post-instalación

### Fase 5: Validación
- Build limpio
- SuscriptionsMgmt visible en portfolio
- Skills se descubren dinámicamente
- Instalar un skill en un proyecto y verificar que se copió correctamente

---

## Notas Técnicas

- Los skills "meta" (bucle-agentico, primer, prp, etc.) NO son instalables — son del proceso
- Los skills "injectable" son features que se pueden copiar a proyectos (add-login, add-payments, etc.)
- El YAML frontmatter ya tiene `user-invocable` y `description` — usarlos para clasificación
- El scanner actual ya busca `.claude/` — extenderlo, no reemplazarlo
- No necesitamos tabla de skills en Supabase — el filesystem es la fuente de verdad
