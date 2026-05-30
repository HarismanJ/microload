import { friendlyError } from '../../lib/friendlyError'

describe('friendlyError', () => {
  let errorSpy

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    errorSpy.mockRestore()
  })

  describe('non-error inputs', () => {
    it('returns the fallback for null without calling console.error', () => {
      expect(friendlyError(null, 'fallback')).toBe('fallback')
      expect(errorSpy).not.toHaveBeenCalled()
    })

    it('returns the fallback for undefined without calling console.error', () => {
      expect(friendlyError(undefined, 'fallback')).toBe('fallback')
      expect(errorSpy).not.toHaveBeenCalled()
    })

    it('returns the fallback for an empty message string', () => {
      expect(friendlyError({ message: '' }, 'fallback')).toBe('fallback')
    })

    it('returns the fallback for a whitespace-only message', () => {
      expect(friendlyError({ message: '   ' }, 'fallback')).toBe('fallback')
    })

    it('returns the fallback when the error has no message property', () => {
      expect(friendlyError({}, 'fallback')).toBe('fallback')
    })

    it('returns the fallback for a plain string error (no .message)', () => {
      expect(friendlyError('string error', 'fallback')).toBe('fallback')
    })

    it('returns the fallback when message is not a string', () => {
      expect(friendlyError({ message: 42 }, 'fallback')).toBe('fallback')
    })

    it('calls console.error when an error object is provided', () => {
      const err = { message: 'visible' }
      friendlyError(err, 'fallback')
      expect(errorSpy).toHaveBeenCalledWith(err)
    })

    it('swallows a console.error that throws so the returned message is still produced', () => {
      errorSpy.mockImplementation(() => { throw new Error('console broken') })
      expect(friendlyError({ message: 'visible' }, 'fallback')).toBe('visible')
    })
  })

  describe('length cap', () => {
    it('returns the fallback when the trimmed message exceeds 200 chars', () => {
      expect(friendlyError({ message: 'a'.repeat(201) }, 'fallback')).toBe('fallback')
    })

    it('passes through a 200-character message at the boundary', () => {
      const msg = 'a'.repeat(200)
      expect(friendlyError({ message: msg }, 'fallback')).toBe(msg)
    })

    it('trims surrounding whitespace before applying the length cap', () => {
      const msg = `  ${'a'.repeat(200)}  `
      expect(friendlyError({ message: msg }, 'fallback')).toBe('a'.repeat(200))
    })
  })

  describe('UNSAFE_PATTERNS regex allowlist', () => {
    const cases = [
      ['fetch failed', '/fetch/i'],
      ['Failed to fetch', '/fetch/i'],
      ['Edge Function returned a non-2xx response', '/edge function/i'],
      ['JWT expired', '/jwt/i'],
      ['database error: deadlock detected', '/database error/i'],
      ['row-level security violation', '/row.?level security/i'],
      ['row level security policy', '/row.?level security/i'],
      ['violates check constraint "foo"', '/violates.*constraint/i'],
      ['violates row-level security policy', '/violates.*policy/i'],
      ['violates foreign key constraint', '/violates.*foreign key/i'],
      ['AuthApiError: invalid credentials', 'AuthApiError'],
      ['PostgrestError: bad request', 'PostgrestError'],
      ['FunctionsError: deploy failed', 'FunctionsError'],
      ['FunctionsFetchError: network', 'FunctionsFetchError'],
      ['FunctionsHttpError: 500', 'FunctionsHttpError'],
      ['StorageApiError: file missing', 'StorageApiError'],
      ['NetworkError when attempting to fetch resource', 'NetworkError'],
      ['relation "workout_sessions" does not exist', '/relation .* does not exist/i'],
      ['column "bodyweight" does not exist', '/column .* does not exist/i'],
      ['function get_streak does not exist', '/function .* does not exist/i'],
      ['duplicate key value violates unique constraint', '/duplicate key/i'],
      ['CORS error: missing header', '/\\bCORS\\b/'],
      ['TypeError: x is undefined', 'TypeError'],
      ['SyntaxError: unexpected token', 'SyntaxError'],
      ['ReferenceError: foo is not defined', 'ReferenceError'],
      ['unexpected_failure', '/unexpected_failure/i'],
      ['supabase client not initialised', '/\\bsupabase\\b/i'],
      ['postgres connection refused', '/\\bpostgres(?:t)?\\b/i'],
      ['postgrest 401', '/\\bpostgres(?:t)?\\b/i'],
      ['invalid schema name', '/\\bschema\\b/i'],
      ['RLS denied', '/\\bRLS\\b/'],
    ]

    cases.forEach(([msg, label]) => {
      it(`falls back when message matches ${label}: ${JSON.stringify(msg)}`, () => {
        expect(friendlyError({ message: msg }, 'fallback')).toBe('fallback')
      })
    })
  })

  describe('safe messages', () => {
    it('returns a clean human-readable error message verbatim', () => {
      expect(friendlyError({ message: 'That username is already in use.' }, 'fallback'))
        .toBe('That username is already in use.')
    })

    it('returns a short message that does not match any UNSAFE_PATTERNS', () => {
      expect(friendlyError({ message: 'Please try again later.' }, 'fallback'))
        .toBe('Please try again later.')
    })

    it('trims trailing whitespace from a safe message before returning it', () => {
      expect(friendlyError({ message: '   safe message   ' }, 'fallback'))
        .toBe('safe message')
    })
  })
})
