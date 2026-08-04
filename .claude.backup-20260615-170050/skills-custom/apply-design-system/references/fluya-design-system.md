# Fluya Studio - Design System y Boilerplate Rules

Este proyecto utiliza el Boilerplate oficial de Fluya Studio (Next.js 14, Supabase, Tailwind CSS, Shadcn UI).
**CUANDO DESARROLLES NUEVAS FUNCIONALIDADES PARA ESTE PROYECTO, DEBES RESPETAR ESTRICTAMENTE ESTAS REGLAS:**

## 1. Tema Oscuro (Dark Theme Obligatorio)
- La aplicación funciona **100% en modo oscuro**.
- El fondo base de la aplicación (body/main) es SIEMPRE `#0B001E` o `bg-[#0B001E]`.
- No utilices fondos blancos ni colores claros para secciones grandes.

## 2. Paleta de Colores de Marca
- **Violeta Fluya (Primario):** `fluya-purple` (`#8B5CF6`). Úsalo para botones principales, badges destacados y hover states de elementos violetas.
- **Verde Fluya (Acento/Éxito):** `fluya-green` (`#4AF2A1`). Úsalo para badges de éxito ("Success"), llamadas a la acción secundarias, textos que indiquen un ahorro o ventajas, e íconos de confirmación.
- **Azul Fluya (Acento secundario):** `fluya-blue` (`#3B82F6`). Útil para gradientes combinados.
- **Gradiente Oficial:** Para títulos principales (Hero) o insignias destacadas, usa el gradiente de la marca de izquierda a derecha: 
  `bg-gradient-to-r from-fluya-purple to-fluya-green` (aplicado sobre fondos o texto transparente `bg-clip-text text-transparent`).

## 3. Estilo de Componentes (Glassmorphism / Neon)
- **Tarjetas (Cards) y Contenedores:** 
  - Fondo: Translúcido usando `bg-white/5` o colores muy oscuros como `bg-[#0F0529]`.
  - Borde: Sutil `border border-white/10`.
  - Bordes Redondeados: `rounded-xl` o `rounded-2xl`.
- **Efectos Hover (Interacción):**
  - Al pasar el cursor, los bordes deben iluminarse sutilmente: `hover:border-fluya-purple/50` o `hover:border-fluya-green/50`.
  - Alternativa de hover de fondo: `hover:bg-white/10`.
  - Los elementos interactivos deben tener transiciones suaves: `transition-all duration-300`.
- **Efectos Neon / Glow (Solo para elementos muy importantes):**
  - Sombras con color: `shadow-[0_0_20px_rgba(139,92,246,0.3)]` (Ejemplo de brillo violeta).

## 4. Tipografía y Textos
- Fuente principal: Familia Sans-serif moderna (Inter/Roboto/etc ya configurada en la base).
- **Títulos (h1, h2):** Fuente en negrita (`font-bold`), color blanco (`text-white`) o gradiente.
- **Párrafos / Descripciones:** Color gris claro para legibilidad en fondo oscuro: `text-gray-400` o `text-gray-300`.
- **Textos de error/warning:** Usa colores tenues integrados sobre el fondo oscuro (ej: `text-red-400` o `bg-red-500/10 border-red-500/20`).

## 5. Elementos de UI Base
- **Logo:** Usa siempre el componente preconstruido `<FluyaLogo />` que ya se encuentra en `src/shared/ui/FluyaLogo.tsx`.
- **Botones Primarios:** Gradiente de marca (`bg-gradient-to-r from-fluya-purple to-fluya-blue`) con texto blanco y bordes redondeados (`rounded-full` o `rounded-xl`). Hover con un ligero efecto de brillo o levantamiento (`hover:-translate-y-0.5`).
- **Botones Secundarios/Outline:** Fondo transparente (`bg-transparent`) con borde fino (`border border-white/20`) y texto blanco o gris claro, con hover suavizado (`hover:bg-white/10`).
- **Footer y Legales:** Los enlaces del pie de página deben apuntar a `/terms`, `/privacy`, y `/contact`.

