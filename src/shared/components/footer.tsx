'use client';

import Link from 'next/link';
import { FluyaLogo } from '@/shared/components/fluya-logo';

export function Footer() {
  return (
    <footer className="w-full bg-[#05000F] border-t border-white/5 mt-auto">
      <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col items-center gap-4">
        <Link href="/" className="transition-transform hover:scale-105">
          <FluyaLogo className="h-6" />
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
