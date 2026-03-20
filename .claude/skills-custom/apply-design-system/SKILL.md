---
name: apply-design-system
description: "Aplicar el Design System Fluya a cualquier proyecto SaaS Factory. Inyecta colores en Tailwind, Navbar, Footer, dark theme y layout. Activar cuando el usuario dice: aplica el design system, aplica Fluya, quiero el estilo Fluya, ponle el branding, design system, o necesito el look Fluya."
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# Skill: Apply Design System (Fluya)

Inyecta el Design System Fluya en el proyecto actual. Modifica 5 archivos clave para establecer la identidad visual completa.

## Que Hace

1. **tailwind.config.ts** — Agrega colores custom: `fluya-purple`, `fluya-green`, `fluya-blue`, `fluya-bg`, `fluya-card`
2. **src/app/globals.css** — Dark theme base con `bg-fluya-bg text-white antialiased`
3. **src/shared/components/navbar.tsx** — Navbar fija con logo Fluya Studio, glassmorphism
4. **src/shared/components/footer.tsx** — Footer con logo y links legales
5. **src/app/layout.tsx** — Layout root con `<Navbar />` + `<Footer />`, fuente Inter, dark theme

## Paleta de Colores

| Token | Hex | Uso |
|-------|-----|-----|
| `fluya-purple` | `#8B5CF6` | Botones primarios, accents, hover |
| `fluya-green` | `#4AF2A1` | Exito, badges positivos, CTA secundario |
| `fluya-blue` | `#3B82F6` | Gradientes combinados |
| `fluya-bg` | `#0B001E` | Fondo base de toda la app |
| `fluya-card` | `#0F0529` | Fondo de tarjetas/contenedores |

## Reglas de Estilo

- **Cards**: `bg-white/5 border border-white/10 rounded-2xl`
- **Hover**: `hover:border-fluya-purple/30 transition-all duration-300`
- **Botones primarios**: `bg-gradient-to-r from-fluya-purple to-fluya-blue text-white rounded-xl`
- **Botones secundarios**: `border border-white/20 text-white hover:bg-white/10`
- **Glow**: `shadow-[0_0_20px_rgba(139,92,246,0.3)]` (solo elementos importantes)
- **Textos**: Titulos `text-white font-bold`, parrafos `text-gray-400`

## Proceso de Ejecucion

### Paso 1: Verificar que es un proyecto Next.js

```
Buscar: tailwind.config.ts, src/app/layout.tsx
Si no existen → Avisar al usuario que no es un proyecto compatible
```

### Paso 2: Inyectar colores en Tailwind

Agregar en `tailwind.config.ts` dentro de `theme.extend`:

```typescript
colors: {
  'fluya-purple': '#8B5CF6',
  'fluya-green': '#4AF2A1',
  'fluya-blue': '#3B82F6',
  'fluya-bg': '#0B001E',
  'fluya-card': '#0F0529',
},
```

### Paso 3: Actualizar globals.css

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-fluya-bg text-white antialiased;
  }
}
```

### Paso 4: Crear Navbar

Crear `src/shared/components/navbar.tsx`:
- Fixed top, z-50
- `bg-fluya-bg/80 backdrop-blur-xl border-b border-white/5`
- Logo Fluya (cuadrado gradiente pink→purple con "F")
- Links de navegacion con hover states

### Paso 5: Crear Footer

Crear `src/shared/components/footer.tsx`:
- `bg-black border-t border-white/5`
- Logo Fluya
- Links legales (Terminos, Privacidad, Contacto)

### Paso 6: Actualizar Layout

Actualizar `src/app/layout.tsx`:
- Import Inter font
- Import Navbar + Footer
- Body: `flex flex-col min-h-screen`
- Main: `flex-1 pt-16` (padding para navbar fija)

### Paso 7: Verificar

```bash
npm run typecheck
```

Si pasa, el design system esta aplicado correctamente.

## Referencia Completa

Ver `references/fluya-design-system.md` para la documentacion completa del design system con todos los patrones y componentes.
