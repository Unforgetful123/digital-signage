import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import legacy from '@vitejs/plugin-legacy'

export default defineConfig({
  // 1. This ensures the TV can find the CSS and JS files
  base: './', 
  
  plugins: [
    react(),
    // 2. This translates modern React into older code that Smart TVs can read
    legacy({
      targets: [
        'Chrome >= 45', 
        'Safari >= 10', 
        'iOS >= 10', 
        'Firefox >= 40',
        'Edge >= 15',
        'ie >= 11'
      ],
      additionalLegacyPolyfills: ['regenerator-runtime/runtime']
    })
  ]
})