---
name: genera-tests
description: "Skill que genera suite completa de tests automáticos para un proyecto: Vitest (unit + integration), Playwright (e2e), con casos típicos de auth, payments, emails, dashboard. Toma como input el PRD + código existente y arma tests que validan flows críticos. Activar cuando el usuario dice: armá tests, genera la suite, hacé QA automático, agregá testing al proyecto."
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

# Genera Tests — Suite automática Vitest + Playwright

> Proyecto: $ARGUMENTS (opcional)

Sos el especialista en **crear una suite de tests de baseline** para un proyecto SaaS. Tu objetivo: que el proyecto pase de "0 tests" a "tests que cubren los flows críticos" en una sola sesión.

## Stack de testing del Golden Path

| Tipo | Tool | Cuándo |
|---|---|---|
| **Unit + Integration** | Vitest | Lógica de utilidades, validaciones, Server Actions |
| **Component** | Vitest + React Testing Library | Componentes con interactividad |
| **E2E** | Playwright | Flows completos del usuario en browser |
| **Visual regression** (opcional) | Playwright snapshots | UI components estables |
| **API contract** (opcional) | Vitest con MSW | Mock de servicios externos |

---

## Pre-requisitos

- Proyecto SaaS Factory con `package.json`
- Idealmente con `outputs/06-prd.md` (para saber qué features cubrir)
- Idealmente con `bitacora.md` + `project_plan.md`

## Proceso

### Paso 1: Detectar estado actual

```bash
# Verificar si hay tests actuales
ls -la __tests__/ tests/ src/**/*.test.* src/**/*.spec.* 2>/dev/null

# Detectar tools instalados
grep -E "(vitest|playwright|@testing-library)" package.json
```

Output al dev:
```
📊 Estado actual de testing:

- Vitest: {instalado/no instalado}
- Playwright: {instalado/no instalado}
- Tests existentes: {N archivos}
- Coverage actual: {%}

{Si está vacío:}
Voy a inicializar la suite desde cero.

{Si hay tests:}
Voy a complementar lo existente sin sobrescribir.
```

### Paso 2: Inicializar Vitest (si no está)

#### A. Instalar deps

```bash
npm install -D vitest @vitest/coverage-v8 @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

#### B. Configurar `vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
      },
      exclude: ['node_modules', '.next', 'tests', '**/*.config.*'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

#### C. Crear `tests/setup.ts`

```typescript
import '@testing-library/jest-dom';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}));

// Mock environment vars
vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://localhost:54321');
vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-key');
```

#### D. Agregar scripts a `package.json`

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:ui": "vitest --ui"
  }
}
```

### Paso 3: Generar tests Vitest según features detectadas

Leer el PRD (si existe) y detectar features. Para cada feature, generar test file.

#### Tests típicos por feature

##### Auth (login + signup + logout)

```typescript
// tests/auth/login.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginForm from '@/components/auth/LoginForm';

describe('LoginForm', () => {
  it('renders email and password fields', () => {
    render(<LoginForm />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('shows error on invalid email', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);
    await user.type(screen.getByLabelText(/email/i), 'not-an-email');
    await user.click(screen.getByRole('button', { name: /login/i }));
    expect(await screen.findByText(/invalid email/i)).toBeInTheDocument();
  });

  it('calls signIn with credentials on submit', async () => {
    const mockSignIn = vi.fn();
    const user = userEvent.setup();
    render(<LoginForm onSubmit={mockSignIn} />);
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /login/i }));
    expect(mockSignIn).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    });
  });
});
```

##### Server Actions (validación Zod)

```typescript
// tests/actions/create-user.test.ts
import { describe, it, expect } from 'vitest';
import { createUserSchema } from '@/lib/schemas/user';

