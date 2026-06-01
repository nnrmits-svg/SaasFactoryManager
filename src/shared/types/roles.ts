// Tipos y tablas de acceso por rol — fuente PURA (sin deps de server),
// importable desde middleware (proxy) y desde server components/actions.
//
// Roles (Sprint A): leader / dev / comercial / cliente.

export type UserRole = 'leader' | 'dev' | 'comercial' | 'cliente';

export const ROLE_LABELS: Record<UserRole, string> = {
  leader: '👑 Líder',
  dev: '💻 Desarrollador',
  comercial: '🤝 Comercial',
  cliente: '🏢 Cliente',
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  leader: 'Visibilidad total + asignación de proyectos',
  dev: 'Desarrolla los proyectos asignados',
  comercial: 'Vende proyectos, aporta info de discovery',
  cliente: 'Cliente externo que ve su propio proyecto',
};

/**
 * Acceso por página → roles permitidos.
 *
 * Solo se listan rutas que EXISTEN hoy y que queremos restringir. Las rutas no
 * listadas tienen acceso libre (default allow) — ej: /me, /help, /about,
 * /dashboard, /project. El middleware redirige a /dashboard (existe, accesible
 * para todos) cuando un rol intenta una ruta que no le corresponde.
 *
 * Las rutas `/{rol}/dashboard` se incluyen para el futuro (cuando se creen los
 * layouts por rol); hoy no existen y el middleware NO redirige a ellas.
 */
export const ROLE_PAGE_ACCESS: Record<string, UserRole[]> = {
  // Solo leader (páginas existentes sensibles)
  '/factory': ['leader'],
  '/settings': ['leader'],
  '/reports': ['leader'],
  '/versions': ['leader'],

  // Cheat sheet: equipo interno, no cliente
  '/cheat-sheet': ['leader', 'dev', 'comercial'],

  // Dashboards por rol (rutas FUTURAS — todavía no creadas, ver PASO posterior)
  '/comercial/dashboard': ['comercial', 'leader'],
  '/dev/dashboard': ['dev', 'leader'],
  '/cliente/dashboard': ['cliente', 'leader'],
  '/leader/dashboard': ['leader'],
};

/**
 * Default landing por rol — PREPARADO para cuando existan las rutas /{rol}/dashboard.
 * Hoy el middleware NO lo usa (las rutas no existen); el landing común sigue siendo /dashboard.
 */
export const DEFAULT_LANDING_BY_ROLE: Record<UserRole, string> = {
  comercial: '/comercial/dashboard',
  dev: '/dev/dashboard',
  cliente: '/cliente/dashboard',
  leader: '/leader/dashboard',
};

/** Ruta a la que se redirige cuando un rol intenta una página no permitida. */
export const ROLE_REDIRECT_FALLBACK = '/dashboard';
