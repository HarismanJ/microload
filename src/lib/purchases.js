import { Capacitor } from '@capacitor/core'
import { Purchases, LOG_LEVEL } from '@revenuecat/purchases-capacitor'
import { supabase } from './supabase'

// Production RevenueCat public app-specific API keys (one per platform per project).
// Same key serves sandbox + production — RC routes to the right environment automatically.
const API_KEYS = {
  ios: 'appl_ZcArEsEMxXUaLFzThfBRCSYPpvp',
  android: 'goog_dLZSGBLaGJTszgCRtoUYCZkgZAJ',
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

function resolvePremiumStatus(revenueCatActive, overrideActive) {
  if (revenueCatActive === true || overrideActive === true) {
    cachedIsPremium = true
    persistPremium(true)
    return true
  }

  if (revenueCatActive === false && overrideActive === false) {
    cachedIsPremium = false
    persistPremium(false)
    return false
  }

  return cachedIsPremium
}

async function fetchPremiumOverrideStatus() {
  try {
    const { data, error } = await supabase.rpc('has_premium_override')
    if (error) throw error
    return data === true
  } catch (e) {
    console.warn('[Premium] override check failed, keeping last known premium state', e)
    return null
  }
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
  if (!userId) return

  const overrideActive = await fetchPremiumOverrideStatus()
  if (!initialized || !Capacitor.isNativePlatform()) {
    resolvePremiumStatus(null, overrideActive)
    return
  }

  try {
    const { customerInfo } = await Purchases.logIn({ appUserID: userId })
    resolvePremiumStatus(isActive(customerInfo), overrideActive)
  } catch (e) {
    // RC login failed — keep last known value, never downgrade on a failure
    console.warn('[RC] loginUser failed, keeping last known premium state', e)
    resolvePremiumStatus(null, overrideActive)
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
  const overrideActive = await fetchPremiumOverrideStatus()
  if (!initialized || !Capacitor.isNativePlatform()) {
    return resolvePremiumStatus(null, overrideActive)
  }

  try {
    const { customerInfo } = await Purchases.getCustomerInfo()
    return resolvePremiumStatus(isActive(customerInfo), overrideActive)
  } catch (e) {
    // RC unreachable — return last known value without downgrading
    console.warn('[RC] getCustomerInfo failed, keeping last known premium state', e)
    return resolvePremiumStatus(null, overrideActive)
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
  const overrideActive = await fetchPremiumOverrideStatus()
  const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg })
  return resolvePremiumStatus(isActive(customerInfo), overrideActive)
}

export async function restorePurchases() {
  const overrideActive = await fetchPremiumOverrideStatus()
  const { customerInfo } = await Purchases.restorePurchases()
  return resolvePremiumStatus(isActive(customerInfo), overrideActive)
}
