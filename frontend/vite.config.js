import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['react-phone-input-2'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React — cached aggressively, never changes
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Framer Motion — large lib, isolated so pages don't pull it unless needed
          'vendor-motion': ['framer-motion'],
          // Stripe / payment — only loaded when user reaches payment flow
          'vendor-stripe': ['@stripe/react-stripe-js', '@stripe/stripe-js'],
          // Other UI libs
          'vendor-ui': ['lucide-react', 'axios'],
        },
      },
    },
    // Raise the chunk warning threshold — some pages are legitimately larger
    chunkSizeWarningLimit: 800,
  },
  // Only used in local dev — in production the env var VITE_API_URL points to Render
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
})
