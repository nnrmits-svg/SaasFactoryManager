import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Navbar } from '@/shared/components/navbar'
import { Footer } from '@/shared/components/footer'
import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/features/auth/types'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Factory Manager — Fluya Studio',
  description: 'Business OS para gestionar tu fabrica de software',
}

async function loadAuth(): Promise<{ profile: Profile | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { profile: null }

  const { data: dbProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  // Fallback when no `profiles` row exists yet (auto-create on signup is a
  // separate task — meanwhile we still want the navbar to show the menu).
  const profile: Profile = dbProfile ?? {
    id: user.id,
    email: user.email ?? '',
    full_name: null,
    avatar_url: null,
    created_at: user.created_at,
    updated_at: user.created_at,
  }
  return { profile }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { profile } = await loadAuth()

  return (
    <html lang="es">
      <body className={`${inter.className} flex flex-col min-h-screen`}>
        <Navbar profile={profile} />
        <main className="flex-1 pt-16">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
