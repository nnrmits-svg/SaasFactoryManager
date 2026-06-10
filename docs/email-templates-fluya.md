# Email Templates — Fluya Studio (Supabase Auth)

> Pegar en **Supabase Dashboard → Authentication → Email Templates** del proyecto
> `fxlvexilnrfkkcbzwskr`. Usan las variables de Supabase (`{{ .ConfirmationURL }}` etc).
> Diseño dark + gradiente Fluya, HTML email-safe (tablas + estilos inline).
>
> Cross-ref: setup SMTP en `docs/smtp-resend-setup.md`.

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
          <!-- Header -->
          <tr>
            <td align="center" style="padding:36px 32px 8px 32px;">
              <span style="font-size:22px;font-weight:700;color:#ffffff;">Fluya </span><span style="font-size:22px;font-weight:700;background:linear-gradient(90deg,#34d399,#a855f7);-webkit-background-clip:text;-webkit-text-fill-color:transparent;color:#a855f7;">Studio</span>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:16px 40px 8px 40px;">
              <h1 style="margin:0 0 12px 0;font-size:24px;font-weight:700;color:#ffffff;text-align:center;">Te invitaron a la fábrica</h1>
              <p style="margin:0 0 24px 0;font-size:15px;line-height:1.6;color:#a1a1aa;text-align:center;">
                Te dieron acceso a <strong style="color:#e4e4e7;">Factory Manager</strong>. Hacé clic abajo para activar tu cuenta y empezar.
              </p>
            </td>
          </tr>
          <!-- CTA -->
          <tr>
            <td align="center" style="padding:0 40px 8px 40px;">
              <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:linear-gradient(90deg,#7c3aed,#a855f7);color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;padding:14px 40px;border-radius:12px;">Activar mi cuenta</a>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px 8px 40px;">
              <p style="margin:0;font-size:12px;line-height:1.6;color:#71717a;text-align:center;">
                Si el botón no funciona, copiá este link:<br>
                <a href="{{ .ConfirmationURL }}" style="color:#a855f7;word-break:break-all;">{{ .ConfirmationURL }}</a>
              </p>
            </td>
          </tr>
          <!-- Footer -->
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

## 2. Confirm signup

**Subject:** `Confirmá tu cuenta — Fluya Studio`

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
              <h1 style="margin:0 0 12px 0;font-size:24px;font-weight:700;color:#ffffff;text-align:center;">Confirmá tu cuenta</h1>
              <p style="margin:0 0 24px 0;font-size:15px;line-height:1.6;color:#a1a1aa;text-align:center;">
                Estás a un clic de empezar a gestionar tu fábrica.
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:0 40px 8px 40px;">
              <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:linear-gradient(90deg,#7c3aed,#a855f7);color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;padding:14px 40px;border-radius:12px;">Confirmar email</a>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px 8px 40px;">
              <p style="margin:0;font-size:12px;line-height:1.6;color:#71717a;text-align:center;">
                Si el botón no funciona, copiá este link:<br>
                <a href="{{ .ConfirmationURL }}" style="color:#a855f7;word-break:break-all;">{{ .ConfirmationURL }}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px 32px 40px;border-top:1px solid rgba(255,255,255,0.06);">
              <p style="margin:0;font-size:11px;line-height:1.5;color:#52525b;text-align:center;">
                Si no creaste esta cuenta, ignorá este correo.<br>
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

## 3. Reset password

**Subject:** `Restablecé tu contraseña — Fluya Studio`

Mismo layout que arriba; cambiar título a **"Restablecé tu contraseña"**, texto a
*"Recibimos un pedido para cambiar tu contraseña. Si fuiste vos, hacé clic abajo."*,
botón a **"Cambiar contraseña"**, y footer a *"Si no pediste esto, ignorá este correo
— tu contraseña sigue intacta."* El link sigue siendo `{{ .ConfirmationURL }}`.
```

---

## Notas

- Las variables (`{{ .ConfirmationURL }}`) las resuelve Supabase Auth — no tocar.
- El gradiente en texto (`-webkit-background-clip`) sólo se ve en algunos clientes;
  el fallback es el color sólido `#a855f7`. Por eso "Studio" en Confirm/Reset usa color
  sólido (más compatible) y en Invite usa el gradiente verde→púrpura.
- Probar el render en Gmail + Apple Mail antes de dar por cerrado (Paso 4 del setup SMTP).
