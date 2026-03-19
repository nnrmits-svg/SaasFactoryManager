'use client';

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

        <div className="flex items-center gap-6">
          <Link href="/terminos" className="text-white/40 hover:text-white text-sm transition-colors">Terminos</Link>
          <Link href="/privacidad" className="text-white/40 hover:text-white text-sm transition-colors">Privacidad</Link>
          <Link href="/contacto" className="text-white/40 hover:text-white text-sm transition-colors">Contacto</Link>
        </div>

        <p className="text-white/25 text-xs">Fluya Studio IA &bull; Buenos Aires, Argentina</p>
      </div>
    </footer>
  );
}
