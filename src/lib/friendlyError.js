// Patterns that indicate backend / library internals leaking through. If an
// error.message matches any of these, we hide it from the UI and use the
// caller-provided fallback instead. The raw error is still console.error'd
// for debugging.
const UNSAFE_PATTERNS = [
  /fetch/i,
  /edge function/i,
  /jwt/i,
  /database error/i,
  /row.?level security/i,
  /violates.*constraint/i,
  /violates.*policy/i,
  /violates.*foreign key/i,
  /AuthApiError|PostgrestError|FunctionsError|FunctionsFetchError|FunctionsHttpError|StorageApiError|NetworkError/,
  /relation .* does not exist/i,
  /column .* does not exist/i,
  /function .* does not exist/i,
  /duplicate key/i,
  /\bCORS\b/,
  /TypeError|SyntaxError|ReferenceError/,
  /unexpected_failure/i,
  /\bsupabase\b/i,
  /\bpostgres(?:t)?\b/i,
  /\bschema\b/i,
  /\bRLS\b/i,
]

export function friendlyError(err, fallback) {
  if (err !== undefined && err !== null) {
    try { console.error(err) } catch { /* ignore */ }
  }
  const raw = typeof err?.message === 'string' ? err.message.trim() : ''
  if (!raw) return fallback
  if (raw.length > 200) return fallback
  if (UNSAFE_PATTERNS.some(re => re.test(raw))) return fallback
  return raw
}
