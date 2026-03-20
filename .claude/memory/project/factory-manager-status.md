# SaaS Factory Manager — Estado del Proyecto

## Que es
Business OS para gestionar un portfolio de proyectos SaaS. Control center centralizado.

## Implementado (actualizado 2026-03-20)
- PRP-001: Portfolio Dashboard (proyectos, commits, tiempo efectivo)
- PRP-002: Remote Management + Auto-Commit tracking
- PRP-003: Skill Registry Central + deteccion de proyectos
- Cost Reports con tarifa por hora y export CSV
- Setup-workstation skill
- Security + Performance skills
- Auth/Login completo: email/password, Google OAuth, forgot password, middleware, UserMenu en navbar
- RLS policies aseguradas: solo usuarios autenticados acceden a datos
- Tabla profiles con trigger auto-creacion al signup
- Deploy a Vercel (produccion)

## URLs
- Dominio custom: https://saasfactory.grupo-its.com.ar (redirect 308 → vercel)
- Vercel: https://saas-factory-manager.vercel.app
- Local: http://localhost:3002
- Vercel team: saas-fluyaia
- Vercel project: saas-factory-manager

## Paginas
- /dashboard — Portfolio con stats
- /factory — Crear proyectos
- /project/[name] — Detalle de proyecto
- /skills — Registro central de skills
- /reports — Reportes de costos
- /settings — Configuracion
- /login — Login (email + Google)
- /signup — Registro
- /forgot-password — Reset de password

## Supabase
- Tablas: projects, commits, work_sessions, tracking_sessions, profiles
- RLS: policies por auth.role() = 'authenticated' (no allow_all)
- Trigger: on_auth_user_created → crea profile automaticamente
- Column user_id agregada a projects (para multi-tenant futuro)

## Pendiente (requiere accion del usuario en Dashboard)
- Supabase Dashboard > Auth > URL Configuration:
  - Site URL: https://saasfactory.grupo-its.com.ar
  - Redirect URLs: agregar https://saasfactory.grupo-its.com.ar/** y http://localhost:3002/**
- Google OAuth: Supabase Dashboard > Auth > Providers > Google (necesita Google Cloud Console)
- Settings page (placeholder, sin funcionalidad aun)

## Git
- Branch desarrollo: master
- Branch produccion: main (up to date, pushed 2026-03-20)
- Repo: github.com/nnrmits-svg/SaasFactoryManager
- GitHub conectado a Vercel (auto-deploy en push a main)
