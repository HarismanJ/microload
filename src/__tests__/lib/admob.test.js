import { Capacitor } from '@capacitor/core'

const EVENTS = {
  interstitialDismissed: 'interstitialDismissed',
  interstitialFailedToShow: 'interstitialFailedToShow',
  rewarded: 'rewarded',
  rewardDismissed: 'rewardDismissed',
  rewardFailedToShow: 'rewardFailedToShow',
}

async function loadAdMobModule(overrides = {}) {
  vi.resetModules()
  vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true)
  vi.mocked(Capacitor.getPlatform).mockReturnValue('ios')

  const handlers = new Map()
  const removeFns = []
  const AdMob = {
    initialize: vi.fn(() => Promise.resolve()),
    prepareInterstitial: vi.fn(() => Promise.resolve()),
    prepareRewardVideoAd: vi.fn(() => Promise.resolve()),
    showInterstitial: vi.fn(() => Promise.resolve()),
    showRewardVideoAd: vi.fn(() => Promise.resolve()),
    addListener: vi.fn((eventName, callback) => {
      handlers.set(eventName, callback)
      const remove = vi.fn(() => Promise.resolve())
      removeFns.push(remove)
      return Promise.resolve({ remove })
    }),
    ...overrides,
  }

  vi.doMock('@capacitor-community/admob', () => ({
    AdMob,
    InterstitialAdPluginEvents: {
      Dismissed: EVENTS.interstitialDismissed,
      FailedToShow: EVENTS.interstitialFailedToShow,
    },
    RewardAdPluginEvents: {
      Rewarded: EVENTS.rewarded,
      Dismissed: EVENTS.rewardDismissed,
      FailedToShow: EVENTS.rewardFailedToShow,
    },
  }))

  const mod = await import('../../lib/admob')
  return { mod, AdMob, handlers, removeFns }
}

// Two ticks needed: first tick lets the prepare race resolve; second tick lets
// the async function resume and run the inner Promise executor (registering
// listeners + fallback timer). Without both, handlers may not be set up yet.
async function tickTwice() {
  await Promise.resolve()
  await Promise.resolve()
}

// Flush enough microtask ticks to let background listener cleanup complete.
// finish() calls resolve() immediately then does cleanup as fire-and-forget,
// so a few extra ticks are needed before asserting removeFns were called.
async function flushCleanup() {
  for (let i = 0; i < 5; i++) await Promise.resolve()
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
  vi.doUnmock('@capacitor-community/admob')
})

describe('showWorkoutCompleteAd', () => {
  it('removes both interstitial listeners when the ad is dismissed', async () => {
    const { mod, handlers, removeFns } = await loadAdMobModule()

    const shown = mod.showWorkoutCompleteAd()
    await tickTwice() // wait for prepare to resolve + inner executor to register handlers
    handlers.get(EVENTS.interstitialDismissed)()
    await shown
    await flushCleanup() // background listener removal is fire-and-forget

    expect(removeFns).toHaveLength(2) // Dismissed + FailedToShow
    expect(removeFns[0]).toHaveBeenCalledTimes(1)
    expect(removeFns[1]).toHaveBeenCalledTimes(1)
  })

  it('removes both interstitial listeners when showing the ad fails', async () => {
    const { mod, removeFns } = await loadAdMobModule({
      showInterstitial: vi.fn(() => Promise.reject(new Error('show failed'))),
    })

    await mod.showWorkoutCompleteAd()
    await flushCleanup()

    expect(removeFns).toHaveLength(2)
    expect(removeFns[0]).toHaveBeenCalledTimes(1)
    expect(removeFns[1]).toHaveBeenCalledTimes(1)
  })

  it('resolves immediately when FailedToShow fires', async () => {
    const { mod, handlers, removeFns } = await loadAdMobModule()

    const shown = mod.showWorkoutCompleteAd()
    await tickTwice()
    handlers.get(EVENTS.interstitialFailedToShow)()
    await shown
    await flushCleanup()

    expect(removeFns).toHaveLength(2)
    expect(removeFns[0]).toHaveBeenCalledTimes(1)
    expect(removeFns[1]).toHaveBeenCalledTimes(1)
  })

  it('resolves if prepareInterstitial stalls past the 15s timeout', async () => {
    vi.useFakeTimers()
    const { mod } = await loadAdMobModule({
      prepareInterstitial: vi.fn(() => new Promise(() => {})), // never resolves
    })

    const shown = mod.showWorkoutCompleteAd()
    // The 15s prepare timeout is registered synchronously when Promise.race is
    // created. Advancing time fires it before the async function suspends deeper,
    // so no extra await ticks are needed here.
    vi.advanceTimersByTime(15_000)
    await shown // outer catch handles the timeout rejection — function returns cleanly
  })

  it('resolves after 45s fallback if no events fire', async () => {
    vi.useFakeTimers()
    const { mod } = await loadAdMobModule()

    const shown = mod.showWorkoutCompleteAd()
    // Two ticks: let prepare resolve, then let the inner executor run and register
    // the fallback setTimeout before we advance fake time past it.
    await tickTwice()
    vi.advanceTimersByTime(45_000)
    await shown
  })
})

