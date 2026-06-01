# PASO 4 — E2E middleware / logins

> Fecha: 2026-06-01 (modo autónomo) · Branch `feat/sprint-a-1-base`

## Smoke test (dev server, SIN sesión) — ✅ PASS

Levanté `npm run dev` (puerto 3000) y verifiqué que el refactor del PASO 2 no rompió arranque ni middleware:

| Ruta | HTTP | Resultado |
|---|---|---|
| `/` | 200 | OK (pública) |
| `/login` | 200 | OK (pública) |
| `/me` | 307 → /login | auth-gate OK |
| `/settings` | 307 → /login | auth-gate OK |
| `/dashboard` | 307 → /login | auth-gate OK |

Sin errores en el log del dev server. El server arranca, las páginas públicas renderean, el auth-gate redirige correctamente tras el rename de roles.

## ⚠️ Login autenticado con los 3 users — NO verificable autónomamente

El PASO 4.2 pide loguear como `ricardo@grupoits.com.ar` (leader), `nnrmits@gmail.com` (dev) y
`rmarchetti@grupoits.com.ar` (comercial). **No tengo las contraseñas** de esos usuarios en modo
autónomo, así que no puedo ejecutar el login real. No es un fallo del código (build verde + roles
correctos en DB verificados en mig 001) — es una limitación del entorno.

**Pendiente para Riki** (antes de merge a prod): loguear con cada user y confirmar:
1. Entra sin error (el refactor no rompió navbar/user-menu/profile que leen `profile.role`).
2. El rol mostrado en el user-menu es el correcto (Líder / Desarrollador / Comercial).
3. El enforcement del middleware (PASO 5) lo deja en las páginas permitidas y lo saca de las prohibidas.

Sugerencia: si Riki me pasa credenciales de test (o crea un user de prueba con password conocida),
puedo correr el E2E con Playwright.
