import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/predict': 'http://localhost:8000',
      '/health': 'http://localhost:8000',
      '/classes': 'http://localhost:8000',
      '/samples': 'http://localhost:8000',
      '/static': 'http://localhost:8000',
    },
  },
})
