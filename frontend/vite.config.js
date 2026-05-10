import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const gitSha = (() => {
  try { return execSync('git rev-parse --short HEAD').toString().trim() }
  catch { return 'nogit' }
})()
const BUILD_ID = `${Date.now()}-${gitSha}`

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'kiddaboo-write-version',
      buildStart() {
        const outPath = path.resolve(__dirname, 'public/version.json')
        fs.writeFileSync(outPath, JSON.stringify({ buildId: BUILD_ID }))
      },
    },
  ],
  define: {
    __BUILD_ID__: JSON.stringify(BUILD_ID),
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js'],
          crop: ['react-easy-crop'],
        },
      },
    },
  },
})
