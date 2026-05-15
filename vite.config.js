import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { sentryVitePlugin } from '@sentry/vite-plugin'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const plugins = [react()]

  if (env.SENTRY_AUTH_TOKEN) {
    plugins.push(sentryVitePlugin({
      org: env.SENTRY_ORG,
      project: env.SENTRY_PROJECT,
      authToken: env.SENTRY_AUTH_TOKEN,
    }))
  }

  return {
  plugins,
  build: {
    sourcemap: 'hidden',
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
  }
})
