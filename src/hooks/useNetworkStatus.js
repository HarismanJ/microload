import { useState, useEffect, useRef } from 'react'
import { Network } from '@capacitor/network'

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true)
  const [justCameOnline, setJustCameOnline] = useState(false)
  const wasOfflineRef = useRef(false)

  useEffect(() => {
    let backOnlineTimer
    let offlineTimer
    let listenerHandle

    function applyStatus(connected) {
      if (connected) {
        clearTimeout(offlineTimer)
        if (wasOfflineRef.current) {
          setJustCameOnline(true)
          backOnlineTimer = setTimeout(() => setJustCameOnline(false), 2500)
        }
        wasOfflineRef.current = false
        setIsOnline(true)
      } else {
        clearTimeout(backOnlineTimer)
        offlineTimer = setTimeout(() => {
          wasOfflineRef.current = true
          setIsOnline(false)
          setJustCameOnline(false)
        }, 3000)
      }
    }

    async function init() {
      try {
        const status = await Network.getStatus()
        setIsOnline(status.connected)
        wasOfflineRef.current = !status.connected

        listenerHandle = await Network.addListener('networkStatusChange', s => {
          applyStatus(s.connected)
        })
      } catch {
        // Fallback for plain browser / unit tests
        setIsOnline(navigator.onLine)
        wasOfflineRef.current = !navigator.onLine
        const onOnline = () => applyStatus(true)
        const onOffline = () => applyStatus(false)
        window.addEventListener('online', onOnline)
        window.addEventListener('offline', onOffline)
        listenerHandle = {
          remove: () => {
            window.removeEventListener('online', onOnline)
            window.removeEventListener('offline', onOffline)
          }
        }
      }
    }

    init()

    return () => {
      clearTimeout(backOnlineTimer)
      clearTimeout(offlineTimer)
      listenerHandle?.remove()
    }
  }, [])

  return { isOnline, justCameOnline }
}
