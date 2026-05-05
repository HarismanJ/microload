import { useState, useEffect } from 'react'

export function createRestTimer(seconds, exerciseName) {
  return {
    endTime: Date.now() + seconds * 1000,
    total: seconds,
    exerciseName,
    completed: false,
  }
}

export function getRemainingRestSeconds(restTimer) {
  return Math.max(0, Math.ceil((restTimer.endTime - Date.now()) / 1000))
}

export function useRestTimer() {
  const [restTimer, setRestTimer] = useState(null)

  // Uses absolute endTime so backgrounding the app doesn't desync the countdown.
  useEffect(() => {
    if (!restTimer) return
    if (restTimer.completed) {
      const timeout = setTimeout(() => setRestTimer(null), 1200)
      return () => clearTimeout(timeout)
    }
    const tick = () => {
      const remaining = Math.ceil((restTimer.endTime - Date.now()) / 1000)
      if (remaining <= 0) {
        setRestTimer(current => current ? {
          ...current,
          endTime: Date.now(),
          completed: true,
        } : null)
      } else {
        setRestTimer(r => r ? { ...r } : null) // trigger re-render to recalculate remaining
      }
    }
    const t = setTimeout(tick, 500)
    return () => clearTimeout(t)
  }, [restTimer])

  return { restTimer, setRestTimer }
}
