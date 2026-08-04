---
name: add-security
description: "Inyectar seguridad enterprise en 4 capas: roles+RLS, 2FA/MFA, session management, rate limiting + audit logs. Ejecutar DESPUES de /add-login. Activar cuando el usuario dice: seguridad, roles, permisos, 2FA, MFA, audit log, rate limit, proteger, acceso por roles, seguridad enterprise, hardening, compliance."
allowed-tools: Read, Write, Edit, Bash, Grep, Glob
user-invocable: true
---

# Add Security: 4 Capas de Seguridad Enterprise

Inyecta un sistema de seguridad completo ENCIMA de `/add-login`.
Cada capa es independiente - el usuario puede elegir cuales activar.

**Pre-requisito**: `/add-login` debe estar ejecutado (necesita auth + profiles en Supabase).

---

## Deteccion Inicial

Antes de empezar, verifica el estado actual:

```bash
# 1. Verificar que auth existe
grep -r "createClient" src/lib/supabase/ 2>/dev/null
# 2. Verificar tabla profiles
# Usar Supabase MCP: list_tables
# 3. Verificar si ya hay roles implementados
grep -r "role" src/ --include="*.ts" --include="*.tsx" -l 2>/dev/null
```

Si `/add-login` no fue ejecutado, informar:
> Necesitas ejecutar `/add-login` primero. La seguridad se construye encima de la autenticacion.

---

## Pregunta al Usuario

Antes de implementar, pregunta:

```
Que capas de seguridad necesitas?

1. Roles y Permisos (admin/editor/viewer + RLS por rol)
2. 2FA/MFA (autenticacion de dos factores con TOTP)
3. Session Management (expiracion, device tracking, sesiones activas)
4. Rate Limiting + Audit Logs (proteccion contra abuso + registro de acciones)

Opciones:
a) Todas (recomendado para enterprise/B2B)
b) Solo roles + audit logs (minimo viable)
c) Dejame elegir cuales
```

---

## CAPA 1: Roles y Permisos

### 1.1 Migracion de BD

Usar Supabase MCP `apply_migration`:

```sql
-- Crear enum de roles
CREATE TYPE user_role AS ENUM ('admin', 'editor', 'viewer');

-- Agregar columna role a profiles (si no existe)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS role user_role DEFAULT 'viewer';

-- Crear tabla de permisos por rol
CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  role user_role NOT NULL,
  resource TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('create', 'read', 'update', 'delete', 'manage')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(role, resource, action)
);

-- Insertar permisos default
INSERT INTO role_permissions (role, resource, action) VALUES
  -- Admin: acceso total
  ('admin', '*', 'manage'),
  -- Editor: CRUD
  ('editor', '*', 'create'),
  ('editor', '*', 'read'),
  ('editor', '*', 'update'),
  -- Viewer: solo lectura
  ('viewer', '*', 'read')
ON CONFLICT (role, resource, action) DO NOTHING;

-- RLS para profiles basado en roles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Los usuarios pueden ver su propio perfil
CREATE POLICY "users_read_own_profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Los usuarios pueden actualizar su propio perfil (excepto role)
CREATE POLICY "users_update_own_profile" ON profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND (role IS NOT DISTINCT FROM (SELECT role FROM profiles WHERE id = auth.uid()))
  );

-- Admins pueden ver todos los perfiles
CREATE POLICY "admins_read_all_profiles" ON profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Admins pueden actualizar cualquier perfil (incluyendo roles)
CREATE POLICY "admins_update_all_profiles" ON profiles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
```

### 1.2 Helper de Permisos

Crear `src/features/auth/services/permissions.ts`:

