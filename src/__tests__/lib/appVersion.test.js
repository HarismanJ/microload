import { describe, it, expect, vi } from 'vitest'
import { isOlderThan } from '../../lib/appVersion'

// Mock Capacitor packages — appVersion.js imports these at module level
vi.mock('@capacitor/app-launcher', () => ({
  AppLauncher: { openUrl: vi.fn(() => Promise.resolve()) },
}))
vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: vi.fn(() => false), getPlatform: vi.fn(() => 'web') },
}))
vi.mock('@capacitor/app', () => ({
  App: { getInfo: vi.fn(() => Promise.resolve({ version: '1.0.0', build: '1' })) },
}))

describe('isOlderThan', () => {
  it('returns true when installed is behind on minor', () => {
    expect(isOlderThan('1.0.0', '1.1.0')).toBe(true)
  })
  it('returns true when installed is behind on major', () => {
    expect(isOlderThan('1.5.0', '2.0.0')).toBe(true)
  })
  it('returns true when installed is behind on patch', () => {
    expect(isOlderThan('1.0.0', '1.0.1')).toBe(true)
  })
  it('returns false when installed equals minimum', () => {
    expect(isOlderThan('1.2.0', '1.2.0')).toBe(false)
  })
  it('returns false when installed is ahead', () => {
    expect(isOlderThan('2.0.0', '1.9.9')).toBe(false)
  })
  it('treats missing patch segment as 0', () => {
    expect(isOlderThan('1.2', '1.2.0')).toBe(false)
    expect(isOlderThan('1.2', '1.2.1')).toBe(true)
  })
  it('handles pre-release suffix without throwing (NaN → 0)', () => {
    // '1.2.0-beta' → last segment parseInt('0-beta') = 0 → equals '1.2.0'
    expect(isOlderThan('1.2.0-beta', '1.2.0')).toBe(false)
    expect(isOlderThan('1.2.0-beta', '1.2.1')).toBe(true)
  })
  it('handles completely invalid strings without throwing', () => {
    expect(isOlderThan('invalid', '1.0.0')).toBe(true)   // 0.0.0 < 1.0.0
    expect(isOlderThan('1.0.0', 'invalid')).toBe(false)  // 1.0.0 > 0.0.0
    expect(isOlderThan('bad', 'also-bad')).toBe(false)   // 0 == 0
  })
})
