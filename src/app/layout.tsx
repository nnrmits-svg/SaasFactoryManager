import { Suspense } from 'react'
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { NavbarAuth, NavbarSkeleton } from '@/shared/components/navbar'
import { Footer } from '@/shared/components/footer'
import { ChatbotWidget } from '@/features/help/components/ChatbotWidget'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })

export const metadata: Metadata = {
  title: 'Factory Manager — Fluya Studio',
  description: 'Business OS para gestionar tu fabrica de software',
  manifest: '/manifest.json',
  icons: {
    icon: '/icon-192.png',
    apple: '/apple-touch-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#7C3AED',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className={inter.variable}>
      <body className="font-sans flex flex-col min-h-screen">
        <Suspense fallback={<NavbarSkeleton />}>
          <NavbarAuth />
        </Suspense>
        <main className="flex-1 pt-16">{children}</main>
        <Footer />
        <ChatbotWidget />
        <SpeedInsights />
      </body>
    </html>
  )
}