```typescript
import { createClient } from '@/lib/supabase/server'

export type UserRole = 'admin' | 'editor' | 'viewer'
export type Action = 'create' | 'read' | 'update' | 'delete' | 'manage'

export async function getCurrentUserRole(): Promise<UserRole | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  return profile?.role as UserRole ?? 'viewer'
}

export async function hasPermission(
  resource: string,
  action: Action
): Promise<boolean> {
  const role = await getCurrentUserRole()
  if (!role) return false
  if (role === 'admin') return true

  const supabase = await createClient()
  const { data } = await supabase
    .from('role_permissions')
    .select('id')
    .or(`resource.eq.${resource},resource.eq.*`)
    .or(`action.eq.${action},action.eq.manage`)
    .eq('role', role)
    .limit(1)

  return (data?.length ?? 0) > 0
}

export async function requireRole(
  allowedRoles: UserRole[]
): Promise<void> {
  const role = await getCurrentUserRole()
  if (!role || !allowedRoles.includes(role)) {
    throw new Error('Insufficient permissions')
  }
}
```

### 1.3 Componente de Proteccion

Crear `src/features/auth/components/role-guard.tsx`:

```tsx
import { getCurrentUserRole, type UserRole } from '../services/permissions'

interface Props {
  allowedRoles: UserRole[]
  children: React.ReactNode
  fallback?: React.ReactNode
}

export async function RoleGuard({ allowedRoles, children, fallback }: Props) {
  const role = await getCurrentUserRole()

  if (!role || !allowedRoles.includes(role)) {
    return fallback ?? (
      <div className="flex items-center justify-center min-h-[200px]">
        <p className="text-white/40">No tienes permisos para ver esto.</p>
      </div>
    )
  }

  return <>{children}</>
}
```

### 1.4 Uso en Paginas

```tsx
// En cualquier page.tsx que necesite proteccion por rol:
import { RoleGuard } from '@/features/auth/components/role-guard'

export default function AdminPage() {
  return (
    <RoleGuard allowedRoles={['admin']}>
      <h1>Panel de Admin</h1>
      {/* contenido protegido */}
    </RoleGuard>
  )
}
```

### 1.5 RLS Generico para Tablas del Proyecto

Para CADA tabla que cree el proyecto, aplicar este patron:

```sql
-- Template RLS por roles (reemplazar [TABLE] con el nombre real)
ALTER TABLE [TABLE] ENABLE ROW LEVEL SECURITY;

-- Viewers: solo lectura
CREATE POLICY "[TABLE]_viewer_read" ON [TABLE]
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid())
  );

-- Editors: CRUD propio
CREATE POLICY "[TABLE]_editor_crud" ON [TABLE]
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('editor', 'admin'))
  );

-- Admins: acceso total (ya cubierto por editor_crud con IN)
```

---

## CAPA 2: 2FA / MFA con TOTP

### 2.1 Habilitar MFA en Supabase

Usar Supabase MCP `execute_sql`:

```sql
-- Verificar que MFA esta habilitado en el proyecto
-- Nota: MFA se habilita desde el dashboard de Supabase > Authentication > MFA
-- Supabase soporta TOTP (Time-based One-Time Password) nativamente
```

**IMPORTANTE**: Informar al usuario que debe habilitar MFA en el dashboard de Supabase:
> Settings > Authentication > Multi Factor Authentication > Enable TOTP

### 2.2 Flujo de Enrollment

Crear `src/features/auth/components/mfa-setup.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function MfaSetup() {
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [verifyCode, setVerifyCode] = useState('')
  const [factorId, setFactorId] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'enrolling' | 'verifying' | 'done'>('idle')

  async function startEnrollment() {
    const supabase = createClient()
    setStatus('enrolling')

    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'Authenticator App'
    })

    if (error) {
      setStatus('idle')
      return
    }

    setQrCode(data.totp.qr_code)
    setFactorId(data.id)
  }

  async function verifySetup() {
    if (!factorId) return
    const supabase = createClient()
    setStatus('verifying')

    const { data: challenge } = await supabase.auth.mfa.challenge({ factorId })
    if (!challenge) return

    const { error } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code: verifyCode
    })

    if (error) {
      setStatus('enrolling')
      return
    }

    setStatus('done')
  }

  if (status === 'done') {
    return <p className="text-green-400">2FA activado correctamente.</p>
  }

  return (
    <div className="space-y-4">
      {status === 'idle' && (
        <button
          onClick={startEnrollment}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white transition-colors"
        >
          Activar 2FA
        </button>
      )}

      {qrCode && status === 'enrolling' && (
        <div className="space-y-4">
          <p className="text-white/60 text-sm">
            Escaneá este código QR con tu app de autenticación (Google Authenticator, Authy, etc.)
          </p>
          <img src={qrCode} alt="QR Code para 2FA" className="w-48 h-48 rounded-lg" />
          <div className="flex gap-2">
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="Código de 6 dígitos"
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
              className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white w-40"
            />
            <button
              onClick={verifySetup}
              disabled={verifyCode.length !== 6}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white disabled:opacity-50 transition-colors"
            >
              Verificar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
```

