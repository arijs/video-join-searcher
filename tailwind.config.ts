import type { Config } from 'tailwindcss'

export default {
  content: [
    './index.html',
    './src/frontend/src/**/*.{vue,js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      // mantenha suas customizações antigas aqui (cores, fonts, etc.)
    },
  },
  plugins: [],
} satisfies Config
