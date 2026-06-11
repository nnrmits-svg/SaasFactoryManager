import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';

// Maneja los links de email de Supabase (invite, recovery, signup, magiclink)
// con el patrón token_hash + verifyOtp — el correcto para @supabase/ssr (PKCE).
// El /auth/callback (exchangeCodeForSession) queda SOLO para OAuth (Google),
// donde el code-verifier sí existe en el browser. Los invites/recovery se
// generan del lado servidor (sin verifier), por eso necesitan verifyOtp.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = searchParams.get('next') ?? '/dashboard';

  if (tokenHash && type) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      // Invitado entrando por primera vez: activar el profile (pending → active).
      if (data?.user) {
        await supabase
          .from('profiles')
          .update({ status: 'active' })
          .eq('id', data.user.id)
          .eq('status', 'pending');
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_confirm_error`);
}
