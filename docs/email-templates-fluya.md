# Email Templates — Fluya Studio (Supabase Auth)

> Pegar en **Supabase Dashboard → Authentication → Email Templates** del proyecto
> `fxlvexilnrfkkcbzwskr`. Diseño dark + gradiente Fluya, HTML email-safe.
>
> Cross-ref: setup SMTP en `docs/smtp-resend-setup.md`.

---

## ⚠️ IMPORTANTE — por qué los links apuntan a `/auth/confirm`

Con `@supabase/ssr` (flujo PKCE), los links de invite/recovery **NO** funcionan con
`exchangeCodeForSession` (`/auth/callback`) porque el code-verifier no existe en el
browser del invitado (el link se genera del lado servidor). El patrón correcto es
**`token_hash` + `verifyOtp`**, que maneja la ruta `/auth/confirm` del repo.

Por eso los botones de abajo usan:

| Template | URL del botón |
|---|---|
| **Invite user** | `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next=/set-password` |
| **Reset password** | `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/set-password` |
| **Confirm signup** | `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup&next=/dashboard` |

### Config requerida en Supabase (una vez)
- **Authentication → URL Configuration → Site URL** = `https://saasfactory.grupo-its.com.ar`
- **Redirect URLs** (allowlist) → agregar:
  - `https://saasfactory.grupo-its.com.ar/auth/confirm`
  - `https://saasfactory.grupo-its.com.ar/set-password`
  - `https://saasfactory.grupo-its.com.ar/dashboard`

`/auth/callback` se mantiene SOLO para OAuth (Google).

---

## 1. Invite user

**Subject:** `Te invitaron a Factory Manager — Fluya Studio`

```html
<!DOCTYPE html>
<html lang="es">
<body style="margin:0;padding:0;background-color:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0f;padding:40px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#13131a;border:1px solid rgba(255,255,255,0.08);border-radius:20px;overflow:hidden;">
          <tr>
            <td align="center" style="padding:36px 32px 8px 32px;">
              <span style="font-size:22px;font-weight:700;color:#ffffff;">Fluya </span><span style="font-size:22px;font-weight:700;color:#a855f7;">Studio</span>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 40px 8px 40px;">
              <h1 style="margin:0 0 12px 0;font-size:24px;font-weight:700;color:#ffffff;text-align:center;">Te invitaron a la fábrica</h1>
              <p style="margin:0 0 24px 0;font-size:15px;line-height:1.6;color:#a1a1aa;text-align:center;">
                Te dieron acceso a <strong style="color:#e4e4e7;">Factory Manager</strong>. Hacé clic abajo para activar tu cuenta y <strong style="color:#e4e4e7;">definir tu contraseña</strong>.
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:0 40px 8px 40px;">
              <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next=/set-password" style="display:inline-block;background:linear-gradient(90deg,#7c3aed,#a855f7);color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;padding:14px 40px;border-radius:12px;">Activar mi cuenta</a>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px 8px 40px;">
              <p style="margin:0;font-size:12px;line-height:1.6;color:#71717a;text-align:center;">
                Si el botón no funciona, copiá este link:<br>
                <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next=/set-password" style="color:#a855f7;word-break:break-all;">{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next=/set-password</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px 32px 40px;border-top:1px solid rgba(255,255,255,0.06);">
              <p style="margin:0;font-size:11px;line-height:1.5;color:#52525b;text-align:center;">
                Si no esperabas esta invitación, podés ignorar este correo.<br>
                © Fluya Studio · Grupo ITS
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 2. Reset password (también se usa para "Reenviar invite")

**Subject:** `Definí tu contraseña — Fluya Studio`

```html
<!DOCTYPE html>
<html lang="es">
<body style="margin:0;padding:0;background-color:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0f;padding:40px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#13131a;border:1px solid rgba(255,255,255,0.08);border-radius:20px;overflow:hidden;">
          <tr>
            <td align="center" style="padding:36px 32px 8px 32px;">
              <span style="font-size:22px;font-weight:700;color:#ffffff;">Fluya </span><span style="font-size:22px;font-weight:700;color:#a855f7;">Studio</span>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 40px 8px 40px;">
              <h1 style="margin:0 0 12px 0;font-size:24px;font-weight:700;color:#ffffff;text-align:center;">Definí tu contraseña</h1>
              <p style="margin:0 0 24px 0;font-size:15px;line-height:1.6;color:#a1a1aa;text-align:center;">
                Hacé clic abajo para elegir tu contraseña y entrar a Factory Manager.
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:0 40px 8px 40px;">
              <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/set-password" style="display:inline-block;background:linear-gradient(90deg,#7c3aed,#a855f7);color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;padding:14px 40px;border-radius:12px;">Definir contraseña</a>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px 8px 40px;">
              <p style="margin:0;font-size:12px;line-height:1.6;color:#71717a;text-align:center;">
                Si el botón no funciona, copiá este link:<br>
                <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/set-password" style="color:#a855f7;word-break:break-all;">{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/set-password</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px 32px 40px;border-top:1px solid rgba(255,255,255,0.06);">
              <p style="margin:0;font-size:11px;line-height:1.5;color:#52525b;text-align:center;">
                Si no pediste esto, ignorá este correo — tu contraseña sigue intacta.<br>
                © Fluya Studio · Grupo ITS
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 3. Confirm signup

**Subject:** `Confirmá tu cuenta — Fluya Studio`

Mismo layout que el de Invite, cambiando:
- Título: **"Confirmá tu cuenta"**, texto: *"Estás a un clic de empezar a gestionar tu fábrica."*, botón: **"Confirmar email"**.
- URL del botón y del link de fallback:
  `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup&next=/dashboard`
  (el signup público ya define su contraseña en "Crear cuenta", por eso va a /dashboard, no a /set-password.)

---

## Notas

- Las variables (`{{ .SiteURL }}`, `{{ .TokenHash }}`) las resuelve Supabase Auth.
- `{{ .SiteURL }}` = el **Site URL** configurado (debe ser `https://saasfactory.grupo-its.com.ar`).
- Probar el flujo completo: invitar → mail → "Activar mi cuenta" → /set-password → definir clave → /dashboard.
