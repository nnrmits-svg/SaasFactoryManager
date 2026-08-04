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
