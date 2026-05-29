import {
  checkMissedTimers,
  requestNotificationPermission,
  scheduleRestEndNotification,
  cancelRestNotification,
} from '../../lib/restNotification.js'

// setup.js defines window.Notification as a plain object (writable: true).
// Replace it with a vi.fn() so `new Notification(title, opts)` works in tests
// that exercise checkMissedTimers and the setTimeout fallback path.
const notifCtor = vi.fn()
notifCtor.permission = 'granted'
notifCtor.requestPermission = vi.fn(() => Promise.resolve('granted'))
window.Notification = notifCtor

// vi.clearAllMocks() (from setup.js beforeEach) clears call history but keeps
// implementations, so requestPermission's factory stays intact between tests.
// We only need to reset the mutable permission property.
beforeEach(() => {
  notifCtor.permission = 'granted'
})

// ─── Group A: requestNotificationPermission — web path ──────────────────────

describe('requestNotificationPermission — web path', () => {
  it('returns true when permission is already granted', async () => {
    const result = await requestNotificationPermission()
    expect(result).toBe(true)
    expect(notifCtor.requestPermission).not.toHaveBeenCalled()
  })

  it('returns false when permission is denied', async () => {
    notifCtor.permission = 'denied'
    const result = await requestNotificationPermission()
    expect(result).toBe(false)
    expect(notifCtor.requestPermission).not.toHaveBeenCalled()
  })

  it('returns true when default and requestPermission resolves granted', async () => {
    notifCtor.permission = 'default'
    notifCtor.requestPermission.mockResolvedValueOnce('granted')
    expect(await requestNotificationPermission()).toBe(true)
  })

  it('returns false when default and requestPermission resolves denied', async () => {
    notifCtor.permission = 'default'
    notifCtor.requestPermission.mockResolvedValueOnce('denied')
    expect(await requestNotificationPermission()).toBe(false)
  })
})

// ─── Groups B & C: web + ServiceWorker path ─────────────────────────────────

describe('web + ServiceWorker path', () => {
  let swPostMessage

  beforeEach(() => {
    swPostMessage = vi.fn()
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { ready: Promise.resolve({ active: { postMessage: swPostMessage } }) },
      configurable: true,
    })
  })

  afterEach(() => {
    delete navigator.serviceWorker
  })

  describe('scheduleRestEndNotification', () => {
    it('only posts CANCEL_NOTIFICATION when seconds = 0', async () => {
      await scheduleRestEndNotification(0, 'Bench Press')
      expect(swPostMessage).toHaveBeenCalledTimes(1)
      expect(swPostMessage).toHaveBeenCalledWith({ type: 'CANCEL_NOTIFICATION', id: 'rest-workout' })
    })

    it('only posts CANCEL_NOTIFICATION when permission is denied', async () => {
      notifCtor.permission = 'denied'
      await scheduleRestEndNotification(30, 'Bench Press')
      expect(swPostMessage).toHaveBeenCalledTimes(1)
      expect(swPostMessage).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: 'SCHEDULE_NOTIFICATION' }),
      )
    })

    it('posts CANCEL then SCHEDULE with correct args for workout kind', async () => {
      await scheduleRestEndNotification(30, 'Bench Press')
      expect(swPostMessage).toHaveBeenCalledTimes(2)
      expect(swPostMessage).toHaveBeenNthCalledWith(1, { type: 'CANCEL_NOTIFICATION', id: 'rest-workout' })
      expect(swPostMessage).toHaveBeenLastCalledWith({
        type: 'SCHEDULE_NOTIFICATION',
        id: 'rest-workout',
        delayMs: 30000,
        title: 'Rest Over',
        body: 'Bench Press rest is complete.',
      })
    })

    it('uses quick kind id, title, and body when kind = quick', async () => {
      await scheduleRestEndNotification(15, '', { kind: 'quick' })
      expect(swPostMessage).toHaveBeenLastCalledWith({
        type: 'SCHEDULE_NOTIFICATION',
        id: 'rest-quick',
        delayMs: 15000,
        title: 'Timer Complete',
        body: 'Your quick rest timer has finished.',
      })
    })

    it('uses custom title and body from options', async () => {
      await scheduleRestEndNotification(60, 'Squat', { title: 'Custom Title', body: 'Custom body.' })
      expect(swPostMessage).toHaveBeenLastCalledWith(
        expect.objectContaining({ type: 'SCHEDULE_NOTIFICATION', title: 'Custom Title', body: 'Custom body.' }),
      )
    })
  })

  describe('cancelRestNotification', () => {
    it('posts CANCEL_NOTIFICATION for workout kind and clears localStorage', async () => {
      localStorage.setItem('restTimerTargets', JSON.stringify({
        'rest-workout': { targetMs: 9999, title: 'T', body: 'B' },
      }))
      await cancelRestNotification('workout')
      expect(swPostMessage).toHaveBeenCalledWith({ type: 'CANCEL_NOTIFICATION', id: 'rest-workout' })
      expect(JSON.parse(localStorage.getItem('restTimerTargets') || '{}')['rest-workout']).toBeUndefined()
    })

    it('posts CANCEL_NOTIFICATION for quick kind', async () => {
      await cancelRestNotification('quick')
      expect(swPostMessage).toHaveBeenCalledWith({ type: 'CANCEL_NOTIFICATION', id: 'rest-quick' })
    })

    it('posts CANCEL_NOTIFICATION for both ids when kind = all', async () => {
      await cancelRestNotification('all')
      expect(swPostMessage).toHaveBeenCalledTimes(2)
      expect(swPostMessage).toHaveBeenCalledWith({ type: 'CANCEL_NOTIFICATION', id: 'rest-workout' })
      expect(swPostMessage).toHaveBeenCalledWith({ type: 'CANCEL_NOTIFICATION', id: 'rest-quick' })
    })
  })
})

