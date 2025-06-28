// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    // Minimal polyfills needed
    'global': {},
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV)
  },
  server: {
   
  }
})