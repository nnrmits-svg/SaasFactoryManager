# SMTP custom Supabase Auth via Resend

> **Por que**: el SMTP default de Supabase tiene rate limit de ~2 emails/hora.
> Hace inviable invitar varios operadores seguidos. Conectando Resend, el limit
> pasa a 100/dia en free tier y 50k/mes en planes pagos.

---

## Pre-requisitos

1. Cuenta en https://resend.com (free tier alcanza al inicio).
2. **Dominio propio** (no se puede usar `@gmail.com` ni similares). Idealmente
   `mail.tudominio.com` o `noreply@tudominio.com`.
3. Acceso al DNS de ese dominio para agregar registros SPF + DKIM.

---

## Paso 1 — Verificar dominio en Resend

1. Resend Dashboard → **Domains** → **Add Domain** → ingresar `tudominio.com`.
2. Resend muestra 3 registros DNS para agregar:
   - **MX** (a `feedback-smtp.<region>.amazonses.com`)
   - **TXT** SPF (`v=spf1 include:amazonses.com ~all`)
   - **TXT** DKIM (key larga)
3. Agregar los 3 al DNS del dominio (Cloudflare, Namecheap, etc).
4. Esperar verificacion (5 min - 24 h segun DNS provider). El badge cambia a
   verde **"Verified"**.

## Paso 2 — Crear API key en Resend

1. Resend → **API Keys** → **Create API Key**.
2. Nombre: `supabase-auth-smtp`. Permission: **Sending access**.
3. Copiar la key (`re_xxxxxxxxxxxxxxxx`). **Solo se muestra una vez.**

## Paso 3 — Configurar SMTP en Supabase

1. Supabase Dashboard del proyecto (`fxlvexilnrfkkcbzwskr`):
   https://supabase.com/dashboard/project/fxlvexilnrfkkcbzwskr/auth/templates
2. Bajar a **SMTP Settings** → activar **"Enable Custom SMTP"**.
3. Completar:

   | Campo | Valor |
   |---|---|
   | Sender email | `noreply@tudominio.com` |
   | Sender name | `Fluya Studio` |
   | Host | `smtp.resend.com` |
   | Port | `465` |
   | Username | `resend` |
   | Password | la API key del Paso 2 (`re_...`) |
   | Minimum interval between emails | `0` segundos (Resend ya tiene su propio rate limit) |

4. **Save**.

## Paso 4 — Testear

1. Supabase → **Authentication → Users** → **Invite user** → poner un email de
   prueba.
2. Verificar que llega al inbox (no spam) en menos de 1 minuto.
3. Si llega → Sender domain bien configurado. Si va a spam → revisar DMARC +
   reputacion del dominio.

## Paso 5 — Customizar templates (opcional pero recomendado)

Mismo dashboard → **Authentication → Email Templates**. Cambiar:

- **Confirm signup** y **Invite user** → reemplazar el HTML default por uno con
  branding Fluya (gradient, logo, footer link a `/about`).
- Asunto sugerido para invite: `Te invitaron a Factory Manager — Fluya Studio`.

> Cuando este listo, agregar v1.1.1 al changelog en `/about` con
> "Emails transaccionales propios via Resend" si querés hacerlo visible al usuario.

---

## Que NO requiere codigo en el repo

Toda la integracion vive en el SMTP custom de Supabase Auth. Las llamadas que ya
hacemos en `user-actions.ts` (`auth.admin.inviteUserByEmail`, `resetPasswordForEmail`)
automaticamente usan el SMTP configurado.

## Cuando si requeriria codigo

Solo si queremos emails transaccionales **propios** (welcome email custom
post-confirmacion, notificaciones de proyectos, etc) — eso seria un sprint
separado: agregar `resend` SDK + helper `sendTransactionalEmail`.
