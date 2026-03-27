import type { Metadata } from 'next'
import { Suspense } from 'react'
import { Inter } from 'next/font/google'
import { connection } from 'next/server'
import { Navbar } from '@/shared/components/navbar'
import { Footer } from '@/shared/components/footer'
import { getProfile } from '@/features/auth/services/auth-service'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Factory Manager — Fluya Studio',
  description: 'Business OS para gestionar tu fabrica de software',
}

async function NavbarWithProfile() {
  await connection()
  const profile = await getProfile()
  return <Navbar serverProfile={profile} />
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className={`${inter.className} flex flex-col min-h-screen`}>
        <Suspense fallback={<Navbar serverProfile={null} />}>
          <NavbarWithProfile />
        </Suspense>
        <main className="flex-1 pt-16">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
