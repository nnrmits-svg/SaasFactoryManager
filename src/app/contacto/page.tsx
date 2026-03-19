export default function ContactoPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold text-white mb-6">Contacto</h1>
      <div className="space-y-6">
        <p className="text-gray-400 leading-relaxed">
          Estamos para ayudarte. Elige el canal que prefieras para comunicarte con nosotros.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <a
            href="https://wa.me/5491100000000"
            target="_blank"
            rel="noopener noreferrer"
            className="p-5 bg-white/5 border border-white/10 rounded-2xl hover:border-fluya-green/50 transition-all duration-300 group"
          >
            <h3 className="text-white font-semibold mb-1 group-hover:text-fluya-green transition-colors">WhatsApp</h3>
            <p className="text-gray-500 text-sm">Respuesta inmediata en horario laboral</p>
          </a>

          <a
            href="mailto:hola@fluyastudio.com"
            className="p-5 bg-white/5 border border-white/10 rounded-2xl hover:border-fluya-purple/50 transition-all duration-300 group"
          >
            <h3 className="text-white font-semibold mb-1 group-hover:text-fluya-purple transition-colors">Email</h3>
            <p className="text-gray-500 text-sm">hola@fluyastudio.com</p>
          </a>
        </div>

        <div className="mt-8 p-5 bg-white/5 border border-white/10 rounded-2xl">
          <h3 className="text-white font-semibold mb-2">Fluya Studio IA</h3>
          <p className="text-gray-500 text-sm">Buenos Aires, Argentina</p>
        </div>
      </div>
    </div>
  );
}
