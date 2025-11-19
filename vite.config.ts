import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'   // ← novo plugin v4

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),                         // ← isso substitui todo o PostCSS antigo
  ],
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
      '/ws': {
        target: 'ws://localhost:3001',
        ws: true,
      },
      '/thumbs': 'http://localhost:3001',
      '/file': 'http://localhost:3001',
    },
  },
})