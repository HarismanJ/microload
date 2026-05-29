import * as Sentry from '@sentry/react'

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,

  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Tracing: 100% outside production, lower volume in production.
  tracesSampleRate: import.meta.env.MODE === 'production' ? 0.1 : 1.0,
  tracePropagationTargets: [
    'localhost',
    new RegExp(`^${import.meta.env.VITE_SUPABASE_URL}`),
  ],

  // Session Replay — record all sessions that hit an error, 10% otherwise
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Structured logging via Sentry.logger.*
  enableLogs: true,
})
