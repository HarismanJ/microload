import { beforeEach, vi, describe, it, expect } from 'vitest'

const STORAGE_KEY = 'liftlog:premium'
const supabaseRpcMock = vi.hoisted(() => vi.fn(() => Promise.resolve({ data: false, error: null })))

vi.mock('../../lib/supabase.js', () => ({
  supabase: {
    rpc: supabaseRpcMock,
  },
}))

// Customer info shapes returned by RevenueCat
const PREMIUM_CUSTOMER = { entitlements: { active: { 'microload Pro': {} } } }
const FREE_CUSTOMER    = { entitlements: { active: {} } }

beforeEach(() => {
  supabaseRpcMock.mockReset()
  supabaseRpcMock.mockResolvedValue({ data: false, error: null })
})

// ---------------------------------------------------------------------------
// Helper: fresh module instance
//
// purchases.js has module-level state (cachedIsPremium, initialized). We use
// vi.resetModules() + dynamic import before each test so that state never
// leaks between tests. After reset the vi.mock factories in setup.js still
// apply, but each import produces a new mock instance — so we re-import
// @capacitor/core and @revenuecat/purchases-capacitor too, then wire up any
// implementation overrides we need before running the function under test.
// ---------------------------------------------------------------------------

async function loadFreshModule() {
  vi.resetModules()
  const capsMod = await import('@capacitor/core')
  const rcMod   = await import('@revenuecat/purchases-capacitor')
  const mod     = await import('../../lib/purchases.js')
  return { mod, Capacitor: capsMod.Capacitor, Purchases: rcMod.Purchases }
}

// Shorthand: load the module as if running on a native platform and fully
// initialise RevenueCat (sets initialized = true inside the module).
async function loadInitialised({ premiumInStorage = false } = {}) {
  if (premiumInStorage) localStorage.setItem(STORAGE_KEY, 'true')

  const { mod, Capacitor, Purchases } = await loadFreshModule()

  vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true)
  vi.mocked(Capacitor.getPlatform).mockReturnValue('ios')
  vi.mocked(Purchases.configure).mockResolvedValue(undefined)
  vi.mocked(Purchases.setLogLevel).mockResolvedValue(undefined)
  // Default: getCustomerInfo returns free so initPurchases doesn't inadvertently
  // flip premium. Individual tests override this as needed.
  vi.mocked(Purchases.getCustomerInfo).mockResolvedValue({ customerInfo: FREE_CUSTOMER })

  await mod.initPurchases()

  return { mod, Capacitor, Purchases }
}

// ---------------------------------------------------------------------------
// 1. Cold-start: module-level initialisation from localStorage
// ---------------------------------------------------------------------------