### 2.3 Flujo de Login con MFA

Crear `src/features/auth/components/mfa-verify.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export function MfaVerify() {
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleVerify() {
    const supabase = createClient()
    setError(null)

    const { data: factors } = await supabase.auth.mfa.listFactors()
    const totpFactor = factors?.totp?.[0]
    if (!totpFactor) return

    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId: totpFactor.id
    })

    if (challengeError || !challenge) {
      setError('Error al crear challenge')
      return
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: totpFactor.id,
      challengeId: challenge.id,
      code
    })

    if (verifyError) {
      setError('Código incorrecto')
      return
    }

    router.push('/dashboard')
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-white">Verificación 2FA</h2>
      <p className="text-white/60 text-sm">
        Ingresá el código de tu app de autenticación
      </p>
      <input
        type="text"
        inputMode="numeric"
        maxLength={6}
        placeholder="000000"
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
        className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-center text-2xl tracking-[0.5em] w-full"
        autoFocus
      />
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <button
        onClick={handleVerify}
        disabled={code.length !== 6}
        className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white disabled:opacity-50 transition-colors"
      >
        Verificar
      </button>
    </div>
  )
}
```

### 2.4 Helper para Verificar MFA

```typescript
// En src/features/auth/services/mfa.ts
import { createClient } from '@/lib/supabase/server'

export async function requireMfa(): Promise<boolean> {
  const supabase = await createClient()
  const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()

  if (!data) return false

  // Si el usuario tiene MFA configurado pero no verificado en esta sesion
  if (data.nextLevel === 'aal2' && data.currentLevel === 'aal1') {
    return false // Redirigir a verificacion MFA
  }

  return true
}

export async function hasMfaEnabled(): Promise<boolean> {
  const supabase = await createClient()
  const { data } = await supabase.auth.mfa.listFactors()
  return (data?.totp?.length ?? 0) > 0
}
```

---

## CAPA 3: Session Management

### 3.1 Tabla de Sesiones Activas

Usar Supabase MCP `apply_migration`:

```sql
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  device_info JSONB DEFAULT '{}'::jsonb,
  ip_address INET,
  user_agent TEXT,
  last_active_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '30 days'),
  is_current BOOLEAN DEFAULT false
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);

-- RLS
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_sessions" ON user_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users_delete_own_sessions" ON user_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- Funcion para limpiar sesiones expiradas (ejecutar con pg_cron si disponible)
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM user_sessions WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 3.2 Middleware de Session Tracking

Crear `src/features/auth/services/session-tracker.ts`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'

export async function trackSession() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const headersList = await headers()
  const userAgent = headersList.get('user-agent') ?? 'unknown'
  const ip = headersList.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'

  // Upsert sesion actual
  await supabase.from('user_sessions').upsert(
    {
      user_id: user.id,
      user_agent: userAgent,
      ip_address: ip,
      last_active_at: new Date().toISOString(),
      is_current: true,
      device_info: {
        browser: parseBrowser(userAgent),
        os: parseOS(userAgent)
      }
    },
    { onConflict: 'user_id,user_agent' }
  )
}

function parseBrowser(ua: string): string {
  if (ua.includes('Chrome')) return 'Chrome'
  if (ua.includes('Firefox')) return 'Firefox'
  if (ua.includes('Safari')) return 'Safari'
  if (ua.includes('Edge')) return 'Edge'
  return 'Other'
}

function parseOS(ua: string): string {
  if (ua.includes('Windows')) return 'Windows'
  if (ua.includes('Mac')) return 'macOS'
  if (ua.includes('Linux')) return 'Linux'
  if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS'
  if (ua.includes('Android')) return 'Android'
  return 'Other'
}
```

