import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { ROLE_PAGE_ACCESS, ROLE_REDIRECT_FALLBACK, type UserRole } from '@/shared/types/roles';

const publicRoutes = ['/login', '/signup', '/forgot-password', '/auth/callback', '/', '/contacto', '/privacidad', '/terminos'];

export async function middleware(request: NextRequest) {
  // APIs de la KB con auth propia (token de ingesta en /capture, lectura pública
  // en /search) — no pasan por el flujo de sesión-cookie del middleware.
  if (request.nextUrl.pathname.startsWith('/api/knowledge/')) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublicRoute = publicRoutes.some(route =>
    pathname === route || pathname.startsWith('/auth/')
  );

  // No autenticado intentando acceder a ruta protegida
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Autenticado intentando acceder a login/signup
  if (user && (pathname === '/login' || pathname === '/signup')) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  // ── Enforcement por rol (Sprint A) ────────────────────────────────────────
  // Defensivo: solo restringe rutas listadas en ROLE_PAGE_ACCESS que EXISTEN.
  // Si el rol no corresponde → redirect a /dashboard (existe, accesible para
  // todos los autenticados → sin loops). Rutas no listadas: acceso libre.
  // Si no se puede leer el rol (sin profile) → no se restringe (no rompe sesión).
  if (user && !isPublicRoute) {
    const allowed =
      ROLE_PAGE_ACCESS[pathname] ??
      ROLE_PAGE_ACCESS[`/${pathname.split('/')[1] ?? ''}`];

    if (allowed) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      const role = profile?.role as UserRole | undefined;

      if (role && !allowed.includes(role) && pathname !== ROLE_REDIRECT_FALLBACK) {
        const url = request.nextUrl.clone();
        url.pathname = ROLE_REDIRECT_FALLBACK;
        return NextResponse.redirect(url);
      }
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|_next/mcp|favicon.ico|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
