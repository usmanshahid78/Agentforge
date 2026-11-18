/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// Local model server. Override with OLLAMA_URL if Ollama runs elsewhere (e.g. another machine on the LAN).
const ollama = {
  '/ollama': {
    target: process.env.OLLAMA_URL ?? 'http://127.0.0.1:11434',
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/ollama/, ''),
  },
};

export default defineConfig({
  plugins: [react()],
  server: { proxy: ollama },
  preview: { proxy: ollama },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    // Only three.js exceeds 500 kB, and it is lazy-loaded (3D orb and avatar stage). Do not add it to
    // manualChunks: that makes Vite preload it on first paint.
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          motion: ['framer-motion'],
        },
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
