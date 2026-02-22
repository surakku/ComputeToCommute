import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
    server: {
    proxy: {
      // Proxy requests that start with '/api'
      '/api': {
        target: 'http://localhost:5000', // Your local API server's address
        changeOrigin: true, // Needed for virtual hosted sites
        secure: false, // Set to true if your API uses HTTPS
        // rewrite: (path) => path.replace(/^\/api/, ''), // Optional: rewrite the path if your API doesn't use the /api prefix
      },
    },
  },
})