describe('showRewardedAd', () => {
  it('removes all rewarded listeners and returns false when dismissed without reward', async () => {
    const { mod, handlers, removeFns } = await loadAdMobModule()

    const result = mod.showRewardedAd()
    await tickTwice()
    handlers.get(EVENTS.rewardDismissed)()

    await expect(result).resolves.toBe(false)
    await flushCleanup()

    expect(removeFns).toHaveLength(3) // Rewarded + Dismissed + FailedToShow
    expect(removeFns[0]).toHaveBeenCalledTimes(1)
    expect(removeFns[1]).toHaveBeenCalledTimes(1)
    expect(removeFns[2]).toHaveBeenCalledTimes(1)
  })

  it('removes all rewarded listeners and returns false when showing the ad fails', async () => {
    const { mod, removeFns } = await loadAdMobModule({
      showRewardVideoAd: vi.fn(() => Promise.reject(new Error('show failed'))),
    })

    await expect(mod.showRewardedAd()).resolves.toBe(false)
    await flushCleanup()

    expect(removeFns).toHaveLength(3)
    expect(removeFns[0]).toHaveBeenCalledTimes(1)
    expect(removeFns[1]).toHaveBeenCalledTimes(1)
    expect(removeFns[2]).toHaveBeenCalledTimes(1)
  })

  it('returns true after reward then dismiss and removes all listeners', async () => {
    const { mod, handlers, removeFns } = await loadAdMobModule()

    const result = mod.showRewardedAd()
    await tickTwice()
    handlers.get(EVENTS.rewarded)()
    handlers.get(EVENTS.rewardDismissed)()

    await expect(result).resolves.toBe(true)
    await flushCleanup()

    expect(removeFns).toHaveLength(3)
    expect(removeFns[0]).toHaveBeenCalledTimes(1)
    expect(removeFns[1]).toHaveBeenCalledTimes(1)
    expect(removeFns[2]).toHaveBeenCalledTimes(1)
  })

  it('returns false when FailedToShow fires', async () => {
    const { mod, handlers, removeFns } = await loadAdMobModule()

    const result = mod.showRewardedAd()
    await tickTwice()
    handlers.get(EVENTS.rewardFailedToShow)()

    await expect(result).resolves.toBe(false)
    await flushCleanup()

    expect(removeFns).toHaveLength(3)
    expect(removeFns[0]).toHaveBeenCalledTimes(1)
    expect(removeFns[1]).toHaveBeenCalledTimes(1)
    expect(removeFns[2]).toHaveBeenCalledTimes(1)
  })

  it('resolves if prepareRewardVideoAd stalls past the 15s timeout', async () => {
    vi.useFakeTimers()
    const { mod } = await loadAdMobModule({
      prepareRewardVideoAd: vi.fn(() => new Promise(() => {})), // never resolves
    })

    const result = mod.showRewardedAd()
    vi.advanceTimersByTime(15_000)
    await expect(result).resolves.toBe(false) // catch block returns false
  })

  it('returns false after 45s fallback if no events fire and reward was not earned', async () => {
    vi.useFakeTimers()
    const { mod } = await loadAdMobModule()

    const result = mod.showRewardedAd()
    await tickTwice() // let prepare resolve + inner executor register fallback timer
    vi.advanceTimersByTime(45_000)
    await expect(result).resolves.toBe(false)
  })

  it('returns true after 45s fallback if Rewarded already fired before the timeout', async () => {
    vi.useFakeTimers()
    const { mod, handlers } = await loadAdMobModule()

    const result = mod.showRewardedAd()
    await tickTwice() // let prepare resolve + inner executor run
    handlers.get(EVENTS.rewarded)() // reward earned — Dismissed never fires
    vi.advanceTimersByTime(45_000)  // fallback fires finish(rewarded=true)
    await expect(result).resolves.toBe(true)
  })
})