---
> **Instrucción para Agentes IA:** Al leer este archivo, asumen obligatoriamente estas clases de Tailwind y lineamientos visuales para cualquier nuevo componente, pantalla o layout solicitado en este proyecto. No se desvíen del Theme Oscuro ni del diseño Glassmorphism.

---

## 6. Componentes de Marca Obligatorios (Navbar y Footer)

> **REGLA CRÍTICA:** Toda app de Fluya Studio DEBE incluir el `<Navbar />` (logo arriba a la izquierda) y el `<Footer />` completo. Estos son INNEGOCIABLES. Créalos en `src/shared/components/` al iniciar cualquier proyecto.

### Layout Base

El layout raíz debe usar `flex flex-col min-h-screen` para que el footer quede siempre al fondo:

```tsx
// src/app/layout.tsx
import { Navbar } from '@/shared/components/navbar';
import { Footer } from '@/shared/components/footer';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-[#0a0a1a] flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1 pt-16">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
```

### Componente Navbar - Solo Logo (Arriba Izquierda)

```tsx
// src/shared/components/navbar.tsx
'use client';

import Link from 'next/link';

export function Navbar() {
  return (
    <nav className="
      fixed top-0 inset-x-0 z-50
      bg-[#0a0a1a]/80
      backdrop-blur-xl
      border-b border-white/5
      px-6 py-3
    ">
      <Link href="/" className="flex items-center gap-2.5 w-fit group">
        {/* Ícono F - gradiente pink → purple */}
        <div className="
          w-8 h-8 rounded-lg flex items-center justify-center
          bg-gradient-to-br from-pink-500 via-purple-500 to-purple-700
          shadow-lg shadow-purple-500/30
          group-hover:shadow-purple-500/50 transition-shadow
        ">
          <span className="text-white font-black text-sm leading-none">F</span>
        </div>
        {/* Texto de marca */}
        <span className="text-lg font-bold tracking-tight">
          <span className="text-white">Fluya</span>
          {' '}
          <span className="bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
            Studio
          </span>
        </span>
      </Link>
    </nav>
  );
}
```

### Componente Footer Completo

```tsx
// src/shared/components/footer.tsx
'use client';

import Link from 'next/link';

export function Footer() {
  return (
    <footer className="w-full bg-black border-t border-white/5 mt-auto">
      <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col items-center gap-6">

        {/* Logo centrado */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="
            w-8 h-8 rounded-lg flex items-center justify-center
            bg-gradient-to-br from-pink-500 via-purple-500 to-purple-700
            shadow-lg shadow-purple-500/20
          ">
            <span className="text-white font-black text-sm leading-none">F</span>
          </div>
          <span className="text-lg font-bold tracking-tight">
            <span className="text-white">Fluya</span>
            {' '}
            <span className="bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
              Studio
            </span>
          </span>
        </Link>

        {/* Links legales */}
        <div className="flex items-center gap-6">
          <Link href="/terminos" className="text-white/40 hover:text-white text-sm transition-colors">Términos</Link>
          <Link href="/privacidad" className="text-white/40 hover:text-white text-sm transition-colors">Privacidad</Link>
          <Link href="/contacto" className="text-white/40 hover:text-white text-sm transition-colors">Contacto</Link>
        </div>

        {/* WhatsApp CTA */}
        <a
          href="https://wa.me/5491100000000"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5 bg-[#25D366] hover:bg-[#20b858] text-white font-semibold text-sm px-6 py-3 rounded-full shadow-lg shadow-green-500/20 transition-all duration-300"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
          </svg>
          Chatear por WhatsApp
        </a>

        {/* Ubicación y copyright */}
        <p className="text-white/25 text-xs">Fluya Studio IA • Buenos Aires, Argentina</p>
        <p className="text-white/25 text-xs">© 2024 SuscriptionMgmt. Powered by Fluya IA.</p>
      </div>
    </footer>
  );
}
```

---
> **Instrucción para Agentes IA:** Al leer este archivo, asumen obligatoriamente estas clases de Tailwind y lineamientos visuales para cualquier nuevo componente, pantalla o layout solicitado en este proyecto. No se desvíen del Theme Oscuro ni del diseño Glassmorphism.