describe('cold start — module-level initialisation', () => {
  it('returns false when localStorage has no stored value', async () => {
    // localStorage is cleared by setup.js beforeEach
    const { mod } = await loadFreshModule()
    expect(mod.isPremiumSync()).toBe(false)
  })

  it('returns true when localStorage contains "true"', async () => {
    localStorage.setItem(STORAGE_KEY, 'true')
    const { mod } = await loadFreshModule()
    expect(mod.isPremiumSync()).toBe(true)
  })

  it('returns false when localStorage contains "false"', async () => {
    localStorage.setItem(STORAGE_KEY, 'false')
    const { mod } = await loadFreshModule()
    expect(mod.isPremiumSync()).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// 2. refreshPremiumStatus
// ---------------------------------------------------------------------------

describe('refreshPremiumStatus', () => {
  it('writes "true" to localStorage and returns true when RC confirms premium', async () => {
    const { mod, Purchases } = await loadInitialised()
    vi.mocked(Purchases.getCustomerInfo).mockResolvedValueOnce({ customerInfo: PREMIUM_CUSTOMER })

    const result = await mod.refreshPremiumStatus()

    expect(result).toBe(true)
    expect(mod.isPremiumSync()).toBe(true)
    expect(localStorage.getItem(STORAGE_KEY)).toBe('true')
  })

  it('writes "false" to localStorage and returns false when RC confirms free', async () => {
    const { mod, Purchases } = await loadInitialised({ premiumInStorage: true })
    vi.mocked(Purchases.getCustomerInfo).mockResolvedValueOnce({ customerInfo: FREE_CUSTOMER })

    const result = await mod.refreshPremiumStatus()

    expect(result).toBe(false)
    expect(mod.isPremiumSync()).toBe(false)
    expect(localStorage.getItem(STORAGE_KEY)).toBe('false')
  })

  it('does NOT downgrade and does NOT write to localStorage when RC throws', async () => {
    // Establish premium via a successful call first
    const { mod, Purchases } = await loadInitialised()
    vi.mocked(Purchases.getCustomerInfo).mockResolvedValueOnce({ customerInfo: PREMIUM_CUSTOMER })
    await mod.refreshPremiumStatus()

    const writesBefore = localStorage.setItem.mock.calls.length

    // RC now fails
    vi.mocked(Purchases.getCustomerInfo).mockRejectedValueOnce(new Error('network'))
    const result = await mod.refreshPremiumStatus()

    expect(result).toBe(true)                                 // unchanged
    expect(mod.isPremiumSync()).toBe(true)                    // unchanged
    expect(localStorage.setItem.mock.calls.length).toBe(writesBefore) // no new write
  })

  it('returns cachedIsPremium without throwing when not on native platform', async () => {
    // Non-native: Capacitor.isNativePlatform() returns false (setup.js default)
    localStorage.setItem(STORAGE_KEY, 'true')
    const { mod } = await loadFreshModule() // not initialised — non-native

    const result = await mod.refreshPremiumStatus()

    expect(result).toBe(true) // returns persisted value, no RC call
  })

  it('returns true when RevenueCat is free but the Supabase override is enabled', async () => {
    const { mod, Purchases } = await loadInitialised()
    vi.mocked(Purchases.getCustomerInfo).mockResolvedValueOnce({ customerInfo: FREE_CUSTOMER })
    supabaseRpcMock.mockResolvedValueOnce({ data: true, error: null })

    const result = await mod.refreshPremiumStatus()

    expect(result).toBe(true)
    expect(mod.isPremiumSync()).toBe(true)
    expect(localStorage.getItem(STORAGE_KEY)).toBe('true')
    expect(supabaseRpcMock).toHaveBeenCalledWith('has_premium_override')
  })

  it('returns true when RevenueCat is premium even if the Supabase override is disabled', async () => {
    const { mod, Purchases } = await loadInitialised()
    vi.mocked(Purchases.getCustomerInfo).mockResolvedValueOnce({ customerInfo: PREMIUM_CUSTOMER })
    supabaseRpcMock.mockResolvedValueOnce({ data: false, error: null })

    const result = await mod.refreshPremiumStatus()

    expect(result).toBe(true)
    expect(mod.isPremiumSync()).toBe(true)
    expect(localStorage.getItem(STORAGE_KEY)).toBe('true')
  })

  it('does NOT downgrade an existing premium cache when the override RPC fails', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const { mod, Purchases } = await loadInitialised()
      vi.mocked(Purchases.getCustomerInfo).mockResolvedValueOnce({ customerInfo: PREMIUM_CUSTOMER })
      await mod.refreshPremiumStatus()
      expect(mod.isPremiumSync()).toBe(true)

      vi.mocked(Purchases.getCustomerInfo).mockResolvedValueOnce({ customerInfo: FREE_CUSTOMER })
      supabaseRpcMock.mockResolvedValueOnce({ data: null, error: new Error('permission denied') })

      const result = await mod.refreshPremiumStatus()

      expect(result).toBe(true)
      expect(mod.isPremiumSync()).toBe(true)
      expect(localStorage.getItem(STORAGE_KEY)).toBe('true')
      expect(warnSpy).toHaveBeenCalled()
    } finally {
      warnSpy.mockRestore()
    }
  })

  it('can activate premium from the Supabase override on web', async () => {
    const { mod, Capacitor, Purchases } = await loadFreshModule()
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false)
    supabaseRpcMock.mockResolvedValueOnce({ data: true, error: null })

    const result = await mod.refreshPremiumStatus()

    expect(result).toBe(true)
    expect(mod.isPremiumSync()).toBe(true)
    expect(localStorage.getItem(STORAGE_KEY)).toBe('true')
    expect(Purchases.getCustomerInfo).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// 3. loginUser
// ---------------------------------------------------------------------------

describe('loginUser', () => {
  it('persists "true" when RC login confirms premium', async () => {
    const { mod, Purchases } = await loadInitialised()
    vi.mocked(Purchases.logIn).mockResolvedValueOnce({ customerInfo: PREMIUM_CUSTOMER, created: false })

    await mod.loginUser('user-abc')

    expect(mod.isPremiumSync()).toBe(true)
    expect(localStorage.getItem(STORAGE_KEY)).toBe('true')
  })

  it('persists "false" when RC login confirms free', async () => {
    const { mod, Purchases } = await loadInitialised({ premiumInStorage: true })
    vi.mocked(Purchases.logIn).mockResolvedValueOnce({ customerInfo: FREE_CUSTOMER, created: false })

    await mod.loginUser('user-abc')

    expect(mod.isPremiumSync()).toBe(false)
    expect(localStorage.getItem(STORAGE_KEY)).toBe('false')
  })

  it('does NOT downgrade and does NOT write to localStorage when RC login throws', async () => {
    const { mod, Purchases } = await loadInitialised()
    // Establish premium first
    vi.mocked(Purchases.getCustomerInfo).mockResolvedValueOnce({ customerInfo: PREMIUM_CUSTOMER })
    await mod.refreshPremiumStatus()

    const writesBefore = localStorage.setItem.mock.calls.length
    vi.mocked(Purchases.logIn).mockRejectedValueOnce(new Error('timeout'))

    await mod.loginUser('user-abc')

    expect(mod.isPremiumSync()).toBe(true)
    expect(localStorage.setItem.mock.calls.length).toBe(writesBefore)
  })

  it('checks the Supabase override even when RevenueCat is not initialized', async () => {
    const { mod, Purchases } = await loadFreshModule()
    supabaseRpcMock.mockResolvedValueOnce({ data: true, error: null })

    await mod.loginUser('user-abc')

    expect(mod.isPremiumSync()).toBe(true)
    expect(localStorage.getItem(STORAGE_KEY)).toBe('true')
    expect(supabaseRpcMock).toHaveBeenCalledWith('has_premium_override')
    expect(Purchases.logIn).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// 4. logoutUser
// ---------------------------------------------------------------------------

describe('logoutUser', () => {
  it('clears isPremiumSync and writes "false" to localStorage when intentional', async () => {
    const { mod, Purchases } = await loadInitialised()
    vi.mocked(Purchases.getCustomerInfo).mockResolvedValueOnce({ customerInfo: PREMIUM_CUSTOMER })
    await mod.refreshPremiumStatus()
    expect(mod.isPremiumSync()).toBe(true)

    mod.markIntentionalLogout()
    await mod.logoutUser()

    expect(mod.isPremiumSync()).toBe(false)
    expect(localStorage.getItem(STORAGE_KEY)).toBe('false')
  })

  it('is a no-op when markIntentionalLogout was not called first', async () => {
    const { mod, Purchases } = await loadInitialised()
    vi.mocked(Purchases.getCustomerInfo).mockResolvedValueOnce({ customerInfo: PREMIUM_CUSTOMER })
    await mod.refreshPremiumStatus()
    expect(mod.isPremiumSync()).toBe(true)

    await mod.logoutUser() // no markIntentionalLogout() call

    expect(mod.isPremiumSync()).toBe(true) // premium preserved
    expect(Purchases.logOut).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// 5. purchasePackage
// ---------------------------------------------------------------------------

describe('purchasePackage', () => {
  it('persists "true" after a successful purchase', async () => {
    const { mod, Purchases } = await loadInitialised()
    vi.mocked(Purchases.purchasePackage).mockResolvedValueOnce({ customerInfo: PREMIUM_CUSTOMER })

    const result = await mod.purchasePackage({ identifier: 'annual' })

    expect(result).toBe(true)
    expect(mod.isPremiumSync()).toBe(true)
    expect(localStorage.getItem(STORAGE_KEY)).toBe('true')
  })

  it('preserves premium when purchase returns free but the Supabase override is enabled', async () => {
    const { mod, Purchases } = await loadInitialised()
    vi.mocked(Purchases.purchasePackage).mockResolvedValueOnce({ customerInfo: FREE_CUSTOMER })
    supabaseRpcMock.mockResolvedValueOnce({ data: true, error: null })

    const result = await mod.purchasePackage({ identifier: 'annual' })

    expect(result).toBe(true)
    expect(mod.isPremiumSync()).toBe(true)
    expect(localStorage.getItem(STORAGE_KEY)).toBe('true')
  })
})

// ---------------------------------------------------------------------------
// 6. restorePurchases
// ---------------------------------------------------------------------------

describe('restorePurchases', () => {
  it('persists "true" after a successful restore', async () => {
    const { mod, Purchases } = await loadInitialised()
    vi.mocked(Purchases.restorePurchases).mockResolvedValueOnce({ customerInfo: PREMIUM_CUSTOMER })

    const result = await mod.restorePurchases()

    expect(result).toBe(true)
    expect(mod.isPremiumSync()).toBe(true)
    expect(localStorage.getItem(STORAGE_KEY)).toBe('true')
  })

  it('persists "false" when restore finds no active subscription', async () => {
    const { mod, Purchases } = await loadInitialised({ premiumInStorage: true })
    vi.mocked(Purchases.restorePurchases).mockResolvedValueOnce({ customerInfo: FREE_CUSTOMER })

    const result = await mod.restorePurchases()

    expect(result).toBe(false)
    expect(mod.isPremiumSync()).toBe(false)
    expect(localStorage.getItem(STORAGE_KEY)).toBe('false')
  })

  it('preserves premium when restore finds no active subscription but the Supabase override is enabled', async () => {
    const { mod, Purchases } = await loadInitialised()
    vi.mocked(Purchases.restorePurchases).mockResolvedValueOnce({ customerInfo: FREE_CUSTOMER })
    supabaseRpcMock.mockResolvedValueOnce({ data: true, error: null })

    const result = await mod.restorePurchases()

    expect(result).toBe(true)
    expect(mod.isPremiumSync()).toBe(true)
    expect(localStorage.getItem(STORAGE_KEY)).toBe('true')
  })
})

// ---------------------------------------------------------------------------
// 7. localStorage failure paths (catch blocks in loadPersistedPremium / persistPremium)
// ---------------------------------------------------------------------------

describe('localStorage failure paths', () => {
  it('falls back to false when localStorage.getItem throws at module load', async () => {
    const originalGetItem = localStorage.getItem
    vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
      throw new Error('storage locked')
    })

    try {
      const { mod } = await loadFreshModule()
      expect(mod.isPremiumSync()).toBe(false)
    } finally {
      localStorage.getItem = originalGetItem
    }
  })

  it('keeps the in-memory premium state when localStorage.setItem throws on persist', async () => {
    const { mod, Purchases } = await loadInitialised()
    vi.mocked(Purchases.getCustomerInfo).mockResolvedValueOnce({ customerInfo: PREMIUM_CUSTOMER })

    vi.spyOn(localStorage, 'setItem').mockImplementationOnce(() => {
      throw new Error('quota exceeded')
    })

    const result = await mod.refreshPremiumStatus()

    // The persist call swallowed the error; the in-memory cache still updated
    expect(result).toBe(true)
    expect(mod.isPremiumSync()).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// 8. initPurchases error catch
// ---------------------------------------------------------------------------

describe('initPurchases error catch', () => {
  it('swallows a Purchases.configure rejection and leaves initialized=false', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const { mod, Capacitor, Purchases } = await loadFreshModule()
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true)
      vi.mocked(Capacitor.getPlatform).mockReturnValue('ios')
      vi.mocked(Purchases.setLogLevel).mockResolvedValue(undefined)
      vi.mocked(Purchases.configure).mockRejectedValueOnce(new Error('init boom'))

      await expect(mod.initPurchases()).resolves.toBeUndefined()

      // After a failed init, subsequent native-only methods should still be no-op
      // because initialized never flipped true.
      expect(await mod.getOfferings()).toBeNull()
      expect(Purchases.getOfferings).not.toHaveBeenCalled()
      expect(errorSpy).toHaveBeenCalled()
    } finally {
      errorSpy.mockRestore()
    }
  })

  it('is a no-op on web (non-native platform)', async () => {
    const { mod, Capacitor, Purchases } = await loadFreshModule()
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false)

    await mod.initPurchases()

    expect(Purchases.configure).not.toHaveBeenCalled()
  })

  it('is a no-op when no API key exists for the current platform', async () => {
    const { mod, Capacitor, Purchases } = await loadFreshModule()
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true)
    vi.mocked(Capacitor.getPlatform).mockReturnValue('windows') // no entry in API_KEYS

    await mod.initPurchases()

    expect(Purchases.configure).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// 9. logoutUser error catch
// ---------------------------------------------------------------------------

describe('logoutUser error catch', () => {
  it('swallows a Purchases.logOut rejection without downgrading the cached premium state', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const { mod, Purchases } = await loadInitialised()
      // Establish premium first
      vi.mocked(Purchases.getCustomerInfo).mockResolvedValueOnce({ customerInfo: PREMIUM_CUSTOMER })
      await mod.refreshPremiumStatus()
      expect(mod.isPremiumSync()).toBe(true)

      vi.mocked(Purchases.logOut).mockRejectedValueOnce(new Error('logout boom'))
      mod.markIntentionalLogout()
      await expect(mod.logoutUser()).resolves.toBeUndefined()

      // Cached value preserved; localStorage not flipped to "false"
      expect(mod.isPremiumSync()).toBe(true)
      expect(warnSpy).toHaveBeenCalled()
    } finally {
      warnSpy.mockRestore()
    }
  })
})

// ---------------------------------------------------------------------------
// 10. getOfferings
// ---------------------------------------------------------------------------

describe('getOfferings', () => {
  it('returns null when not initialized', async () => {
    const { mod, Purchases } = await loadFreshModule()
    // Module is fresh; initPurchases was never called → initialized=false
    expect(await mod.getOfferings()).toBeNull()
    expect(Purchases.getOfferings).not.toHaveBeenCalled()
  })

  it('returns null on web (non-native), even if initialized would otherwise pass', async () => {
    const { mod, Capacitor, Purchases } = await loadFreshModule()
    // Even if a prior init managed to flip initialized in another scenario, the
    // !isNativePlatform check blocks the call. Simulate by stubbing isNativePlatform.
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false)
    expect(await mod.getOfferings()).toBeNull()
    expect(Purchases.getOfferings).not.toHaveBeenCalled()
  })

  it('returns offerings.current when initialized + native + Purchases.getOfferings succeeds', async () => {
    const { mod, Purchases } = await loadInitialised()
    const currentOffering = { identifier: 'pro_monthly', packages: [] }
    vi.mocked(Purchases.getOfferings).mockResolvedValueOnce({ current: currentOffering })

    const result = await mod.getOfferings()
    expect(result).toBe(currentOffering)
    expect(Purchases.getOfferings).toHaveBeenCalled()
  })

  it('returns null when Purchases.getOfferings throws', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const { mod, Purchases } = await loadInitialised()
      vi.mocked(Purchases.getOfferings).mockRejectedValueOnce(new Error('rc unreachable'))

      const result = await mod.getOfferings()
      expect(result).toBeNull()
      expect(errorSpy).toHaveBeenCalled()
    } finally {
      errorSpy.mockRestore()
    }
  })
})
