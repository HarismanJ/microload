import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { isOlderThan, checkForceUpdate, openAppStore } from '../../lib/appVersion'
import { Capacitor } from '@capacitor/core'
import { App as CapApp } from '@capacitor/app'
import { AppLauncher } from '@capacitor/app-launcher'
import { supabase } from '../../lib/supabase'

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

// Chainable Supabase mock — checkForceUpdate calls:
//   supabase.from('app_config').select('value').eq('key', 'min_required_version').maybeSingle()
const supabaseChain = vi.hoisted(() => {
  const c = {}
  c.select = vi.fn(() => c)
  c.eq = vi.fn(() => c)
  c.maybeSingle = vi.fn(() => Promise.resolve({ data: null, error: null }))
  return c
})
vi.mock('../../lib/supabase', () => ({
  supabase: { from: vi.fn(() => supabaseChain) },
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

// ─── checkForceUpdate ───────────────────────────────────────────────────────

describe('checkForceUpdate', () => {
  beforeEach(() => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true)
    vi.mocked(CapApp.getInfo).mockResolvedValue({ version: '1.0.0', build: '1' })
    supabaseChain.maybeSingle.mockResolvedValue({ data: null, error: null })
  })

  it('returns { required: false } on web (non-native platform) without fetching', async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false)
    expect(await checkForceUpdate()).toEqual({ required: false })
    expect(CapApp.getInfo).not.toHaveBeenCalled()
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('returns { required: false } when Supabase returns an error', async () => {
    supabaseChain.maybeSingle.mockResolvedValue({ data: null, error: { message: 'db error' } })
    expect(await checkForceUpdate()).toEqual({ required: false })
  })

  it('returns { required: false } when Supabase returns no row (data: null)', async () => {
    supabaseChain.maybeSingle.mockResolvedValue({ data: null, error: null })
    expect(await checkForceUpdate()).toEqual({ required: false })
  })

  it('returns { required: false } when the row exists but value is empty/missing', async () => {
    supabaseChain.maybeSingle.mockResolvedValue({ data: { value: '' }, error: null })
    expect(await checkForceUpdate()).toEqual({ required: false })
  })

  it('returns { required: true } when the installed version is older than the min required version', async () => {
    vi.mocked(CapApp.getInfo).mockResolvedValue({ version: '1.0.0', build: '1' })
    supabaseChain.maybeSingle.mockResolvedValue({ data: { value: '2.0.0' }, error: null })
    expect(await checkForceUpdate()).toEqual({ required: true })
  })

  it('returns { required: false } when the installed version equals the min required version', async () => {
    vi.mocked(CapApp.getInfo).mockResolvedValue({ version: '2.0.0', build: '1' })
    supabaseChain.maybeSingle.mockResolvedValue({ data: { value: '2.0.0' }, error: null })
    expect(await checkForceUpdate()).toEqual({ required: false })
  })

  it('returns { required: false } when the installed version is newer than the min required version', async () => {
    vi.mocked(CapApp.getInfo).mockResolvedValue({ version: '3.0.0', build: '1' })
    supabaseChain.maybeSingle.mockResolvedValue({ data: { value: '2.0.0' }, error: null })
    expect(await checkForceUpdate()).toEqual({ required: false })
  })

  it('swallows a CapApp.getInfo throw and returns { required: false }', async () => {
    vi.mocked(CapApp.getInfo).mockRejectedValue(new Error('getInfo boom'))
    expect(await checkForceUpdate()).toEqual({ required: false })
  })

  it('swallows a Supabase throw and returns { required: false }', async () => {
    supabaseChain.maybeSingle.mockRejectedValue(new Error('supa boom'))
    expect(await checkForceUpdate()).toEqual({ required: false })
  })
})

// ─── openAppStore ───────────────────────────────────────────────────────────

describe('openAppStore', () => {
  let openSpy

  beforeEach(() => {
    vi.mocked(AppLauncher.openUrl).mockResolvedValue(undefined)
    openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
  })

  afterEach(() => {
    openSpy.mockRestore()
  })

  it('opens the App Store URL on iOS via AppLauncher', async () => {
    vi.mocked(Capacitor.getPlatform).mockReturnValue('ios')
    await openAppStore()
    expect(AppLauncher.openUrl).toHaveBeenCalledWith({
      url: expect.stringContaining('itms-apps://'),
    })
    expect(openSpy).not.toHaveBeenCalled()
  })

  it('opens the Play Store URL on Android via AppLauncher', async () => {
    vi.mocked(Capacitor.getPlatform).mockReturnValue('android')
    await openAppStore()
    expect(AppLauncher.openUrl).toHaveBeenCalledWith({
      url: expect.stringContaining('play.google.com'),
    })
    expect(openSpy).not.toHaveBeenCalled()
  })

  it('uses the Play Store URL as the fallback on web (non-ios, non-android)', async () => {
    vi.mocked(Capacitor.getPlatform).mockReturnValue('web')
    await openAppStore()
    expect(AppLauncher.openUrl).toHaveBeenCalledWith({
      url: expect.stringContaining('play.google.com'),
    })
  })

  it('falls back to window.open when AppLauncher.openUrl throws', async () => {
    vi.mocked(Capacitor.getPlatform).mockReturnValue('ios')
    vi.mocked(AppLauncher.openUrl).mockRejectedValueOnce(new Error('launch boom'))
    await openAppStore()
    expect(openSpy).toHaveBeenCalledWith(expect.stringContaining('itms-apps://'), '_blank')
  })
})
