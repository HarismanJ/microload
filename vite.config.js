import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('html5-qrcode')) return 'scanner'
          if (id.includes('react-body-highlighter')) return 'body-diagram'
          if (id.includes('@dnd-kit')) return 'drag-drop'
          if (id.includes('@supabase')) return 'supabase'
          if (id.includes('react') || id.includes('scheduler')) return 'react-vendor'
        },
      },
    },
  },
  server: {
    host: true,
  },
})
