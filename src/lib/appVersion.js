import { Capacitor } from '@capacitor/core'
import { App as CapApp } from '@capacitor/app'
import { AppLauncher } from '@capacitor/app-launcher'
import { supabase } from './supabase'

// ⚠️ Fill these in once the app is live in the stores
const IOS_APP_STORE_URL = 'itms-apps://itunes.apple.com/app/id000000000' // replace with real App Store ID
const ANDROID_PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.harisman.microload'

/**
 * Returns true if version string `a` is strictly older than version string `b`.
 * Compares each dot-segment as an integer. Non-numeric or missing segments
 * are treated as 0 so malformed config never causes a false block.
 * e.g. isOlderThan('1.0.0', '1.1.0') → true
 *      isOlderThan('1.1.0', '1.0.0') → false
 *      isOlderThan('1.0.0', '1.0.0') → false
 *      isOlderThan('1.2.0-beta', '1.2.0') → false (NaN → 0, equal)
 */
export function isOlderThan(a, b) {
  const parseSegment = s => {
    const n = parseInt(s, 10)
    return Number.isFinite(n) ? n : 0
  }
  const ap = String(a).split('.').map(parseSegment)
  const bp = String(b).split('.').map(parseSegment)
  for (let i = 0; i < Math.max(ap.length, bp.length); i++) {
    const av = ap[i] ?? 0
    const bv = bp[i] ?? 0
    if (av < bv) return true
    if (av > bv) return false
  }
  return false
}

/**
 * Checks whether the installed native app version is below the minimum
 * version required by the backend.
 *
 * Safety rules:
 * - Always { required: false } on web
 * - Always { required: false } on any error, missing config, or invalid semver
 * - Caller applies a 5-second timeout with a `settled` flag; any result that
 *   arrives after the timeout is discarded by the caller, not here.
 */
export async function checkForceUpdate() {
  if (!Capacitor.isNativePlatform()) return { required: false }

  try {
    const [info, { data, error }] = await Promise.all([
      CapApp.getInfo(),
      supabase.from('app_config').select('value').eq('key', 'min_required_version').maybeSingle()
    ])

    if (error || !data?.value) return { required: false }

    return { required: isOlderThan(info.version, data.value) }
  } catch {
    return { required: false }
  }
}

/**
 * Opens the appropriate app store for the current platform using the
 * official Capacitor AppLauncher API.
 */
export async function openAppStore() {
  const platform = Capacitor.getPlatform()
  const url = platform === 'ios' ? IOS_APP_STORE_URL : ANDROID_PLAY_STORE_URL
  try {
    await AppLauncher.openUrl({ url })
  } catch {
    // Fallback: should not be needed but avoids a dead button on unexpected errors
    window.open(url, '_blank')
  }
}
