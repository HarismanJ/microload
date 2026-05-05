import { useState, useRef } from 'react'

// Set-row swipe-to-delete. Uses RAF for smooth rendering under many concurrent rows.
// Threshold: 70% of screen width. Identifier is (exId, idx) pair.
export function useSetSwipe({ onDelete }) {
  const [swipeState, setSwipeState] = useState(null) // { exId, idx, dx }
  const swipeRef = useRef(null)                      // { exId, idx, startX, dx }
  const rafRef = useRef(null)

  // Always call the latest onDelete without making handlers stale.
  const onDeleteRef = useRef(onDelete)
  onDeleteRef.current = onDelete

  const handleTouchStart = (exId, idx, e) => {
    cancelAnimationFrame(rafRef.current)
    swipeRef.current = { exId, idx, startX: e.touches[0].clientX, dx: 0 }
    setSwipeState({ exId, idx, dx: 0 })
  }

  const handleTouchMove = (exId, idx, e) => {
    const ref = swipeRef.current
    if (!ref || ref.exId !== exId || ref.idx !== idx) return
    ref.dx = Math.min(0, e.touches[0].clientX - ref.startX)
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      if (swipeRef.current?.exId === exId && swipeRef.current?.idx === idx) {
        setSwipeState({ exId, idx, dx: swipeRef.current.dx })
      }
    })
  }

  const handleTouchEnd = (exId, idx) => {
    cancelAnimationFrame(rafRef.current)
    const dx = swipeRef.current?.dx || 0
    swipeRef.current = null
    setSwipeState(null)
    if (dx < -(window.innerWidth * 0.70)) {
      onDeleteRef.current(exId, idx)
    }
  }

  const handleTouchCancel = () => {
    cancelAnimationFrame(rafRef.current)
    swipeRef.current = null
    setSwipeState(null)
  }

  return { swipeState, handleTouchStart, handleTouchMove, handleTouchEnd, handleTouchCancel }
}

// Template/routine card swipe-to-delete. No RAF (fewer cards on screen).
// Threshold: 80% of screen width. Identifier is a single id value.
export function useTemplateSwipe() {
  const [templateSwipeState, setTemplateSwipeState] = useState(null) // { id, dx }
  const swipeRef = useRef(null)                                       // { id, startX, dx }

  const handleTouchStart = (id, e) => {
    swipeRef.current = { id, startX: e.touches[0].clientX, dx: 0 }
    setTemplateSwipeState({ id, dx: 0 })
  }

  const handleTouchMove = (id, e) => {
    const ref = swipeRef.current
    if (!ref || ref.id !== id) return
    const dx = Math.min(0, e.touches[0].clientX - ref.startX)
    ref.dx = dx
    setTemplateSwipeState({ id, dx })
  }

  const handleTouchEnd = (id, onDelete) => {
    const dx = swipeRef.current?.dx || 0
    swipeRef.current = null
    setTemplateSwipeState(null)
    if (dx < -(window.innerWidth * 0.8)) onDelete()
  }

  const handleTouchCancel = () => {
    swipeRef.current = null
    setTemplateSwipeState(null)
  }

  return { templateSwipeState, handleTouchStart, handleTouchMove, handleTouchEnd, handleTouchCancel }
}
