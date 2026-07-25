import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // Default to the local Cloudflare Worker (wrangler dev → :8787).
      // Override with VITE_DEV_PROXY=http://127.0.0.1:5000 to hit legacy Flask.
      '/api': {
        target: process.env.VITE_DEV_PROXY || 'http://127.0.0.1:8787',
        changeOrigin: true,
      },
      '/static': {
        target: process.env.VITE_DEV_PROXY || 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
    },
  },
  build: {
    target: 'es2020',
    sourcemap: false,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          query: ['@tanstack/react-query'],
          charts: ['recharts', 'chart.js', 'react-chartjs-2'],
          motion: ['framer-motion'],
        },
      },
    },
  },
})
