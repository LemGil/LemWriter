import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  test: {
    environment: 'node',
    globals: true,
    pool: 'forks',
    exclude: ['node_modules', 'dist', 'electron'],
  },
})
