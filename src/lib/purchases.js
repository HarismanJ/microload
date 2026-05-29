import { Capacitor } from '@capacitor/core'
import { Purchases, LOG_LEVEL } from '@revenuecat/purchases-capacitor'

// Replace with your platform-specific keys from the RevenueCat dashboard once live
const API_KEYS = {
  ios: 'test_oHxDkzsQVgEPLYwQCSgYgIoUybu',
  android: 'test_oHxDkzsQVgEPLYwQCSgYgIoUybu',
}

const ENTITLEMENT_ID = 'microload Pro'
const STORAGE_KEY = 'liftlog:premium'

// --- Persistence helpers ---
// Only ever written after a successful RC response, so the stored value
// always reflects the last verified entitlement state.

function loadPersistedPremium() {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

function persistPremium(value) {
  try {
    localStorage.setItem(STORAGE_KEY, String(value))
  } catch {
    // localStorage can be unavailable; keep the in-memory entitlement state.
  }
}

// --------------------------

let initialized = false
let pendingLogout = false

export function markIntentionalLogout() {
  pendingLogout = true
}

// Seed from localStorage immediately — never cold-start as false if we have
// a previously verified value. RC will correct it on the next successful call.
let cachedIsPremium = loadPersistedPremium()

function isActive(customerInfo) {
  return typeof customerInfo.entitlements.active[ENTITLEMENT_ID] !== 'undefined'
}

export async function initPurchases() {
  if (initialized || !Capacitor.isNativePlatform()) return
  const platform = Capacitor.getPlatform()
  const apiKey = API_KEYS[platform]
  if (!apiKey) return
  try {
    await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG })
    await Purchases.configure({ apiKey })
    initialized = true
    console.log('[RC] initialized ok')
    // Do NOT call refreshPremiumStatus() here — RC has no identified user yet,
    // so getCustomerInfo() returns anonymous entitlements (no premium) and would
    // overwrite a valid persisted state. loginUser(uid) in App.jsx runs next.
  } catch (e) {
    console.error('[RC] init failed', e)
    // Do NOT reset cachedIsPremium — keep the last persisted value.
  }
}

export async function loginUser(userId) {
  if (!initialized || !Capacitor.isNativePlatform() || !userId) return
  try {
    const { customerInfo } = await Purchases.logIn({ appUserID: userId })
    cachedIsPremium = isActive(customerInfo)
    persistPremium(cachedIsPremium)
  } catch (e) {
    // RC login failed — keep last known value, never downgrade on a failure
    console.warn('[RC] loginUser failed, keeping last known premium state', e)
  }
}

export async function logoutUser() {
  if (!pendingLogout) return
  pendingLogout = false
  if (!initialized || !Capacitor.isNativePlatform()) return
  try {
    await Purchases.logOut()
    cachedIsPremium = false
    persistPremium(false)
  } catch (e) {
    console.warn('[RC] logoutUser failed, keeping last known premium state', e)
  }
}

export async function refreshPremiumStatus() {
  if (!initialized || !Capacitor.isNativePlatform()) return cachedIsPremium
  try {
    const { customerInfo } = await Purchases.getCustomerInfo()
    cachedIsPremium = isActive(customerInfo)
    persistPremium(cachedIsPremium) // Only persist on a verified RC response
    return cachedIsPremium
  } catch (e) {
    // RC unreachable — return last known value without downgrading
    console.warn('[RC] getCustomerInfo failed, keeping last known premium state', e)
    return cachedIsPremium
  }
}

export function isPremiumSync() {
  return cachedIsPremium
}

export async function getOfferings() {
  console.log('[RC] getOfferings called, initialized:', initialized, 'native:', Capacitor.isNativePlatform())
  if (!initialized || !Capacitor.isNativePlatform()) return null
  try {
    const offerings = await Purchases.getOfferings()
    console.log('[RC] offerings.current:', offerings.current)
    return offerings.current
  } catch (e) {
    console.error('[RC] getOfferings failed', e)
    return null
  }
}

export async function purchasePackage(pkg) {
  const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg })
  cachedIsPremium = isActive(customerInfo)
  persistPremium(cachedIsPremium)
  return cachedIsPremium
}

export async function restorePurchases() {
  const { customerInfo } = await Purchases.restorePurchases()
  cachedIsPremium = isActive(customerInfo)
  persistPremium(cachedIsPremium)
  return cachedIsPremium
}
