import { getCorsHeaders, isCorsOriginAllowed } from './cors.ts'

function assertEquals(actual: unknown, expected: unknown) {
  if (actual !== expected) {
    throw new Error(`Expected ${String(expected)}, received ${String(actual)}`)
  }
}

Deno.test('delete-account CORS echoes allowed native origin', () => {
  const request = new Request('https://example.test', {
    method: 'OPTIONS',
    headers: { Origin: 'capacitor://localhost' },
  })
  const headers = getCorsHeaders(request)

  assertEquals(isCorsOriginAllowed(request), true)
  assertEquals(headers['Access-Control-Allow-Origin'], 'capacitor://localhost')
  assertEquals(headers.Vary, 'Origin')
})

Deno.test('delete-account CORS rejects disallowed browser origins', () => {
  const request = new Request('https://example.test', {
    method: 'POST',
    headers: { Origin: 'https://evil.example' },
  })
  const headers = getCorsHeaders(request)

  assertEquals(isCorsOriginAllowed(request), false)
  assertEquals(headers['Access-Control-Allow-Origin'], undefined)
})

Deno.test('delete-account CORS allows no-origin requests without ACAO', () => {
  const request = new Request('https://example.test', { method: 'POST' })
  const headers = getCorsHeaders(request)

  assertEquals(isCorsOriginAllowed(request), true)
  assertEquals(headers['Access-Control-Allow-Origin'], undefined)
})

Deno.test('delete-account CORS allows literal "null" origin', () => {
  const request = new Request('https://example.test', {
    method: 'OPTIONS',
    headers: { Origin: 'null' },
  })
  const headers = getCorsHeaders(request)

  assertEquals(isCorsOriginAllowed(request), true)
  assertEquals(headers['Access-Control-Allow-Origin'], 'null')
})
