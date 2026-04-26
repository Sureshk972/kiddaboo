import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Split big third-party deps into their own long-cache chunks
          // so a tweak to a page component doesn't bust them.
          react: ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js'],
          crop: ['react-easy-crop'],
        },
      },
    },
  },
})
