import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['nutristudio-logo.svg', 'hero-nutrition.jpg', 'landing-meal-scan.jpg', 'landing-wellness.jpg'],
      manifest: {
        name: 'NutriStudio AI — Nutrición y Bienestar',
        short_name: 'NutriStudio',
        description: 'Plataforma inteligente de nutrición, escáner de alimentos, seguimiento diario y bienestar.',
        theme_color: '#0d8a68',
        background_color: '#edf7f2',
        display: 'standalone',
        lang: 'es',
        icons: [
          {
            src: '/nutristudio-logo.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  server: {
    port: 5173
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/__tests__/setup.js'
  }
});
