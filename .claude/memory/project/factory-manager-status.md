# SaaS Factory Manager — Estado del Proyecto

## Que es
Business OS + Fabrica de Software as a Service. Control center para gestionar portfolio de SaaS + pipeline completo de idea a producto construido.

## Vision (PRP-004)
Convertir el Factory Manager en plataforma donde cualquier usuario define su SaaS, genera arquitectura (CLAUDE.md + skills), pasa por Sensei, y obtiene todo listo para que Claude Code construya en Antigravity.

Pipeline: Consulting Engine (Strategy) → Design Labs (Product) → Sensei (Refine) → Claude Code (Build)

## Implementado (actualizado 2026-03-21)
- PRP-001: Portfolio Dashboard (proyectos, commits, tiempo efectivo)
- PRP-002: Remote Management + Auto-Commit tracking
- PRP-003: Skill Registry Central + deteccion de proyectos
- Cost Reports con tarifa por hora y export CSV
- Auth/Login completo: email/password, Google OAuth, forgot password, middleware
- RLS policies: solo usuarios autenticados
- Tabla profiles con trigger auto-creacion
- Deploy a Vercel (produccion)
- Factory page rediseñada: CRUD web-native (sin filesystem)
- Wizard de negocio: 9 preguntas guiadas para definir un SaaS
- business_brief JSONB en tabla projects
- Columnas description y repo_url en projects

## PRP-004 Roadmap (8 fases)
1. AI Agent en el wizard (asistencia IA para responder preguntas)
2. Generador de Setup (CLAUDE.md + skills + zip descargable)
3. Export/Import Sensei (ciclo de refinamiento)
4. Pipeline visual (Strategy → Build → Live)
5. Importacion de proyectos (GitHub OAuth, file picker, upload)
6. Settings por usuario (repos, SharePoint, AI keys, equipo)
7. Upgrade de version SF
8. Backup y replica (SharePoint + export)

## Decisiones arquitectonicas (2026-03-21)
- GitHub NO es obligatorio — es una opcion mas de conexion
- Cada usuario puede tener multiples repos (GitHub, GitLab, etc.)
- SharePoint solo para docs/exports, NO para codigo fuente
- File picker del browser para importar sin CLI (showDirectoryPicker)
- Fallback: upload de CLAUDE.md para browsers sin soporte
- No se puede modificar la terminal del usuario desde la web (seguridad del browser)
- AI Agent usa Vercel AI SDK v5 + OpenRouter

## URLs
- Dominio: https://saasfactory.grupo-its.com.ar
- Vercel: https://saas-factory-manager.vercel.app
- Local: http://localhost:3002
- Vercel team: saas-fluyaia

## Supabase
- Tablas: projects, commits, work_sessions, tracking_sessions, profiles
- Nuevas tablas planificadas: user_connections, brief_versions, user_settings
- RLS: policies por auth.role() = 'authenticated'

## Git
- Branch desarrollo: master
- Branch produccion: main
- Repo: github.com/nnrmits-svg/SaasFactoryManager
- Auto-deploy: push a main → Vercel
