import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const now = new Date();
const buildVersion = `${now.getFullYear()}.${String(now.getMonth()+1).padStart(2,'0')}.${String(now.getDate()).padStart(2,'0')}`;

export default defineConfig({
  plugins: [react()],
  root: '.',
  publicDir: 'public',
  define: {
    __BUILD_TIME__: JSON.stringify(buildVersion),
  },
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 600,
    copyPublicDir: true,
  },
})
