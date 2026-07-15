import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' para que funcione en GitHub Pages bajo cualquier subruta
export default defineConfig({
  plugins: [react()],
  base: './',
})
