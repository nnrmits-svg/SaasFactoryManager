export default function PrivacidadPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold text-white mb-6">Politica de Privacidad</h1>
      <div className="space-y-4 text-gray-400 leading-relaxed">
        <p>Ultima actualizacion: Marzo 2026</p>

        <h2 className="text-xl font-semibold text-white mt-8">1. Informacion que Recopilamos</h2>
        <p>Factory Manager recopila informacion minima necesaria para el funcionamiento del servicio: datos de proyectos (nombres, rutas, versiones) y metricas de uso (tiempo de trabajo, commits).</p>

        <h2 className="text-xl font-semibold text-white mt-8">2. Como Usamos tu Informacion</h2>
        <p>La informacion se utiliza exclusivamente para proporcionar las funcionalidades del servicio: gestion de proyectos, calculo de metricas y generacion de reportes.</p>

        <h2 className="text-xl font-semibold text-white mt-8">3. Almacenamiento de Datos</h2>
        <p>Los datos se almacenan en servidores seguros de Supabase (PostgreSQL). Los datos de proyectos locales permanecen en tu maquina.</p>

        <h2 className="text-xl font-semibold text-white mt-8">4. Comparticion de Datos</h2>
        <p>No compartimos tu informacion personal con terceros. Los datos de proyectos son privados y solo accesibles por ti.</p>

        <h2 className="text-xl font-semibold text-white mt-8">5. Tus Derechos</h2>
        <p>Tienes derecho a acceder, modificar y eliminar tus datos en cualquier momento. Contactanos para ejercer estos derechos.</p>

        <h2 className="text-xl font-semibold text-white mt-8">6. Contacto</h2>
        <p>Para consultas sobre privacidad, contactanos a traves de nuestra pagina de contacto.</p>
      </div>
    </div>
  );
}
