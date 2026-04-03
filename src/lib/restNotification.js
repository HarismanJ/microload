import { LocalNotifications } from '@capacitor/local-notifications'

const NOTIF_IDS = {
  workout: 42,
  quick: 43,
}

export async function requestNotificationPermission() {
  const { display } = await LocalNotifications.requestPermissions()
  return display === 'granted'
}

export async function scheduleRestEndNotification(seconds, exerciseName, options = {}) {
  const kind = options.kind === 'quick' ? 'quick' : 'workout'
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

  await LocalNotifications.schedule({
    notifications: [{
      id: NOTIF_IDS[kind],
      title,
      body,
      schedule: { at: new Date(Date.now() + safeSeconds * 1000) },
      sound: null,
      smallIcon: 'ic_stat_icon_config_sample',
    }],
  })
}

export async function cancelRestNotification(kind = 'workout') {
  const ids = kind === 'all'
    ? Object.values(NOTIF_IDS)
    : [NOTIF_IDS[kind] || NOTIF_IDS.workout]

  try {
    await LocalNotifications.cancel({ notifications: ids.map(id => ({ id })) })
  } catch {}
}
