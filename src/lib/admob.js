import { Capacitor } from '@capacitor/core'
import {
  AdMob,
  AdmobConsentStatus,
  InterstitialAdPluginEvents,
  RewardAdPluginEvents,
} from '@capacitor-community/admob'

const AD_UNIT_IDS = {
  interstitial: {
    ios: 'ca-app-pub-3231054512035908/4643392554',
    android: 'ca-app-pub-3231054512035908/6231806394',
  },
  rewarded: {
    ios: 'ca-app-pub-3231054512035908/1280074065',
    android: 'ca-app-pub-3231054512035908/6108517468',
  },
}

const TEST_AD_UNIT_IDS = {
  interstitial: {
    ios: 'ca-app-pub-3940256099942544/4411468910',
    android: 'ca-app-pub-3940256099942544/1033173712',
  },
  rewarded: {
    ios: 'ca-app-pub-3940256099942544/1712485313',
    android: 'ca-app-pub-3940256099942544/5224354917',
  },
}

// Test ads in dev (vite dev, vitest), real ads in production builds (vite build → Capacitor).
// Never hardcode true here — see Google's invalid-traffic policy on clicking your own ads.
const IS_TESTING = import.meta.env.DEV

let initialized = false
// Defaults to true so we never block ad serving while the consent SDK is reachable.
// The consent flow below overwrites this based on the user's GDPR/UMP decision.
let canRequestAds = true

async function removeListener(listenerPromise) {
  try {
    const handle = await listenerPromise
    await handle?.remove?.()
  } catch {
    // Listener cleanup should never block the app flow.
  }
}

// iOS App Tracking Transparency: must run before AdMob accesses IDFA.
// No-op on Android. Failure is non-fatal — we fall back to non-personalized ads.
async function requestAttIfNeeded() {
  if (Capacitor.getPlatform() !== 'ios') return
  try {
    const { status } = await AdMob.trackingAuthorizationStatus()
    if (status === 'notDetermined') {
      await AdMob.requestTrackingAuthorization()
    }
  } catch {
    // Continue without ATT — AdMob will serve non-personalized ads.
  }
}

// Google UMP (User Messaging Platform) consent flow — required to serve
// personalized ads to EU/UK/EEA users. Outside those regions, status comes
// back NOT_REQUIRED and we skip the form.
async function runConsentFlow() {
  try {
    const info = await AdMob.requestConsentInfo({ tagForUnderAgeOfConsent: false })
    if (info.status === AdmobConsentStatus.REQUIRED && info.isConsentFormAvailable) {
      const after = await AdMob.showConsentForm()
      canRequestAds = after.canRequestAds !== false
    } else {
      canRequestAds = info.canRequestAds !== false
    }
  } catch {
    // Consent SDK failed — leave canRequestAds at its optimistic default.
    // AdMob will fall back to non-personalized ads if it can't determine consent.
  }
}

export async function initAdMob() {
  if (initialized || !Capacitor.isNativePlatform()) return
  try {
    await requestAttIfNeeded()
    await runConsentFlow()
    await AdMob.initialize({ tagForUnderAgeOfConsent: false })
    initialized = true
  } catch {
    // ignore init failure
  }
}

// Returns true when the user is in a region that requires a privacy-options
// entry point (EU/EEA). Use this to conditionally render the "Manage Ad
// Consent" button — Google explicitly recommends hiding it when not required.
export async function hasAdPrivacyOptions() {
  if (!Capacitor.isNativePlatform()) return false
  try {
    const info = await AdMob.requestConsentInfo({ tagForUnderAgeOfConsent: false })
    return info.privacyOptionsRequirementStatus === 'REQUIRED'
  } catch {
    return false
  }
}

// Show the GDPR privacy options form so EU users can change their consent
// after the initial choice. Call this from a Profile-screen settings button.
export async function showAdPrivacyOptions() {
  if (!Capacitor.isNativePlatform()) return
  try {
    await AdMob.showPrivacyOptionsForm()
    const info = await AdMob.requestConsentInfo({ tagForUnderAgeOfConsent: false })
    canRequestAds = info.canRequestAds !== false
  } catch {
    // ignore
  }
}