### 3.3 Componente de Sesiones Activas

Crear `src/features/auth/components/active-sessions.tsx`:

```tsx
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Session {
  id: string
  device_info: { browser: string; os: string }
  ip_address: string
  last_active_at: string
  is_current: boolean
}

export function ActiveSessions() {
  const [sessions, setSessions] = useState<Session[]>([])

  useEffect(() => {
    loadSessions()
  }, [])

  async function loadSessions() {
    const supabase = createClient()
    const { data } = await supabase
      .from('user_sessions')
      .select('*')
      .order('last_active_at', { ascending: false })

    setSessions(data ?? [])
  }

  async function revokeSession(sessionId: string) {
    const supabase = createClient()
    await supabase.from('user_sessions').delete().eq('id', sessionId)
    loadSessions()
  }

  async function revokeAllOthers() {
    const supabase = createClient()
    await supabase
      .from('user_sessions')
      .delete()
      .eq('is_current', false)
    loadSessions()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Sesiones Activas</h3>
        {sessions.length > 1 && (
          <button
            onClick={revokeAllOthers}
            className="text-sm text-red-400 hover:text-red-300 transition-colors"
          >
            Cerrar todas las demás
          </button>
        )}
      </div>
      {sessions.map((session) => (
        <div
          key={session.id}
          className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10"
        >
          <div>
            <p className="text-white text-sm">
              {session.device_info.browser} en {session.device_info.os}
              {session.is_current && (
                <span className="ml-2 text-xs text-green-400">(actual)</span>
              )}
            </p>
            <p className="text-white/40 text-xs">
              {session.ip_address} · {new Date(session.last_active_at).toLocaleString()}
            </p>
          </div>
          {!session.is_current && (
            <button
              onClick={() => revokeSession(session.id)}
              className="text-sm text-red-400 hover:text-red-300 transition-colors"
            >
              Revocar
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
```

---

## CAPA 4: Rate Limiting + Audit Logs

### 4.1 Tabla de Audit Logs

Usar Supabase MCP `apply_migration`:

```sql
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  resource_id TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indices para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource, resource_id);

-- RLS: solo admins pueden leer audit logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_read_audit_logs" ON audit_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Insertar logs: cualquier usuario autenticado (via service role en server actions)
CREATE POLICY "system_insert_audit_logs" ON audit_logs
  FOR INSERT WITH CHECK (true);
```

### 4.2 Tabla de Rate Limiting

```sql
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  identifier TEXT NOT NULL,
  action TEXT NOT NULL,
  count INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup
  ON rate_limits(identifier, action, window_start);

-- Funcion para verificar rate limit
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_identifier TEXT,
  p_action TEXT,
  p_max_requests INTEGER DEFAULT 100,
  p_window_minutes INTEGER DEFAULT 15
)
RETURNS BOOLEAN AS $$
DECLARE
  v_count INTEGER;
  v_window_start TIMESTAMPTZ;
BEGIN
  v_window_start := now() - (p_window_minutes || ' minutes')::INTERVAL;

  SELECT COALESCE(SUM(count), 0) INTO v_count
  FROM rate_limits
  WHERE identifier = p_identifier
    AND action = p_action
    AND window_start >= v_window_start;

  IF v_count >= p_max_requests THEN
    RETURN FALSE;
  END IF;

  INSERT INTO rate_limits (identifier, action, count, window_start)
  VALUES (p_identifier, p_action, 1, now());

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Limpieza periodica
CREATE OR REPLACE FUNCTION cleanup_rate_limits()
RETURNS void AS $$
BEGIN
  DELETE FROM rate_limits WHERE window_start < now() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 4.3 Service de Audit Log

Crear `src/features/auth/services/audit.ts`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'

interface AuditEntry {
  action: string
  resource: string
  resourceId?: string
  details?: Record<string, unknown>
}

export async function logAudit({ action, resource, resourceId, details }: AuditEntry) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const headersList = await headers()

  await supabase.from('audit_logs').insert({
    user_id: user?.id ?? null,
    action,
    resource,
    resource_id: resourceId,
    details: details ?? {},
    ip_address: headersList.get('x-forwarded-for')?.split(',')[0],
    user_agent: headersList.get('user-agent')
  })
}

// Uso en server actions:
// await logAudit({ action: 'create', resource: 'project', resourceId: project.id })
// await logAudit({ action: 'login', resource: 'auth', details: { method: 'email' } })
// await logAudit({ action: 'delete', resource: 'user', resourceId: userId })
```

