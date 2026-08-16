import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    proxy: {
      '/api': 'http://localhost:8090',
      '/uploads': 'http://localhost:8090',
    },
  },
  build: {
    outDir: 'dist',
  },
});
