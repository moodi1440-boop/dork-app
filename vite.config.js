import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  root: '.',
  publicDir: 'public',
  define: {
    __BUILD_TIME__: JSON.stringify("L2"),
  },
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 600,
    copyPublicDir: true,
  },
})
