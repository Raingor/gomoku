import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: { port: 5311, strictPort: true },
  preview: { port: 4311, strictPort: true },
});