// ─── Group C (cont.): cancelRestNotification — no serviceWorker ──────────────

describe('cancelRestNotification — no serviceWorker', () => {
  it('clears localStorage without throwing when no serviceWorker is present', async () => {
    localStorage.setItem('restTimerTargets', JSON.stringify({
      'rest-workout': { targetMs: 1000, title: 'T', body: 'B' },
    }))
    await cancelRestNotification('workout')
    expect(JSON.parse(localStorage.getItem('restTimerTargets') || '{}')['rest-workout']).toBeUndefined()
  })
})

// ─── Group D: checkMissedTimers — web path ───────────────────────────────────

describe('checkMissedTimers — web path', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(5000)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('fires Notification and removes expired timer from localStorage', () => {
    localStorage.setItem('restTimerTargets', JSON.stringify({
      'rest-workout': { targetMs: 1000, title: 'Rest Over', body: 'Bench Press rest is complete.' },
    }))
    checkMissedTimers()
    expect(notifCtor).toHaveBeenCalledWith('Rest Over', { body: 'Bench Press rest is complete.' })
    expect(JSON.parse(localStorage.getItem('restTimerTargets') || '{}')['rest-workout']).toBeUndefined()
  })

  it('does not fire Notification for a non-expired timer', () => {
    localStorage.setItem('restTimerTargets', JSON.stringify({
      'rest-workout': { targetMs: 9000, title: 'Rest Over', body: 'test' },
    }))
    checkMissedTimers()
    expect(notifCtor).not.toHaveBeenCalled()
    expect(JSON.parse(localStorage.getItem('restTimerTargets') || '{}')['rest-workout']).toBeDefined()
  })

  it('does not fire Notification when permission is not granted', () => {
    notifCtor.permission = 'denied'
    localStorage.setItem('restTimerTargets', JSON.stringify({
      'rest-workout': { targetMs: 1000, title: 'Rest Over', body: 'test' },
    }))
    checkMissedTimers()
    expect(notifCtor).not.toHaveBeenCalled()
  })

  it('does not throw when localStorage contains malformed JSON', () => {
    localStorage.setItem('restTimerTargets', 'not-json')
    expect(() => checkMissedTimers()).not.toThrow()
  })
})

// ─── Group E: scheduleRestEndNotification — web fallback (no serviceWorker) ──
// navigator.serviceWorker is absent here: the SW describe's afterEach deleted it
// and this describe never adds it back.

