import { useState, useEffect, useRef } from 'react'
import { Network } from '@capacitor/network'
import { App as CapApp } from '@capacitor/app'

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true)
  const [justCameOnline, setJustCameOnline] = useState(false)
  const wasOfflineRef = useRef(false)

  useEffect(() => {
    if (!justCameOnline) return undefined
    const t = setTimeout(() => setJustCameOnline(false), 2500)
    return () => clearTimeout(t)
  }, [justCameOnline])

  useEffect(() => {
    let offlineTimer
    let listenerHandle

    function applyStatus(connected) {
      if (connected) {
        clearTimeout(offlineTimer)
        if (wasOfflineRef.current) {
          setJustCameOnline(true)
        }
        wasOfflineRef.current = false
        setIsOnline(true)
      } else {
        offlineTimer = setTimeout(() => {
          wasOfflineRef.current = true
          setIsOnline(false)
          setJustCameOnline(false)
        }, 3000)
      }
    }

    let appStateHandle

    async function recheckStatus() {
      try {
        const status = await Network.getStatus()
        applyStatus(status.connected)
      } catch {
        applyStatus(navigator.onLine)
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

        // Re-check on foreground — networkStatusChange can miss events while backgrounded
        appStateHandle = await CapApp.addListener('appStateChange', ({ isActive }) => {
          if (isActive) recheckStatus()
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
      clearTimeout(offlineTimer)
      listenerHandle?.remove()
      appStateHandle?.remove()
    }
  }, [])

  return { isOnline, justCameOnline }
}
