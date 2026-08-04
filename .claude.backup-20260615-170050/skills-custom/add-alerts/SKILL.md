# Skill: add-alerts

> Sistema de alertas basadas en tiempo con notificaciones por email.
> Detecta vencimientos, envia recordatorios, permite accion del usuario.
> Extraido de SuscriptionsMgmt (produccion).

## Cuando Usar

- "Necesito alertas de vencimiento"
- "Notificaciones antes de que expire algo"
- "Sistema de recordatorios por email"
- Cualquier feature que requiera alertas temporales con acciones

## Pre-requisitos

- `/add-login` ejecutado (auth + profiles)
- `/add-emails` ejecutado (Resend configurado) — o n8n/webhook para emails
- Una tabla principal que tenga un campo de fecha (expiration_date, due_date, etc.)

## Modelo de Datos

```sql
CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- FK a la tabla que genera la alerta (cambiar segun dominio)
  reference_id UUID NOT NULL,
  reference_type TEXT NOT NULL DEFAULT 'subscription', -- polimorfismo simple
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  alert_date DATE NOT NULL, -- cuando se debe disparar
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'dismissed', 'actioned')) DEFAULT 'pending',
  email_sent_count INTEGER DEFAULT 0,
  last_email_sent_at TIMESTAMPTZ,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_alerts" ON alerts
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_alerts_pending ON alerts(status, alert_date) WHERE status = 'pending';
CREATE INDEX idx_alerts_user ON alerts(user_id, is_read);
```

## Estructura Feature-First

```
src/features/alerts/
├── types.ts
├── actions.ts              # CRUD + procesamiento
└── components/
    ├── notification-bell.tsx  # Campanita con badge
    └── alert-list.tsx         # Lista de alertas
```

## Flujo de Alertas

```
Entidad creada (ej: suscripcion)
    |
    → Crear alerta: alert_date = expiration_date - 15 dias
    → Status: pending
    |
Cron diario (API route o Edge Function)
    |
    → Query: alerts WHERE status='pending' AND alert_date <= TODAY
    → Para cada alerta:
       - Enviar email
       - Incrementar email_sent_count
       - Actualizar status = 'sent'
    |
Usuario recibe email
    |
    ├── Click "Renovar" → status = 'actioned'
    └── Click "Ignorar" → status = 'dismissed'
```

## Server Actions

```typescript
'use server';

const DAYS_BEFORE = 15; // dias antes del vencimiento

export async function createAlert(referenceId: string, referenceType: string, userId: string, triggerDate: string) {
  const supabase = await createClient();
  const alertDate = new Date(triggerDate);
  alertDate.setDate(alertDate.getDate() - DAYS_BEFORE);

  await supabase.from('alerts').insert({
    reference_id: referenceId,
    reference_type: referenceType,
    user_id: userId,
    alert_date: alertDate.toISOString().split('T')[0],
  });
}

export async function getUnreadAlerts() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from('alerts')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_read', false)
    .order('created_at', { ascending: false })
    .limit(10);

  return data ?? [];
}

export async function markAsRead(alertId: string) {
  const supabase = await createClient();
  await supabase.from('alerts').update({ is_read: true }).eq('id', alertId);
  revalidatePath('/dashboard');
}

export async function processPendingAlerts() {
  // Usar service role key para acceder a todas las alertas
  const today = new Date().toISOString().split('T')[0];
  const { data: pending } = await supabase
    .from('alerts')
    .select('*, profiles!inner(email, full_name)')
    .eq('status', 'pending')
    .lte('alert_date', today);

  for (const alert of pending ?? []) {
    // Enviar email via Resend o webhook
    // Actualizar status y contadores
  }
}
```

## Notification Bell Component

```typescript
// Campanita que muestra count de alertas no leidas
// Polling cada 60s
// Dropdown con lista de alertas recientes
// Click marca como leida
```

## API Route para Cron

```typescript
// src/app/api/cron/alerts/route.ts
export async function GET(request: Request) {
  // Verificar auth header (cron secret)
  const result = await processPendingAlerts();
  return NextResponse.json(result);
}
```

## Ejecucion

1. Crear tabla `alerts` con migracion
2. Crear types y actions
3. Crear NotificationBell component
4. Integrar creacion de alertas donde se necesite (ej: al crear suscripcion)
5. Crear API route para procesamiento cron
6. Configurar cron en Vercel (vercel.json) o Edge Function

## Adaptabilidad

- Cambiar `reference_type` segun dominio (invoice, contract, task, etc.)
- Ajustar `DAYS_BEFORE` segun necesidad (15, 7, 30 dias)
- Email template customizable por tipo de alerta
- Se puede extender con canales adicionales (push, SMS, Telegram)
