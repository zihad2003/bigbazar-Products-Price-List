import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Ensures the server reloads correctly during development
    watch: {
      usePolling: true,
    },
    proxy: {
      '/api': {
        target: 'http://localhost:8788',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  build: {
    // Optimizes the production build into the dist/ folder
    outDir: 'dist',
    sourcemap: false
  }
})