import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'fluya-purple': '#8B5CF6',
        'fluya-green': '#4AF2A1',
        'fluya-blue': '#3B82F6',
        'fluya-bg': '#0B001E',
        'fluya-card': '#0F0529',
        fluya: {
          dark: '#0B001E',
          card: '#150a2e',
          green: '#4AF2A1',
          purple: '#A961FF',
          blue: '#5C9DFF',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'sans-serif'],
      },
      backgroundImage: {
        'fluya-gradient': 'linear-gradient(to right, #A961FF, #4AF2A1)',
        'hero-glow': 'conic-gradient(from 180deg at 50% 50%, #2a8af6 0deg, #a853ba 180deg, #e92a67 360deg)',
      },
    },
  },
  plugins: [],
}

export default config
