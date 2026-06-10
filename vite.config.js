import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Minimal Vite config: React + Tailwind v4 (via the official Tailwind Vite plugin).
// No backend, no extra tooling — just a static front-end app.
export default defineConfig({
  plugins: [react(), tailwindcss()],
})
