import Link from 'next/link';
import { AIAssistant } from '@/features/help/components/AIAssistant';

export const metadata = {
  title: 'Ayuda — AI Fluya',
};

export default function HelpPage() {
  return (
    <main className="min-h-screen bg-fluya-bg py-12 px-4">
      <div className="max-w-3xl mx-auto mb-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center text-sm text-gray-400 hover:text-white transition-colors"
        >
          ← Portfolio
        </Link>
      </div>
      <div className="max-w-3xl mx-auto mb-8 text-center">
        <h1 className="text-4xl font-bold text-white mb-2">
          ¿En qué podemos{' '}
          <span className="bg-gradient-to-r from-fluya-purple to-fluya-green bg-clip-text text-transparent">
            ayudarte
          </span>
          ?
        </h1>
        <p className="text-gray-400">
          Preguntale a AI Fluya sobre proyectos, skills, costos o cómo funciona el Manager.
        </p>
      </div>
      <AIAssistant />
    </main>
  );
}
