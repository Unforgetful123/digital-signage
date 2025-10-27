// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react({
      // this is the default, but ensure it's set:
      jsxRuntime: 'automatic'
    })
  ],
  server:{
    host:true,
    port:3000,
    strictPort: true
  }
});