### 4.4 Service de Rate Limiting

Crear `src/features/auth/services/rate-limit.ts`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'

interface RateLimitConfig {
  action: string
  maxRequests?: number
  windowMinutes?: number
}

export async function checkRateLimit({
  action,
  maxRequests = 100,
  windowMinutes = 15
}: RateLimitConfig): Promise<boolean> {
  const supabase = await createClient()
  const headersList = await headers()

  // Identificar por IP o user_id
  const { data: { user } } = await supabase.auth.getUser()
  const ip = headersList.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'
  const identifier = user?.id ?? ip

  const { data, error } = await supabase.rpc('check_rate_limit', {
    p_identifier: identifier,
    p_action: action,
    p_max_requests: maxRequests,
    p_window_minutes: windowMinutes
  })

  if (error) return true // Si falla el rate limit, permitir (fail open)
  return data as boolean
}

// Uso en server actions:
// const allowed = await checkRateLimit({ action: 'api_call', maxRequests: 50, windowMinutes: 15 })
// if (!allowed) return { error: 'Too many requests. Try again later.' }
```

### 4.5 Rate Limits Recomendados

| Accion | Max Requests | Window |
|--------|-------------|--------|
| login_attempt | 5 | 15 min |
| signup | 3 | 60 min |
| password_reset | 3 | 60 min |
| api_call | 100 | 15 min |
| file_upload | 20 | 60 min |
| export_data | 5 | 60 min |

---

## Resumen Final

Al terminar, muestra:

```
=== SEGURIDAD ENTERPRISE CONFIGURADA ===

Base de Datos (Supabase):
  [OK/SKIP] Enum user_role (admin/editor/viewer)
  [OK/SKIP] Tabla role_permissions
  [OK/SKIP] RLS por roles en profiles
  [OK/SKIP] Tabla user_sessions
  [OK/SKIP] Tabla audit_logs
  [OK/SKIP] Tabla rate_limits + funcion check_rate_limit

Capa 1 - Roles:
  [OK/SKIP] permissions.ts (getCurrentUserRole, hasPermission, requireRole)
  [OK/SKIP] role-guard.tsx (componente de proteccion)

Capa 2 - 2FA/MFA:
  [OK/SKIP] mfa-setup.tsx (enrollment con QR)
  [OK/SKIP] mfa-verify.tsx (verificacion en login)
  [OK/SKIP] mfa.ts (requireMfa, hasMfaEnabled)

Capa 3 - Sessions:
  [OK/SKIP] session-tracker.ts (tracking automatico)
  [OK/SKIP] active-sessions.tsx (UI para ver/revocar sesiones)

Capa 4 - Rate Limiting + Audit:
  [OK/SKIP] audit.ts (logAudit helper)
  [OK/SKIP] rate-limit.ts (checkRateLimit helper)

IMPORTANTE: Habilitar MFA en Supabase Dashboard:
  Settings > Authentication > Multi Factor Authentication > Enable TOTP
```

---

## Reglas Criticas

1. **DESPUES DE ADD-LOGIN**: Nunca ejecutar sin auth existente
2. **CAPAS INDEPENDIENTES**: El usuario elige cuales activar
3. **RLS SIEMPRE**: Cada tabla nueva DEBE tener RLS habilitado
4. **FAIL OPEN en rate limit**: Si el servicio falla, permitir (no bloquear usuarios)
5. **AUDIT TODO**: Logear login, logout, CRUD, cambios de rol, errores de auth
6. **NO GUARDAR PASSWORDS**: Supabase maneja auth, nosotros solo roles y permisos
