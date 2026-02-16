import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: './', // ✅ Keep this for the Admin panel too
  plugins: [
    react({
      jsxRuntime: 'automatic' 
    })
  ],
  server: {
    host: true,
    port: 5174, // Admin usually stays on 5173
    strictPort: true
  }
})