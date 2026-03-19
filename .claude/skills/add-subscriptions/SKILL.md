# Skill: add-subscriptions

> CRUD completo de suscripciones con status tracking, filtros avanzados y formularios complejos.
> Extraido de SuscriptionsMgmt (produccion).

## Cuando Usar

- "Necesito gestionar suscripciones"
- "CRUD de [entidad] con estados y filtros"
- "Sistema de tracking con vencimientos"
- Cualquier entidad con ciclo de vida (active → expired → renewed)

## Pre-requisitos

- `/add-login` ejecutado (necesita auth + profiles)
- Supabase configurado

## Modelo de Datos

```sql
-- Tabla principal
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  plan_type TEXT NOT NULL DEFAULT 'basic',
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  status TEXT NOT NULL CHECK (status IN ('active', 'expired', 'cancelled', 'pending_renewal')) DEFAULT 'active',
  billing_period TEXT CHECK (billing_period IN ('monthly', 'quarterly', 'annual')) DEFAULT 'monthly',
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiration_date DATE NOT NULL,
  auto_renew BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: usuarios solo ven sus propias suscripciones
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_subscriptions" ON subscriptions
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Indice para queries frecuentes
CREATE INDEX idx_subs_user_status ON subscriptions(user_id, status);
CREATE INDEX idx_subs_expiration ON subscriptions(expiration_date);
```

## Estructura Feature-First

```
src/features/subscriptions/
├── types.ts                      # Interfaces
├── actions.ts                    # Server actions CRUD
└── components/
    ├── subscription-form.tsx     # Crear/editar
    ├── subscription-list.tsx     # Lista con filtros
    └── subscription-filters.tsx  # Componente de filtros
```

## Server Actions Pattern

```typescript
'use server';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function getSubscriptions() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .order('expiration_date', { ascending: true });

  return data ?? [];
}

export async function createSubscription(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autenticado' };

  const { error } = await supabase.from('subscriptions').insert({
    user_id: user.id,
    name: formData.get('name') as string,
    plan_type: formData.get('planType') as string,
    amount: Number(formData.get('amount')),
    billing_period: formData.get('billingPeriod') as string,
    expiration_date: formData.get('expirationDate') as string,
    auto_renew: formData.get('autoRenew') === 'true',
  });

  if (error) return { error: error.message };
  revalidatePath('/dashboard');
  return { success: true };
}

export async function updateSubscription(id: string, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('subscriptions')
    .update({
      name: formData.get('name') as string,
      amount: Number(formData.get('amount')),
      status: formData.get('status') as string,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) return { error: error.message };
  revalidatePath('/dashboard');
  return { success: true };
}

export async function deleteSubscription(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('subscriptions').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/dashboard');
  return { success: true };
}
```

## UI Patterns

### Status Badge con Color
```typescript
const STATUS_STYLES = {
  active: 'bg-green-500/10 text-green-400 border-green-500/30',
  expired: 'bg-red-500/10 text-red-400 border-red-500/30',
  cancelled: 'bg-gray-500/10 text-gray-400 border-gray-500/30',
  pending_renewal: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
};
```

### Expiration Countdown
```typescript
function getDaysUntil(dateStr: string): number {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}
// Color: red (<0), orange (0-15), green (>15)
```

### Filtros Multi-Select
- Status: active, expired, cancelled, pending_renewal, expiring_soon
- Billing period: monthly, quarterly, annual
- Date range: por mes/ano

## Ejecucion

1. Crear tabla con migracion Supabase
2. Crear `src/features/subscriptions/types.ts`
3. Crear `src/features/subscriptions/actions.ts`
4. Crear componentes (form, list, filters)
5. Crear ruta `/subscriptions` o integrar en dashboard
6. Verificar RLS funciona correctamente

## Adaptabilidad

Este patron se adapta a cualquier entidad con ciclo de vida:
- Suscripciones → Contratos → Licencias → Membresías
- Cambiar `subscriptions` por el nombre de la entidad
- Ajustar estados segun el dominio
