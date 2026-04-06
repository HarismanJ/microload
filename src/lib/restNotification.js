const NOTIF_IDS = {
  workout: 'rest-workout',
  quick: 'rest-quick',
}

const TIMER_STORAGE_KEY = 'restTimerTargets'

function saveTimerTarget(id, targetMs, title, body) {
  try {
    const stored = JSON.parse(localStorage.getItem(TIMER_STORAGE_KEY) || '{}')
    stored[id] = { targetMs, title, body }
    localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(stored))
  } catch {}
}

function clearTimerTarget(id) {
  try {
    const stored = JSON.parse(localStorage.getItem(TIMER_STORAGE_KEY) || '{}')
    delete stored[id]
    localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(stored))
  } catch {}
}

// Called on visibility change — fires any notifications that should have fired while backgrounded
export function checkMissedTimers() {
  if (Notification.permission !== 'granted') return
  try {
    const stored = JSON.parse(localStorage.getItem(TIMER_STORAGE_KEY) || '{}')
    const now = Date.now()
    for (const [id, { targetMs, title, body }] of Object.entries(stored)) {
      if (now >= targetMs) {
        new Notification(title, { body })
        delete stored[id]
      }
    }
    localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(stored))
  } catch {}
}

async function getServiceWorker() {
  if (!('serviceWorker' in navigator)) return null
  try {
    const reg = await navigator.serviceWorker.ready
    return reg.active || null
  } catch {
    return null
  }
}

export async function requestNotificationPermission() {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

export async function scheduleRestEndNotification(seconds, exerciseName, options = {}) {
  const kind = options.kind === 'quick' ? 'quick' : 'workout'
  const id = NOTIF_IDS[kind]
  const safeSeconds = Math.max(0, Math.ceil(Number(seconds) || 0))

  await cancelRestNotification(kind)
  if (safeSeconds <= 0) return

  const granted = await requestNotificationPermission()
  if (!granted) return

  const title = options.title || (kind === 'quick' ? 'Timer Complete' : 'Rest Over')
  const body = options.body || (
    kind === 'quick'
      ? 'Your quick rest timer has finished.'
      : exerciseName
        ? `${exerciseName} rest is complete.`
        : 'Time to hit your next set.'
  )

  saveTimerTarget(id, Date.now() + safeSeconds * 1000, title, body)

  const sw = await getServiceWorker()
  if (sw) {
    sw.postMessage({ type: 'SCHEDULE_NOTIFICATION', id, delayMs: safeSeconds * 1000, title, body })
  } else {
    // Fallback: fire directly (only works when tab is in foreground)
    setTimeout(() => {
      if (Notification.permission === 'granted') {
        new Notification(title, { body })
        clearTimerTarget(id)
      }
    }, safeSeconds * 1000)
  }
}

export async function cancelRestNotification(kind = 'workout') {
  const ids = kind === 'all' ? Object.values(NOTIF_IDS) : [NOTIF_IDS[kind] || NOTIF_IDS.workout]

  ids.forEach(id => clearTimerTarget(id))

  const sw = await getServiceWorker()
  if (sw) {
    ids.forEach(id => sw.postMessage({ type: 'CANCEL_NOTIFICATION', id }))
  }
}
