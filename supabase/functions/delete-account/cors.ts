const allowedOrigins = new Set([
  'capacitor://localhost',
  'http://localhost',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
])

const baseCorsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
