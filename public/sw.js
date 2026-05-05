const pendingTimers = {}

self.addEventListener('message', (event) => {
  const { type, id, delayMs, title, body } = event.data || {}

  if (type === 'SCHEDULE_NOTIFICATION') {
    if (pendingTimers[id]) {
      clearTimeout(pendingTimers[id])
      delete pendingTimers[id]
    }
    if (!delayMs || delayMs <= 0) return

    pendingTimers[id] = setTimeout(() => {
      delete pendingTimers[id]
      self.registration.showNotification(title || 'Timer Complete', {
        body: body || 'Your rest timer has finished.',
        icon: '/favicon.svg',
        badge: '/favicon.svg',
        tag: id,
        renotify: true,
      })
    }, delayMs)
  }

  if (type === 'CANCEL_NOTIFICATION') {
    if (pendingTimers[id]) {
      clearTimeout(pendingTimers[id])
      delete pendingTimers[id]
    }
    self.registration.getNotifications({ tag: id }).then(notifications => {
      notifications.forEach(n => n.close())
    })
  }
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      if (windowClients.length > 0) {
        windowClients[0].focus()
      } else {
        clients.openWindow('/')
      }
    })
  )
})
