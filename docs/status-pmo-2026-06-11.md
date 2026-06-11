# 📊 Estado SaaS Factory Manager — Handoff PMO

**Fecha:** 2026-06-11
**Prod:** https://saasfactory.grupo-its.com.ar
**Versión:** v1.2.12
**Branch:** `main` (HEAD `23be616`)

> Documento de estado para el PMO de SF Agent + SaaS Factory.
> Cronología detallada en `Bitacora.md`; plan vivo en `project_plan.md`.

---

## ✅ Cerrado esta sesión (todo en producción)

| # | Entrega | Versión |
|---|---------|---------|
| 1 | **Fix signup** — el alta de usuarios fallaba con "Database error saving new user" (trigger de capabilities sin `SECURITY DEFINER`, regresión de Mig 003). Mig 008 aplicada. | Mig 008 |
| 2 | **Polish Factory** — Settings "Agentes Conectados" (online por `last_seen_at`), métricas (commits/horas/versión) en el Factory nuevo, redirect `/factory`→`/leader/proyectos`, fix sesiones viejas pintadas en verde. | v1.2.9 / 1.2.10 |
| 3 | **AI Fluya actualizada + auto-update** — roles dinámicos desde código (no se desactualiza más), tool `buscar_conocimiento` (KB viva del Motor Proactivo), sync automático CHANGELOG→KB. | v1.2.11 |
| 4 | **Fix flujo de invitación** — invitado no podía entrar (faltaba definir contraseña + callback PKCE roto) y "Reenviar invite" no enviaba. Nueva ruta `/auth/confirm` (verifyOtp) + pantalla `/set-password` + resend por recovery. **Verificado end-to-end.** | v1.2.12 |
| 5 | **Email transaccional (Resend) operativo** — dominio `fluya.com.ar` verificado, templates apuntando al flujo nuevo. Invitaciones reales saliendo OK (delivered). | — |

## 🟡 Pendientes — SF Manager

- **Portar CRUD al Factory nuevo** (`/leader/proyectos` es read-only; crear/editar/eliminar siguen solo en el viejo `FactoryDashboard`). Esfuerzo M.
- **Rol `dev` sin UI propia** (`/dev/dashboard` no existe; el Factory es leader-only). Hoy un dev solo usa el Agent + ve `/dashboard`.
- **`feat/quote-from-actuals`** (137 commits sin mergear) → input del **Motor de Presupuesto (Sprint B)**. Revisar/mergear o dejar como Draft PR.
- **DMARC en fluya.com.ar** — los mails llegan pero caen en Spam de Gmail. Deliverability, no urgente.
- **Seed inicial KB de releases** (cron semanal `/api/cron/changelog-knowledge`) — correr una vez para cargar el changelog histórico.

## 🟡 Pendientes — SF Agent (repo separado)

- **Lifecycle de sesiones** — no se cierran al apagar el Agent (causa de fondo del bug "sesiones viejas en verde", parcheado del lado display en el Manager). → **Sprint D**.
- **Doble heartbeat** legacy (`last_heartbeat`) + nuevo (`last_seen_at`) conviviendo — conviene unificar.

## 🔴 Riesgos / Flags

- **Auto-sync del Agent prendido en `NNRM-iMac-275`** — se quería **apagado** (causó historias divergentes antes). Generó wip-commits automáticos esta sesión. **Revisar y apagar.**
- **API key de Resend** se compartió en chat para diagnóstico → **rotar en Resend.**
- **Trabajo en paralelo** entre máquinas/Claudes sobre el mismo `main` — por ahora historia lineal, pero vigilar.

## 📍 Estado del onboarding de usuarios

Funciona el ciclo completo: **invitar (leader) → email Resend → `/auth/confirm` → `/set-password` → ingresa**.
Para rol `leader`/`comercial` todavía se asigna por SQL (la UI solo invita `dev`/`cliente`).
Para usar el **SF Agent**, el usuario necesita rol **`dev`** (la RLS exige leader/dev para pushear commits/horas).

## 🔧 Stack / referencias

- **Stack:** Next.js 16 + React 19 + Supabase (`fxlvexilnrfkkcbzwskr`) + Vercel.
- **Email:** Resend SMTP custom en Supabase Auth, dominio `fluya.com.ar`.
- **Specs/arquitectura:** `~/ProyectosIA/ArqSaasFactory/kit-comercial/dev/docs/`.
- **Docs operativos:** `docs/smtp-resend-setup.md`, `docs/email-templates-fluya.md`.
