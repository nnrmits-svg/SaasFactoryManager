# Bitacora - SaaS Factory Manager

## 2026-04-21 - WIP: Configuracion de entorno
- Agregado `.env.enc` y `.sops.yaml` para manejo seguro de secrets (SOPS encryption)
- Commit desde MacBookPro-2016

## 2026-04-17 - Refactor de Dashboard y Skills
- **Dashboard**: Simplificacion de `portfolio-dashboard`, `portfolio-grid`, `project-detail-view`
- **Skill Panel**: Refactor mayor de `skill-panel.tsx` y `skill-registry-dashboard.tsx` (reduccion significativa de codigo)
- **Factory Manager**: Limpieza de `agent-control-panel.tsx`, refactor de `skill-catalog-action.ts` (~118 lineas eliminadas)
- **Types**: Ajuste en `factory-manager/types/index.ts`
- **Layout/Nav**: Simplificacion de `layout.tsx` y `navbar.tsx`
- Balance neto: -177 lineas (89 agregadas, 266 eliminadas)

## 2026-03-31 - Sincronizacion automatica
- Sync general del proyecto

## 2026-03-28 - Sincronizacion automatica
- Sync general del proyecto

## 2026-03-27 - Sincronizacion automatica
- Sync general del proyecto

## 2026-05-04 - Sistema de creacion de proyectos con agente
- **Nuevo**: `project-creating-modal.tsx` - Modal con estados (creando/creado/fallido) y progress por stages
- **Nuevo**: `use-project-creation.ts` - Hook con state machine para el flujo de creacion (idle/pending/creating/created/failed), polling a Supabase para seguir el progreso
- **Nuevo**: `create-project-with-agent.ts` - Server action que crea proyecto via agente (folder, git-init, skills), con retry
- **Modificado**: `project-wizard.tsx` - Ampliado significativamente (+161 lineas) para integrar el flujo de creacion
- **Modificado**: `factory-dashboard.tsx` - Ajustes de integracion (+50 lineas)
- **Modificado**: `types/index.ts` - Nuevos tipos para `CreateProjectCommandResult`, stages, payloads (+28 lineas)
- **Modificado**: `agent-control-panel.tsx` - Ajuste menor
- Balance neto: +225 lineas (3 archivos nuevos, 4 modificados)
- Creacion de Bitacora.md
