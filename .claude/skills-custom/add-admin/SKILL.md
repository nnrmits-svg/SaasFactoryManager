# Skill: add-admin

> Panel de administracion con metricas, gestion de usuarios y graficos.
> Acceso restringido por rol. KPIs, charts con Recharts, export PDF.
> Extraido de SuscriptionsMgmt (produccion).

## Cuando Usar

- "Necesito un panel admin"
- "Dashboard de metricas"
- "Gestion de usuarios"
- "Ver revenue, usuarios activos, KPIs"
- Cualquier feature que requiera vista administrativa

## Pre-requisitos

- `/add-login` ejecutado (auth + profiles con campo `role`)
- Supabase configurado con service role key
- `npm install recharts jspdf jspdf-autotable`

## Modelo de Datos

```sql
-- Agregar campo role a profiles (si no existe)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user'
  CHECK (role IN ('user', 'admin'));

-- Crear indice para queries admin
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- RLS: admins pueden ver todo
CREATE POLICY "admins_read_all" ON profiles
  FOR SELECT USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
    OR auth.uid() = id
  );
```

## Estructura Feature-First

```
src/features/admin/
├── types.ts
├── actions/
│   ├── metrics.ts           # KPIs y metricas generales
│   ├── users.ts             # CRUD de usuarios
│   └── finance-metrics.ts   # Revenue, churn, conversion
└── components/
    ├── admin-dashboard.tsx   # Container con tabs
    ├── admin-overview.tsx    # KPIs + charts
    ├── user-list.tsx         # Tabla de usuarios
    └── kpi-card.tsx          # Componente reutilizable
```

## Server Actions (Admin-Only)

```typescript
'use server';

// PATRON: Verificar rol admin en CADA action
async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') throw new Error('Sin permisos');
  return { supabase, user };
}

// Admin client (bypasses RLS)
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function getAdminMetrics() {
  await requireAdmin();
  const admin = getAdminClient();

  const [users, subscriptions] = await Promise.all([
    admin.from('profiles').select('id, created_at, plan', { count: 'exact' }),
    admin.from('subscriptions').select('amount, status').eq('status', 'active'),
  ]);

  const totalUsers = users.count ?? 0;
  const activeSubscriptions = subscriptions.data?.length ?? 0;
  const mrr = subscriptions.data?.reduce((sum, s) => sum + (s.amount ?? 0), 0) ?? 0;

  return { totalUsers, activeSubscriptions, mrr };
}
```

## KPI Cards

```typescript
interface KPICard {
  label: string;
  value: string | number;
  icon: string;     // Emoji o Lucide icon
  color: string;    // Tailwind color class
  change?: number;  // % cambio vs periodo anterior
}

// Ejemplo de KPIs comunes:
// - Total Usuarios (blue)
// - Suscripciones Activas (green)
// - MRR - Monthly Recurring Revenue (purple)
// - Tasa de Conversion (orange)
```

## Charts con Recharts

```typescript
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

// Revenue Trend (Area)
<ResponsiveContainer width="100%" height={300}>
  <AreaChart data={revenueHistory}>
    <XAxis dataKey="month" />
    <YAxis />
    <Tooltip />
    <Area type="monotone" dataKey="revenue" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.1} />
  </AreaChart>
</ResponsiveContainer>

// User Growth (Bar)
<ResponsiveContainer width="100%" height={300}>
  <BarChart data={userGrowth}>
    <XAxis dataKey="month" />
    <YAxis />
    <Bar dataKey="count" fill="#4AF2A1" radius={[4, 4, 0, 0]} />
  </BarChart>
</ResponsiveContainer>
```

## Export PDF

```typescript
import jsPDF from 'jspdf';
import 'jspdf-autotable';

function exportUsersPDF(users: User[]) {
  const doc = new jsPDF();
  doc.text('Reporte de Usuarios', 14, 15);
  doc.text(`Generado: ${new Date().toLocaleDateString()}`, 14, 22);

  (doc as any).autoTable({
    startY: 30,
    head: [['Nombre', 'Email', 'Plan', 'Registro']],
    body: users.map(u => [u.name, u.email, u.plan, u.createdAt]),
    headStyles: { fillColor: [139, 92, 246] }, // fluya-purple
  });

  doc.save('reporte_usuarios.pdf');
}
```

## Ruta Protegida

```typescript
// src/app/(main)/admin/page.tsx
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') redirect('/dashboard');

  return <AdminDashboard />;
}
```

## Ejecucion

1. Agregar campo `role` a profiles (migracion)
2. Instalar recharts + jspdf
3. Crear feature `admin/` con types, actions, components
4. Crear ruta protegida `/admin`
5. Implementar KPIs, charts, user management
6. Agregar link en navbar (solo visible para admins)
7. Verificar RLS y permisos

## Metricas Comunes

| Metrica | Query |
|---------|-------|
| MRR | `SUM(amount) WHERE status='active'` |
| Usuarios Totales | `COUNT(*) FROM profiles` |
| Nuevos este Mes | `COUNT(*) WHERE created_at >= month_start` |
| Conversion Rate | `paid_users / total_users * 100` |
| Churn Rate | `cancelled_last_month / active_start_month * 100` |
| ARPU | `mrr / active_users` |
