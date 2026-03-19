import fs from 'node:fs/promises';
import path from 'node:path';

const FLUYA_TAILWIND_COLORS = `
      colors: {
        'fluya-purple': '#8B5CF6',
        'fluya-green': '#4AF2A1',
        'fluya-blue': '#3B82F6',
        'fluya-bg': '#0B001E',
        'fluya-card': '#0F0529',
      },`;

const FLUYA_GLOBALS_CSS = `@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-fluya-bg text-white antialiased;
  }
}
`;

const FLUYA_NAVBAR = `'use client';

import Link from 'next/link';

export function Navbar() {
  return (
    <nav className="fixed top-0 inset-x-0 z-50 bg-fluya-bg/80 backdrop-blur-xl border-b border-white/5 px-6 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 w-fit group">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-pink-500 via-purple-500 to-purple-700 shadow-lg shadow-purple-500/30 group-hover:shadow-purple-500/50 transition-shadow">
            <span className="text-white font-black text-sm leading-none">F</span>
          </div>
          <span className="text-lg font-bold tracking-tight">
            <span className="text-white">Fluya</span>{' '}
            <span className="bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
              Studio
            </span>
          </span>
        </Link>
      </div>
    </nav>
  );
}
`;

const FLUYA_FOOTER = `'use client';

import Link from 'next/link';

export function Footer() {
  return (
    <footer className="w-full bg-black border-t border-white/5 mt-auto">
      <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col items-center gap-4">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-gradient-to-br from-pink-500 via-purple-500 to-purple-700 shadow-lg shadow-purple-500/20">
            <span className="text-white font-black text-xs leading-none">F</span>
          </div>
          <span className="text-base font-bold tracking-tight">
            <span className="text-white">Fluya</span>{' '}
            <span className="bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
              Studio
            </span>
          </span>
        </Link>
        <p className="text-white/25 text-xs">Fluya Studio IA</p>
      </div>
    </footer>
  );
}
`;

const FLUYA_LAYOUT = `import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Navbar } from '@/shared/components/navbar'
import { Footer } from '@/shared/components/footer'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Mi App — Fluya Studio',
  description: 'Built with SaaS Factory',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className={\`\${inter.className} flex flex-col min-h-screen\`}>
        <Navbar />
        <main className="flex-1 pt-16">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
`;

/**
 * Injects the Fluya design system into a project directory.
 * Updates: tailwind.config.ts, globals.css, layout.tsx, navbar.tsx, footer.tsx
 */
export async function injectFluyaDesignSystem(appPath: string): Promise<void> {
  // 1. Update tailwind.config.ts - inject fluya colors into extend
  const tailwindPath = path.join(appPath, 'tailwind.config.ts');
  try {
    let tailwindContent = await fs.readFile(tailwindPath, 'utf-8');
    if (!tailwindContent.includes('fluya-purple')) {
      tailwindContent = tailwindContent.replace(
        /extend:\s*\{/,
        `extend: {\n${FLUYA_TAILWIND_COLORS}`,
      );
      await fs.writeFile(tailwindPath, tailwindContent);
    }
  } catch {
    // tailwind.config.ts might not exist in some templates
  }

  // 2. Write globals.css
  const globalsPath = path.join(appPath, 'src', 'app', 'globals.css');
  await fs.mkdir(path.dirname(globalsPath), { recursive: true });
  await fs.writeFile(globalsPath, FLUYA_GLOBALS_CSS);

  // 3. Create shared components directory and write navbar + footer
  const sharedDir = path.join(appPath, 'src', 'shared', 'components');
  await fs.mkdir(sharedDir, { recursive: true });
  await fs.writeFile(path.join(sharedDir, 'navbar.tsx'), FLUYA_NAVBAR);
  await fs.writeFile(path.join(sharedDir, 'footer.tsx'), FLUYA_FOOTER);

  // 4. Write root layout with Navbar + Footer
  const layoutPath = path.join(appPath, 'src', 'app', 'layout.tsx');
  await fs.writeFile(layoutPath, FLUYA_LAYOUT);
}
