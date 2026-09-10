import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: '../public/hr',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    host: true
  }
})
