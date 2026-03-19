import Link from 'next/link'

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-6">
      <div className="text-center max-w-2xl">
        <h1 className="text-4xl font-bold mb-3">
          <span className="bg-gradient-to-r from-fluya-purple to-fluya-green bg-clip-text text-transparent">
            Factory Manager
          </span>
        </h1>
        <p className="text-gray-400 text-lg mb-8">
          Tu Business OS para gestionar la fabrica de software.
          Crea, monitorea y controla todos tus proyectos SaaS.
        </p>

        <div className="flex items-center justify-center gap-4">
          <Link
            href="/dashboard"
            className="px-6 py-3 bg-gradient-to-r from-fluya-purple to-fluya-blue text-white font-semibold rounded-xl hover:-translate-y-0.5 transition-all duration-300 shadow-lg shadow-fluya-purple/30"
          >
            Ver Portfolio
          </Link>
          <Link
            href="/factory"
            className="px-6 py-3 border border-white/20 text-white rounded-xl hover:bg-white/10 transition-all duration-300"
          >
            Crear Proyecto
          </Link>
        </div>
      </div>
    </div>
  )
}
