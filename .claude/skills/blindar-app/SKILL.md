---
name: blindar-app
description: |
  Aplica un baseline anti-scraping / anti-bot con herramientas FREE a cualquier
  app del Golden Path (Next.js App Router + Supabase + Vercel). Protege contra
  clonado/scraping automatizado y abuso de endpoints.

  Usar cuando: "blindar app", "blindar la app", "anti-scraping", "proteger del
  clonado", "anti-bot", "hardening de scraping", "proteger endpoints del abuso",
  "rate limiting", "captcha invisible", "security headers", "evitar que copien
  mi app".

  Complementario a /add-security (que hace auth/roles/2FA/audit). blindar-app se
  enfoca en perímetro: anti-bot, anti-scraping, edge.
  NO USAR para: roles/RLS/2FA (eso es /add-security), ni auth (eso es /add-login).
allowed-tools: Read, Write, Edit, Bash(npm *), Bash(npx *), Glob, Grep
user-invocable: true
---

# Blindar App — Baseline anti-scraping / anti-bot (free)

Sube la fricción contra clonado y scraping automatizado de cualquier app del
Golden Path, usando SOLO herramientas free. Protege datos y API; **no** promete
imposibilidad.

## ⚠️ Premisa honesta (decila al usuario al arrancar)

> El frontend público es **inherentemente copiable**. Este skill **sube la
> fricción** y protege **datos + API**, no garantiza que nadie pueda clonar la
> UI. Cualquiera puede hacer "ver código fuente" del HTML/CSS renderizado.
>
> Lo que SÍ logra: rate limiting que frena scrapers masivos, captcha que para
> bots, headers que bloquean embedding/MITM, API protegida, y monitoreo de
> abuso. Lo que NO hacemos (porque son trucos inútiles que molestan al usuario
> real y no frenan a un scraper serio): **bloquear clic derecho, ofuscación
> pesada de JS, texto-como-imagen, deshabilitar DevTools**.

## Diferencia con /add-security (no solapar)

| /add-security | /blindar-app (este) |
|---|---|
| Seguridad INTERNA: roles + RLS, 2FA/MFA, session mgmt, audit logs | Seguridad PERIMETRAL: anti-bot, anti-scraping, edge |
| Rate limiting de auth/endpoints sensibles (in-app) | Rate limiting DISTRIBUIDO edge (Upstash) contra scraping masivo |
| "Quién accede y con qué permisos" | "Frenar bots/scrapers antes de que lleguen" |

Si ya corrió `/add-security` y dejó un rate-limiter in-app, blindar-app lo
DETECTA y NO duplica — lo eleva a distribuido (Upstash) si hay env vars.

---

## Paso 0 — Detección de stack (abortar si no matchea)

Antes de tocar nada, verificá:

1. `package.json` con `next` (App Router) → buscá `app/` o `src/app/`. Si es
   Pages Router puro, avisá que el skill está afinado para App Router (los
   headers funcionan igual, el middleware cambia un poco).
2. Cliente Supabase (`@supabase/ssr` o `@supabase/supabase-js`). No es
   obligatorio pero ajusta la CSP (`connect-src` a `*.supabase.co`).
3. Si NO hay Next.js → **abortar**: "Este skill es para Next.js App Router.
   Stack detectado: {X}".

Reportá el stack detectado antes de seguir.

---

## Reglas del skill

- **Idempotente**: detectá lo ya aplicado (archivos, deps, headers) y NO
  dupliques. Si `lib/ratelimit.ts` ya existe, mostralo y preguntá si reemplazar.
- **Free-first**: nada de planes pagos. Cada integración externa
  (Upstash/Turnstile/Sentry) es **opcional y degradable** si faltan las env vars.
- **No rompas el form**: si Turnstile/Upstash no están configurados, el código
  debe seguir funcionando (modo degradado con warning en consola).
- **Delegá** la implementación pesada al agente `security-engineer` y el
  análisis de amenazas al `security-architect` si el proyecto es sensible.

---

## Las 6 capas (en orden de prioridad)

### Capa 1 — Rate limiting distribuido (Upstash, free)

**Deps**: `npm install @upstash/ratelimit @upstash/redis`
**Env**: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`

Crear `src/shared/lib/ratelimit.ts` (o `lib/ratelimit.ts` según convención del proyecto):

```typescript
// src/shared/lib/ratelimit.ts
// Rate limiter distribuido con Upstash + fallback in-memory degradado.
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const hasUpstash =
  !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;

