import Link from 'next/link';
import { APP_VERSION, CHANGELOG } from '@/shared/lib/version';

export const metadata = {
  title: 'About — Factory Manager',
};

export default function AboutPage() {
  return (
    <div className="py-8 max-w-3xl mx-auto px-6 space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-white mb-2">About</h1>
        <p className="text-sm text-gray-400">
          Información del Factory Manager — versiones y changelog.
        </p>
      </header>

      <section className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-semibold text-white">Factory Manager</h2>
          <span className="px-3 py-1 bg-gradient-to-r from-fluya-purple to-fluya-blue text-white rounded-full text-sm font-mono font-medium">
            v{APP_VERSION}
          </span>
        </div>
        <p className="text-sm text-gray-400">
          Business OS de <strong>Fluya Studio</strong> para gestionar tu fábrica de software SaaS.
        </p>
        <div className="pt-2 flex flex-wrap gap-3 text-xs text-gray-500">
          <a
            href="https://github.com/nnrmits-svg/SaasFactoryManager"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white transition-colors"
          >
            GitHub →
          </a>
          <Link href="/contacto" className="hover:text-white transition-colors">
            Contacto →
          </Link>
          <Link href="/terminos" className="hover:text-white transition-colors">
            Términos →
          </Link>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-white">Changelog</h2>
        <ol className="space-y-4">
          {CHANGELOG.map((entry) => (
            <li
              key={entry.version}
              className="bg-white/5 border border-white/10 rounded-2xl p-5"
            >
              <div className="flex items-baseline justify-between mb-3">
                <span className="text-base font-medium text-fluya-purple font-mono">
                  v{entry.version}
                </span>
                <span className="text-xs text-gray-500">{entry.date}</span>
              </div>
              <ul className="space-y-1.5 text-sm text-gray-300">
                {entry.highlights.map((h, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-fluya-green shrink-0">▸</span>
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