export async function showWorkoutCompleteAd() {
  if (!Capacitor.isNativePlatform()) return
  if (!canRequestAds) return // GDPR consent denied or unavailable

  const platform = Capacitor.getPlatform()
  const adId = IS_TESTING ? TEST_AD_UNIT_IDS.interstitial[platform] : AD_UNIT_IDS.interstitial[platform]
  if (!adId) return

  try {
    // Hang point 1: prepareInterstitial can stall if the SDK is unresponsive (no network,
    // frequency cap, init race). Race it against a 15s timeout so it can never block the
    // spinner permanently. Always clear the timer to avoid a dangling timeout on success.
    let prepareTimerId
    try {
      await Promise.race([
        AdMob.prepareInterstitial({ adId }),
        new Promise((_, reject) => {
          prepareTimerId = setTimeout(() => reject(new Error('Ad prepare timeout')), 15_000)
        }),
      ])
    } finally {
      clearTimeout(prepareTimerId)
    }

    await new Promise((resolve) => {
      let settled = false
      const listeners = []

      const finish = () => {
        if (settled) return
        settled = true
        clearTimeout(fallbackId)
        // Unblock the outer Promise immediately — don't wait for listener cleanup.
        resolve()
        // Clean up listeners best-effort in the background.
        Promise.all(listeners.map(removeListener)).catch(() => {})
      }

      listeners.push(AdMob.addListener(InterstitialAdPluginEvents.Dismissed, finish))
      // Hang point 2: FailedToShow fires when showInterstitial() resolves successfully but
      // the ad fails mid-display. Without this listener the Promise would hang because
      // showInterstitial() doesn't reject in that case.
      listeners.push(AdMob.addListener(InterstitialAdPluginEvents.FailedToShow, finish))
      AdMob.showInterstitial().catch(finish)

      // Last-resort safety net: if neither event fires (OS kill, app backgrounded mid-ad,
      // SDK bug), unblock after 45s so the spinner is never permanently stuck.
      const fallbackId = setTimeout(finish, 45_000)
    })
  } catch {
    // Ad failed to load or timed out — silently continue to summary
  }
}

// Returns true if the user watched enough to earn the reward, false if they skipped or ad failed
export async function showRewardedAd() {
  if (!Capacitor.isNativePlatform()) return false
  if (!canRequestAds) return false // GDPR consent denied or unavailable

  const platform = Capacitor.getPlatform()
  const adId = IS_TESTING ? TEST_AD_UNIT_IDS.rewarded[platform] : AD_UNIT_IDS.rewarded[platform]
  if (!adId) return false

  try {
    // Same prepare-stall guard as showWorkoutCompleteAd.
    let prepareTimerId
    try {
      await Promise.race([
        AdMob.prepareRewardVideoAd({ adId }),
        new Promise((_, reject) => {
          prepareTimerId = setTimeout(() => reject(new Error('Ad prepare timeout')), 15_000)
        }),
      ])
    } finally {
      clearTimeout(prepareTimerId)
    }

    return await new Promise((resolve) => {
      let rewarded = false
      let settled = false
      const listeners = []

      const finish = (result) => {
        if (settled) return
        settled = true
        clearTimeout(fallbackId)
        // Unblock immediately — don't wait for listener cleanup.
        resolve(result)
        // Clean up listeners best-effort in the background.
        Promise.all(listeners.map(removeListener)).catch(() => {})
      }

      listeners.push(AdMob.addListener(RewardAdPluginEvents.Rewarded, () => {
        rewarded = true
      }))
      listeners.push(AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
        finish(rewarded)
      }))
      // FailedToShow fires when showRewardVideoAd() resolves but the ad fails mid-display.
      listeners.push(AdMob.addListener(RewardAdPluginEvents.FailedToShow, () => {
        finish(false)
      }))
      AdMob.showRewardVideoAd().catch(() => finish(false))

      // Last-resort safety net. Return rewarded rather than hardcoding false: if the
      // Rewarded event already fired before the timeout hit, the user earned the reward.
      const fallbackId = setTimeout(() => finish(rewarded), 45_000)
    })
  } catch {
    return false
  }
}
