import { defineConfig } from 'vite';

export default defineConfig({
  // Static site — serve index.html from project root
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    open: true,
  },
});
