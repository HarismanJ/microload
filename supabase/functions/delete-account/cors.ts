const allowedOrigins = new Set([
  'capacitor://localhost',
  'https://localhost',
  'http://localhost',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://microload.app',
  'null', // Some Android WebView and sandboxed-iframe contexts send literal "null"
])

const baseCorsHeaders = {
  // baggage and sentry-trace are auto-injected by the Sentry SDK for distributed tracing.
  // x-requested-with can be auto-added by Android WebView. All must be in the allowlist
  // or the browser blocks the real POST after preflight.
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with, baggage, sentry-trace',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin')
  const headers: Record<string, string> = { ...baseCorsHeaders }
  if (origin && allowedOrigins.has(origin)) {
    headers['Access-Control-Allow-Origin'] = origin
    headers.Vary = 'Origin'
  }
  return headers
}

export function isCorsOriginAllowed(req: Request) {
  const origin = req.headers.get('Origin')
  return !origin || allowedOrigins.has(origin)
}
