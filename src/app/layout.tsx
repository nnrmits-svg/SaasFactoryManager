import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Navbar } from '@/shared/components/navbar'
import { Footer } from '@/shared/components/footer'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Factory Manager — Fluya Studio',
  description: 'Business OS para gestionar tu fabrica de software',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className={`${inter.className} flex flex-col min-h-screen`}>
        <Navbar />
        <main className="flex-1 pt-16">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