describe('createUserSchema', () => {
  it('accepts valid input', () => {
    const result = createUserSchema.safeParse({
      name: 'Juan Pérez',
      email: 'juan@example.com',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = createUserSchema.safeParse({
      name: 'Juan',
      email: 'not-an-email',
    });
    expect(result.success).toBe(false);
  });

  it('rejects name too short', () => {
    const result = createUserSchema.safeParse({
      name: 'J',
      email: 'juan@example.com',
    });
    expect(result.success).toBe(false);
  });
});
```

##### Webhooks (signature validation)

```typescript
// tests/api/webhooks/polar.test.ts
import { describe, it, expect } from 'vitest';
import { POST } from '@/app/api/webhooks/polar/route';
import crypto from 'crypto';

describe('POST /api/webhooks/polar', () => {
  const secret = 'test-secret';

  it('returns 401 with invalid signature', async () => {
    const body = JSON.stringify({ type: 'subscription.created' });
    const request = new Request('http://localhost/api/webhooks/polar', {
      method: 'POST',
      body,
      headers: { 'x-webhook-signature': 'invalid' },
    });
    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it('processes valid webhook', async () => {
    const body = JSON.stringify({ type: 'subscription.created', data: { id: '123' } });
    const signature = crypto.createHmac('sha256', secret).update(body).digest('hex');
    const request = new Request('http://localhost/api/webhooks/polar', {
      method: 'POST',
      body,
      headers: { 'x-webhook-signature': signature },
    });
    const response = await POST(request);
    expect(response.status).toBe(200);
  });
});
```

##### Componentes con Fluya Brand

```typescript
// tests/components/FluyaButton.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import FluyaButton from '@/components/FluyaButton';

describe('FluyaButton', () => {
  it('has minimum 44px height (accessibility)', () => {
    render(<FluyaButton>Click</FluyaButton>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass(/min-h-\[44px\]/);
  });

  it('shows focus ring on focus', async () => {
    render(<FluyaButton>Click</FluyaButton>);
    const button = screen.getByRole('button');
    button.focus();
    expect(button).toHaveClass(/focus-visible:ring/);
  });

  it('is disabled when disabled prop is true', () => {
    render(<FluyaButton disabled>Click</FluyaButton>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

### Paso 4: Inicializar Playwright (e2e)

#### A. Instalar

```bash
npm install -D @playwright/test
npx playwright install chromium
```

#### B. Configurar `playwright.config.ts`

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 5'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

#### C. Generar e2e tests críticos

##### Signup → confirm email → login

```typescript
// tests/e2e/signup-flow.spec.ts
import { test, expect } from '@playwright/test';

test('user can signup, confirm, and login', async ({ page }) => {
  const email = `test+${Date.now()}@example.com`;
  const password = 'TestPass123!';

  // Signup
  await page.goto('/signup');
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /sign up/i }).click();

  // Should redirect to confirm page
  await expect(page).toHaveURL(/\/confirm/);
  await expect(page.getByText(/check your email/i)).toBeVisible();

  // Simulate email confirmation (in test, hit confirm URL directly)
  // ...

  // Login
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /log in/i }).click();

  // Should land on dashboard
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByText(/welcome/i)).toBeVisible();
});
```

##### Payment flow (Polar)

```typescript
// tests/e2e/payment-flow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Payment flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login con user de test
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(process.env.TEST_USER_EMAIL!);
    await page.getByLabel(/password/i).fill(process.env.TEST_USER_PASSWORD!);
    await page.getByRole('button', { name: /log in/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('shows pricing page with plans', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page.getByText(/free/i)).toBeVisible();
    await expect(page.getByText(/pro/i)).toBeVisible();
  });

  test('clicking subscribe redirects to Polar checkout', async ({ page }) => {
    await page.goto('/pricing');
    await page.getByRole('button', { name: /subscribe to pro/i }).click();
    await page.waitForURL(/polar\.sh/);
    expect(page.url()).toContain('polar.sh');
  });
});
```

##### Dashboard básico

```typescript
// tests/e2e/dashboard.spec.ts
import { test, expect } from '@playwright/test';

test('dashboard shows user data after login', async ({ page }) => {
  // ... login
  await page.goto('/dashboard');

  await expect(page.locator('h1')).toContainText(/dashboard/i);
  await expect(page.getByTestId('user-greeting')).toBeVisible();
});

test('dashboard is keyboard navigable', async ({ page }) => {
  await page.goto('/dashboard');

  // Tab through interactive elements
  await page.keyboard.press('Tab');
  let focused = await page.evaluate(() => document.activeElement?.tagName);
  expect(focused).toBeTruthy();

  // Skip link should be visible on focus
  const skipLink = page.getByRole('link', { name: /skip to/i });
  await skipLink.focus();
  await expect(skipLink).toBeVisible();
});
```

### Paso 5: Configurar CI

Generar `.github/workflows/test.yml`:

```yaml
name: Tests

on:
  pull_request:
  push:
    branches: [main]

jobs:
  unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '24'
          cache: 'npm'
      - run: npm ci
      - run: npm test
      - run: npm run test:coverage

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '24'
          cache: 'npm'
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e
        env:
          E2E_BASE_URL: http://localhost:3000
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

### Paso 6: Validar suite generada

```bash
# Vitest debe pasar
npm test

# Playwright debe pasar (con app corriendo)
npm run test:e2e
```

Si fallan: investigar y arreglar antes de declarar completo.

### Paso 7: Cierre + bitácora

```markdown
## {fecha} — Suite de tests inicializada

- Vitest: configurado + setup + scripts
- Playwright: configurado + 3 specs base (signup, payment, dashboard)
- Coverage target: 70% lines/functions/branches
- CI: .github/workflows/test.yml

Tests generados ({N}):
- tests/auth/login.test.tsx
- tests/actions/create-user.test.ts
- tests/api/webhooks/polar.test.ts
- tests/components/FluyaButton.test.tsx
- tests/e2e/signup-flow.spec.ts
- tests/e2e/payment-flow.spec.ts
- tests/e2e/dashboard.spec.ts

Próximos pasos:
- Correr `npm test` antes de cada commit
- Agregar tests para cada feature nueva (no se autoricen PRs sin tests)
- Cuando coverage caiga <70%, agregar tests faltantes
```

Output al dev:

```
✅ Suite de tests inicializada.

Generados:
- {N} unit tests con Vitest
- {M} e2e tests con Playwright
- CI configurado para correr en cada PR

Correr ahora:
  npm test           # unit + integration
  npm run test:e2e   # end-to-end
  npm run test:coverage  # con coverage report

Si hay tests que fallan → revisar el output y arreglar lógica/assertions.
Si están todos verdes → commitear:
  git add . && git commit -m "test: inicializar suite Vitest + Playwright"
```

---

## Reglas

- SIEMPRE detectar estado actual antes de inicializar (no sobrescribir)
- SIEMPRE generar tests realistas (basados en el código y PRD, no genéricos)
- SIEMPRE asegurar que la suite generada pasa (no entregar tests rotos)
- SIEMPRE actualizar bitácora con lo que se generó
- NUNCA forzar 100% coverage (70% es razonable, más es decoración)
- NUNCA borrar tests existentes (complementar)

## Anti-patrones

- NO tests que solo verifican "el componente renderiza" sin assertion real
- NO mocks demasiado profundos (mock solo APIs externas, no helpers internos)
- NO snapshots de UI sin propósito (rotan en cada PR sin valor)
- NO e2e tests dependientes de timing/sleep (usar `waitFor`)
- NO compartir state entre tests (cada test independiente)

## Ejemplo de invocación

```bash
cd ~/ProyectosIA/AplicacionesSaas/gestion-arca
claude
/genera-tests
```

Resultado esperado: suite inicializada con 10-20 tests + CI configurado en ~30 minutos.

---

*Skill v1.0 — Inicializa suite de tests del Golden Path. Iterar cuando Vitest o Playwright tengan APIs nuevas.*
