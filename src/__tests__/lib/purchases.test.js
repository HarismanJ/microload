import { vi, describe, it, expect } from 'vitest'

const STORAGE_KEY = 'liftlog:premium'

// Customer info shapes returned by RevenueCat
const PREMIUM_CUSTOMER = { entitlements: { active: { 'microload Pro': {} } } }
const FREE_CUSTOMER    = { entitlements: { active: {} } }

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
})