// ── Fallback in-memory (degradado: solo sirve por-instancia, NO distribuido) ──
const memStore = new Map<string, { count: number; reset: number }>();
function memLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const entry = memStore.get(key);
  if (!entry || now > entry.reset) {
    memStore.set(key, { count: 1, reset: now + windowMs });
    return { success: true, remaining: limit - 1 };
  }
  entry.count++;
  return { success: entry.count <= limit, remaining: Math.max(0, limit - entry.count) };
}

const redis = hasUpstash ? Redis.fromEnv() : null;

function makeLimiter(tokens: number, window: `${number} s` | `${number} m`) {
  if (!redis) return null;
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(tokens, window),
    analytics: true,
  });
}

// General: 60 req/min. Sensible (login/registro/api): 5 req/min.
const generalLimiter = makeLimiter(60, '1 m');
const strictLimiter = makeLimiter(5, '1 m');

export async function checkRateLimit(
  ip: string,
  kind: 'general' | 'strict' = 'general',
): Promise<{ success: boolean; remaining: number }> {
  const tokens = kind === 'strict' ? 5 : 60;
  if (!hasUpstash) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[blindar-app] Upstash no configurado — rate limit in-memory (degradado).');
    }
    return memLimit(`${kind}:${ip}`, tokens, 60_000);
  }
  const limiter = kind === 'strict' ? strictLimiter! : generalLimiter!;
  const res = await limiter.limit(`${kind}:${ip}`);
  return { success: res.success, remaining: res.remaining };
}
```

Aplicar en `middleware.ts` (raíz del proyecto o `src/`):

```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/shared/lib/ratelimit';

const STRICT_PATHS = ['/login', '/registro', '/signup', '/api'];

function getClientIp(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for');
  return xff?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || '127.0.0.1';
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const ip = getClientIp(req);
  const isStrict = STRICT_PATHS.some((p) => pathname.startsWith(p));

  const { success } = await checkRateLimit(ip, isStrict ? 'strict' : 'general');
  if (!success) {
    return new NextResponse('Too Many Requests', {
      status: 429,
      headers: { 'Retry-After': '60' },
    });
  }
  return NextResponse.next();
}

// Excluir assets estáticos del rate limit
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|svg|ico)).*)'],
};
```

⚠️ Si el proyecto YA tiene `middleware.ts` (ej. de /add-login para auth), NO lo
pises: **integrá** el check de rate limit al inicio del middleware existente,
antes del auth gate.

### Capa 2 — CAPTCHA invisible (Cloudflare Turnstile, free ilimitado)

**Env**: `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`
Si faltan → el skill deja Turnstile **opt-in** (el form funciona sin él).

Widget en `/login` y `/registro` (client component):

```tsx
// src/shared/components/TurnstileWidget.tsx
'use client';
import Script from 'next/script';

export function TurnstileWidget() {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  if (!siteKey) return null; // opt-in: sin key, no renderiza
  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />
      <div className="cf-turnstile" data-sitekey={siteKey} data-theme="auto" />
    </>
  );
}
```

Verificación server-side en la Server Action:

```typescript
// src/shared/lib/verify-turnstile.ts
export async function verifyTurnstile(token: string | null): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true; // opt-in: sin secret, no bloquea (degradado)
  if (!token) return false;
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ secret, response: token }),
  });
  const data = (await res.json()) as { success: boolean };
  return data.success === true;
}
```

En la Server Action de login/registro: leer `cf-turnstile-response` del FormData,
llamar `verifyTurnstile(token)`, rechazar si `false`.

### Capa 3 — Security headers (código, free)

En `next.config.js` / `next.config.ts` — `async headers()`:

```javascript
// next.config.js — bloque headers (ajustá connect-src a tu Supabase URL)
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co https://challenges.cloudflare.com",
      "frame-src https://challenges.cloudflare.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

