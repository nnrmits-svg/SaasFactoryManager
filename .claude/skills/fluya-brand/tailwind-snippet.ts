// Snippet para Tailwind v3. Pegar DENTRO de `theme.extend` en tailwind.config.ts.
// No copies este archivo tal cual — es una referencia, mergear a mano con el config existente.

export const fluyaThemeExtension = {
    colors: {
        fluya: {
            dark: '#0B001E',   // Fondo principal
            card: '#150a2e',   // Fondo de cards
            green: '#4AF2A1',  // Éxito, CTAs secundarias, hover
            purple: '#A961FF', // Botones primarios, badges
            blue: '#5C9DFF',   // Acentos secundarios
        },
    },
    fontFamily: {
        sans: ['var(--font-inter)', 'sans-serif'],
    },
    backgroundImage: {
        'fluya-gradient': 'linear-gradient(to right, #A961FF, #4AF2A1)',
        'hero-glow': 'conic-gradient(from 180deg at 50% 50%, #2a8af6 0deg, #a853ba 180deg, #e92a67 360deg)',
    },
};

// Ejemplo de cómo queda el tailwind.config.ts final:
//
// import type { Config } from "tailwindcss";
//
// const config: Config = {
//     content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
//     theme: {
//         extend: {
//             colors: {
//                 fluya: {
//                     dark: '#0B001E',
//                     card: '#150a2e',
//                     green: '#4AF2A1',
//                     purple: '#A961FF',
//                     blue: '#5C9DFF',
//                 },
//             },
//             fontFamily: {
//                 sans: ['var(--font-inter)', 'sans-serif'],
//             },
//             backgroundImage: {
//                 'fluya-gradient': 'linear-gradient(to right, #A961FF, #4AF2A1)',
//                 'hero-glow': 'conic-gradient(from 180deg at 50% 50%, #2a8af6 0deg, #a853ba 180deg, #e92a67 360deg)',
//             },
//         },
//     },
// };
// export default config;
