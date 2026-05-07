---
name: fluya-brand
description: "Aplicar branding Fluya Studio (logo, header, footer, paleta dark, gradientes, manifest PWA) a una app de la factory. Activar cuando el usuario dice: apliquemos branding Fluya, header Fluya, footer Fluya, estilo Fluya, look and feel Fluya, logo Fluya, tema oscuro Fluya, colores Fluya, Fluya Studio."
allowed-tools: Read, Write, Edit, Bash, Grep, Glob
---

# Skill: Fluya Brand — Look & Feel

Aplica el sistema de diseño de Fluya Studio a una app: logo, header, footer, paleta oscura, gradientes, tipografía Inter y manifest PWA con theme color.

## Cuándo usarlo

- "Aplicá branding Fluya a esta app"
- "Necesito un header con el logo de Fluya"
- "Pegame el footer con los links legales"
- "Configurá el tema dark de Fluya en Tailwind"
- "Hacé que esta app se vea como Fluya Studio"

## Qué instala

1. **Componente FluyaLogo** → `src/shared/ui/FluyaLogo.tsx`
2. **Header** → template para el layout principal (nav + logo + slot derecho)
3. **Footer** → template con links legales (Términos/Privacidad/Contacto) + copyright
4. **Extensión Tailwind** → `fluya.*` colors + `fluya-gradient` + `hero-glow`
5. **Assets** → logo JPG + iconos PWA (apple-touch, 192, 512)
6. **Manifest PWA** → con `#0B001E` background y `#7C3AED` theme
7. **Design system rules** → `fluya_design_system.md`

## Pasos para aplicar a una app nueva

### 1. Copiar assets a `public/`
```bash
cp .claude/skills/fluya-brand/assets/Fluya-Logo-Ult.jpg public/
cp .claude/skills/fluya-brand/assets/apple-touch-icon.png public/
cp .claude/skills/fluya-brand/assets/icon-192.png public/
cp .claude/skills/fluya-brand/assets/icon-512.png public/
```

### 2. Extender Tailwind
Abrir `tailwind.config.ts` y mergear el contenido de `tailwind-snippet.ts` dentro de `theme.extend`. Claves a agregar: `colors.fluya`, `fontFamily.sans`, `backgroundImage.fluya-gradient` y `backgroundImage.hero-glow`.

### 3. Copiar componente del logo
```bash
cp .claude/skills/fluya-brand/templates/FluyaLogo.tsx src/shared/ui/
```

### 4. Integrar Header y Footer
Los templates `templates/Header.tsx` y `templates/Footer.tsx` son componentes standalone que reciben props (navLinks, userEmail, rightSlot, appName). Importarlos desde el layout principal de la app.

Uso mínimo en un layout:
```tsx
import { FluyaHeader } from '@/shared/ui/FluyaHeader';
import { FluyaFooter } from '@/shared/ui/FluyaFooter';

<div className="min-h-screen bg-[#0B001E] text-white flex flex-col font-sans">
  <FluyaHeader navLinks={navLinks} userEmail={user?.email} />
  <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-8">{children}</main>
  <FluyaFooter appName="MiApp" />
</div>
```

### 5. Configurar Inter font en `app/layout.tsx`
```tsx
import { Inter } from 'next/font/google';
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

<html lang="es" className={inter.variable}>
```

### 6. Copiar manifest PWA
```bash
cp .claude/skills/fluya-brand/manifest-template.json public/manifest.json
```
Reemplazar los placeholders `{{APP_FULL_NAME}}`, `{{APP_SHORT_NAME}}`, `{{APP_DESCRIPTION}}`, `{{START_URL}}`, `{{CATEGORY}}`.

### 7. Copiar design system
```bash
cp .claude/skills/fluya-brand/design-system.md fluya_design_system.md
```

## Paleta de referencia

### Colores (source of truth: `tailwind.config.ts`)
| Token | Hex | Uso |
|-------|-----|-----|
| `fluya.dark` | `#0B001E` | Fondo principal de la app |
| `fluya.card` | `#150a2e` | Fondo de cards |
| `fluya.green` | `#4AF2A1` | Éxito, CTAs secundarias, hover states |
| `fluya.purple` | `#A961FF` | Botones primarios, badges |
| `fluya.blue` | `#5C9DFF` | Acentos secundarios |

### Gradientes
- `bg-fluya-gradient` → `linear-gradient from fluya-purple to fluya-green`
- `bg-hero-glow` → conic gradient para hero sections

### Fondos directos frecuentes
- `bg-[#0B001E]` — fondo base
- `bg-[#0B001E]/80 backdrop-blur-md` — header sticky
- `bg-[#05000F]` — footer (más oscuro que la base)

## Reglas duras

- Tema oscuro **obligatorio**: nunca fondos blancos en secciones grandes
- Texto principal `text-white` o gradiente de marca; textos secundarios `text-gray-400`
- Botones primarios con gradiente `from-fluya-purple to-fluya-blue` (o `to-fluya-green`) y `rounded-full`
- Footer **siempre** con `/terms`, `/privacy`, `/contact`
- Logo **siempre** vía `<FluyaLogo />`, nunca `<img>` directo

## Anti-patrones

- NO inventar tokens de color fuera de la paleta `fluya.*`
- NO usar defaults de Material UI / shadcn sin ajustar al dark
- NO poner el logo sobre fondo blanco o crema
- NO cambiar el gradiente oficial (purple → green) por otros tonos
- NO duplicar el componente `FluyaLogo`; copiarlo una vez y reusarlo

## Discrepancia conocida

El `fluya_design_system.md` de referencia documenta `fluya-purple` como `#8B5CF6` y `fluya-blue` como `#3B82F6`, pero `tailwind.config.ts` compila `#A961FF` y `#5C9DFF`. **La fuente de verdad son los valores del tailwind.config** — el design-system.md está desactualizado en esos dos hex. Si se portea, alinear el md con el config.

## Archivos del skill

```
.claude/skills/fluya-brand/
├── SKILL.md
├── assets/
│   ├── Fluya-Logo-Ult.jpg
│   ├── apple-touch-icon.png
│   ├── icon-192.png
│   └── icon-512.png
├── templates/
│   ├── FluyaLogo.tsx
│   ├── Header.tsx
│   └── Footer.tsx
├── tailwind-snippet.ts
├── manifest-template.json
└── design-system.md
```