module.exports = {
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
  // ...resto de tu config existente
};
```

⚠️ **CSP es lo más delicado**: `script-src 'unsafe-inline' 'unsafe-eval'` es
permisivo (Next lo necesita en dev). Para producción endurecida, evaluá nonces
(es más trabajo). Si el proyecto carga otros dominios (analytics, fonts,
imágenes externas), agregalos a la directiva correspondiente o la CSP rompe la
página. Después de aplicar, ABRÍ la app y revisá la consola por errores CSP.

### Capa 4 — CORS estricto + protección de API / Server Actions

- Route handlers (`app/api/.../route.ts`): rechazar orígenes no propios.
  ```typescript
  const ALLOWED_ORIGIN = process.env.NEXT_PUBLIC_APP_URL ?? '';
  const origin = req.headers.get('origin');
  if (origin && origin !== ALLOWED_ORIGIN) {
    return new Response('Forbidden', { status: 403 });
  }
  ```
- **NUNCA** exponer `SUPABASE_SERVICE_ROLE_KEY` al cliente (solo en server).
- **RLS es la última línea**: verificá que TODAS las tablas tengan
  `ENABLE ROW LEVEL SECURITY` + policies. Si falta en alguna, alertá fuerte.
  Esto se cruza con /add-security — si ya corrió, asumí RLS ok pero verificá.

### Capa 5 — robots.txt + honeypot + cláusula ToS (código, free)

`app/robots.ts`:
```typescript
// app/robots.ts
import type { MetadataRoute } from 'next';
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/api/', '/admin/', '/leader/'] },
      // Bloquear scrapers de IA conocidos (opcional, ajustable):
      { userAgent: ['GPTBot', 'CCBot', 'ClaudeBot', 'Bytespider'], disallow: '/' },
    ],
    sitemap: `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/sitemap.xml`,
  };
}
```

**Honeypot** en formularios públicos (campo oculto que un humano no completa):
```tsx
{/* Campo honeypot — oculto para humanos, los bots lo completan */}
<input
  type="text"
  name="website"
  tabIndex={-1}
  autoComplete="off"
  className="absolute -left-[9999px] h-0 w-0 opacity-0"
  aria-hidden="true"
/>
```
En la Server Action: si `formData.get('website')` tiene valor → es bot, descartar
silenciosamente (return success falso sin procesar).

**Cláusula ToS**: insertar en la página de Términos un párrafo prohibiendo
scraping/reproducción automatizada (da base legal para actuar).

### Capa 6 — Monitoreo (Sentry, free tier) — opt-in

**Env**: `SENTRY_DSN` (si no está → skip).
`npm install @sentry/nextjs` + `npx @sentry/wizard@latest -i nextjs`.
Configurar alertas de tráfico/errores anómalos. Opcional — solo si el dev
quiere observabilidad de abuso.

---

## Resumen final (mostrá esto al terminar)

Al completar, generá un resumen:

```
🛡️ Blindaje aplicado a {proyecto}

Capas aplicadas:
  ✅ Rate limiting (lib/ratelimit.ts + middleware) — modo: {Upstash | in-memory degradado}
  ✅ Security headers (next.config.js)
  ✅ robots.txt + honeypot
  {✅/⏭️} Turnstile (login/registro) — {activo | opt-in, faltan env vars}
  {✅/⏭️} Sentry — {activo | skip}
  ✅ CORS + verificación RLS

⚠️ Env vars que el dev debe cargar (en Vercel + .env.local):
  - UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN  → crear cuenta free en upstash.com
  - NEXT_PUBLIC_TURNSTILE_SITE_KEY / TURNSTILE_SECRET_KEY → crear en dash.cloudflare.com/turnstile
  - SENTRY_DSN (opcional) → sentry.io

📋 Pasos manuales del dev:
  1. Crear cuenta Upstash (free) → copiar las 2 env vars de Redis REST
  2. Crear widget Turnstile (free) → copiar site key + secret
  3. Cargar las env vars en Vercel (Settings → Environment Variables) y en .env.local
  4. Revisar la página de Términos → confirmar cláusula anti-scraping
  5. npm run build + abrir la app → revisar consola por errores de CSP
  6. (opcional) Sentry wizard si querés observabilidad

🔎 Verificación post-aplicación:
  - Probar 70 requests rápidos a la home → debe dar 429 al pasar 60/min
  - Probar /login con muchos intentos → 429 a los 5/min
  - Revisar headers con: curl -I https://tu-app.com (ver CSP, HSTS, X-Frame-Options)
```

---

## Notas de arquitectura

- **Orden de ejecución recomendado**: `/add-login` → `/add-security` →
  `/blindar-app`. blindar-app asume que auth + RLS ya existen; si no, igual
  aplica las capas perimetrales y avisa lo que falta.
- **Idempotencia**: re-correr el skill no debe duplicar headers ni middleware.
  Detectá marcadores (`// blindar-app`) en los archivos generados.
- **Free-first es ley**: si una capa requiere pago, NO la apliques — dejala
  documentada como "upgrade futuro".

---

*Skill blindar-app v1.0 — estándar anti-scraping de SaaS Factory.*
*Complementa /add-security (interno) con protección perimetral (edge/anti-bot).*