describe('scheduleRestEndNotification — web fallback (no serviceWorker)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(0)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('does not fire Notification before the timer delay elapses', async () => {
    await scheduleRestEndNotification(30, 'Bench Press')
    expect(notifCtor).not.toHaveBeenCalled()
  })

  it('fires Notification after advanceTimersByTime', async () => {
    await scheduleRestEndNotification(30, 'Bench Press')
    vi.advanceTimersByTime(30000)
    expect(notifCtor).toHaveBeenCalledWith('Rest Over', { body: 'Bench Press rest is complete.' })
  })

  it('removes localStorage entry after notification fires', async () => {
    await scheduleRestEndNotification(30, 'Bench Press')
    vi.advanceTimersByTime(30000)
    expect(JSON.parse(localStorage.getItem('restTimerTargets') || '{}')['rest-workout']).toBeUndefined()
  })
})

// ─── Group F: Native (Capacitor) path ────────────────────────────────────────
// USE_NATIVE_NOTIFICATIONS is evaluated at module load time, so we must
// re-evaluate restNotification.js with a new getPlatform mock via vi.resetModules()
// + vi.doMock() + dynamic import.

describe('Native (Capacitor) path', () => {
  let nativeMod
  let LNMock

  beforeAll(async () => {
    LNMock = {
      schedule: vi.fn(),
      cancel: vi.fn(),
      checkPermissions: vi.fn(),
      requestPermissions: vi.fn(),
    }
    vi.resetModules()
    vi.doMock('@capacitor/core', () => ({
      Capacitor: { getPlatform: () => 'ios', isNativePlatform: () => true },
    }))
    vi.doMock('@capacitor/local-notifications', () => ({
      LocalNotifications: LNMock,
    }))
    nativeMod = await import('../../lib/restNotification.js')
  })

  afterAll(() => {
    vi.resetModules()
    vi.doUnmock('@capacitor/core')
    vi.doUnmock('@capacitor/local-notifications')
  })

  // Re-apply default implementations before each test because vi.clearAllMocks()
  // from setup.js clears mock call history (but not implementations). Explicitly
  // resetting here makes each test's expectations unambiguous.
  beforeEach(() => {
    LNMock.checkPermissions.mockResolvedValue({ display: 'granted' })
    LNMock.requestPermissions.mockResolvedValue({ display: 'granted' })
    LNMock.schedule.mockResolvedValue(undefined)
    LNMock.cancel.mockResolvedValue(undefined)
  })

  // F1: requestNotificationPermission ─────────────────────────────────────────

  describe('requestNotificationPermission', () => {
    it('returns true when checkPermissions display is granted', async () => {
      expect(await nativeMod.requestNotificationPermission()).toBe(true)
      expect(LNMock.requestPermissions).not.toHaveBeenCalled()
    })

    it('returns true after requesting permission when not yet granted', async () => {
      LNMock.checkPermissions.mockResolvedValueOnce({ display: 'prompt' })
      expect(await nativeMod.requestNotificationPermission()).toBe(true)
      expect(LNMock.requestPermissions).toHaveBeenCalledTimes(1)
    })

    it('returns false when requestPermissions display is denied', async () => {
      LNMock.checkPermissions.mockResolvedValueOnce({ display: 'prompt' })
      LNMock.requestPermissions.mockResolvedValueOnce({ display: 'denied' })
      expect(await nativeMod.requestNotificationPermission()).toBe(false)
    })

    it('returns false when checkPermissions throws', async () => {
      LNMock.checkPermissions.mockRejectedValueOnce(new Error('permission error'))
      expect(await nativeMod.requestNotificationPermission()).toBe(false)
    })
  })

  // F2: scheduleRestEndNotification ────────────────────────────────────────────

  describe('scheduleRestEndNotification', () => {
    it('calls cancel but not schedule when seconds = 0', async () => {
      await nativeMod.scheduleRestEndNotification(0, 'Bench Press')
      expect(LNMock.cancel).toHaveBeenCalledTimes(1)
      expect(LNMock.schedule).not.toHaveBeenCalled()
    })

    it('does not call schedule when permission is denied', async () => {
      LNMock.checkPermissions.mockResolvedValue({ display: 'denied' })
      LNMock.requestPermissions.mockResolvedValue({ display: 'denied' })
      await nativeMod.scheduleRestEndNotification(30, 'Bench Press')
      expect(LNMock.schedule).not.toHaveBeenCalled()
    })

    it('schedules with correct native id, title, and body for workout kind', async () => {
      await nativeMod.scheduleRestEndNotification(30, 'Bench Press')
      expect(LNMock.schedule).toHaveBeenCalledWith({
        notifications: [{
          id: 41001,
          title: 'Rest Over',
          body: 'Bench Press rest is complete.',
          schedule: { at: expect.any(Date), allowWhileIdle: true },
        }],
      })
    })

    it('uses fallback body when no exerciseName is provided', async () => {
      await nativeMod.scheduleRestEndNotification(30, '')
      expect(LNMock.schedule).toHaveBeenCalledWith(
        expect.objectContaining({
          notifications: [expect.objectContaining({ body: 'Time to hit your next set.' })],
        }),
      )
    })

    it('schedules with quick kind native id and defaults', async () => {
      await nativeMod.scheduleRestEndNotification(15, '', { kind: 'quick' })
      expect(LNMock.schedule).toHaveBeenCalledWith({
        notifications: [{
          id: 41002,
          title: 'Timer Complete',
          body: 'Your quick rest timer has finished.',
          schedule: { at: expect.any(Date), allowWhileIdle: true },
        }],
      })
    })

    it('uses custom title and body from options', async () => {
      await nativeMod.scheduleRestEndNotification(30, 'Squat', { title: 'Custom', body: 'Custom body.' })
      expect(LNMock.schedule).toHaveBeenCalledWith(
        expect.objectContaining({
          notifications: [expect.objectContaining({ title: 'Custom', body: 'Custom body.' })],
        }),
      )
    })

    it('does not throw when schedule() fails and preserves the localStorage entry', async () => {
      LNMock.schedule.mockRejectedValueOnce(new Error('schedule failed'))
      await expect(nativeMod.scheduleRestEndNotification(30, 'Bench Press')).resolves.toBeUndefined()
      expect(JSON.parse(localStorage.getItem('restTimerTargets') || '{}')['rest-workout']).toBeDefined()
    })
  })

  // F3: cancelRestNotification ─────────────────────────────────────────────────

  describe('cancelRestNotification', () => {
    it('calls cancel with workout native id and clears localStorage', async () => {
      localStorage.setItem('restTimerTargets', JSON.stringify({
        'rest-workout': { targetMs: 9999, title: 'T', body: 'B' },
      }))
      await nativeMod.cancelRestNotification('workout')
      expect(LNMock.cancel).toHaveBeenCalledWith({ notifications: [{ id: 41001 }] })
      expect(JSON.parse(localStorage.getItem('restTimerTargets') || '{}')['rest-workout']).toBeUndefined()
    })

    it('calls cancel with quick native id', async () => {
      await nativeMod.cancelRestNotification('quick')
      expect(LNMock.cancel).toHaveBeenCalledWith({ notifications: [{ id: 41002 }] })
    })

    it('calls cancel with both native ids when kind = all', async () => {
      await nativeMod.cancelRestNotification('all')
      expect(LNMock.cancel).toHaveBeenCalledWith({ notifications: [{ id: 41001 }, { id: 41002 }] })
    })

    it('does not throw when cancel() fails', async () => {
      LNMock.cancel.mockRejectedValueOnce(new Error('cancel error'))
      await expect(nativeMod.cancelRestNotification('workout')).resolves.toBeUndefined()
    })
  })

  // F4: checkMissedTimers — native path ────────────────────────────────────────

  describe('checkMissedTimers — native path', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(5000)
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('removes expired timer from localStorage without scheduling a notification', () => {
      localStorage.setItem('restTimerTargets', JSON.stringify({
        'rest-workout': { targetMs: 1000, title: 'Rest Over', body: 'test' },
      }))
      nativeMod.checkMissedTimers()
      expect(LNMock.schedule).not.toHaveBeenCalled()
      expect(JSON.parse(localStorage.getItem('restTimerTargets') || '{}')['rest-workout']).toBeUndefined()
    })

    it('keeps a non-expired timer in localStorage', () => {
      localStorage.setItem('restTimerTargets', JSON.stringify({
        'rest-workout': { targetMs: 9000, title: 'Rest Over', body: 'test' },
      }))
      nativeMod.checkMissedTimers()
      expect(JSON.parse(localStorage.getItem('restTimerTargets') || '{}')['rest-workout']).toBeDefined()
    })
  })
})
