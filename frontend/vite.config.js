import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'nutristudio-logo.svg',
        'hero-nutrition.webp',
        'landing-meal-scan.webp',
        'landing-wellness.webp'
      ],
      manifest: {
        name: 'NutriStudio AI — Come mejor sin complicarte la vida',
        short_name: 'NutriStudio',
        description: 'Planificación de comidas reales de tu país, educación nutricional clara y coach con IA.',
        theme_color: '#1E5631',
        background_color: '#FAF6F0',
        display: 'standalone',
        orientation: 'portrait',
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
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom', 'zustand'],
          'motion-i18n': ['framer-motion', 'i18next', 'react-i18next'],
          charts: ['recharts']
        }
      }
    }
  },
  server: {
    port: 5173
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/__tests__/setup.js'
  }
});
