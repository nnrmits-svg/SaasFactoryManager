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
      },
    },
  },
  plugins: [],
}

export default config
