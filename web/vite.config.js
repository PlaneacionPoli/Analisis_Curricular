import { defineConfig } from 'vite';

// base relativa: el mismo build sirve en GitHub Pages, Hugging Face Spaces (static) o abierto desde un servidor local.
export default defineConfig({
  base: './',
  worker: { format: 'es' },
  build: { chunkSizeWarningLimit: 4500 },
});
