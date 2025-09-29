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
    host:'0.0.0.0',
    port:3000
  }
});

