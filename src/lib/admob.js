import { Capacitor } from '@capacitor/core'
import { AdMob, InterstitialAdPluginEvents, RewardAdPluginEvents } from '@capacitor-community/admob'

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

// Switch to false only when submitting to the stores with a published app
const IS_TESTING = true

let initialized = false

async function removeListener(listenerPromise) {
  try {
    const handle = await listenerPromise
    await handle?.remove?.()
  } catch {
    // Listener cleanup should never block the app flow.
  }
}

export async function initAdMob() {
  if (initialized || !Capacitor.isNativePlatform()) return
  try {
    await AdMob.initialize()
    initialized = true
  } catch {
    // ignore init failure
  }
}

export async function showWorkoutCompleteAd() {
  if (!Capacitor.isNativePlatform()) return

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
