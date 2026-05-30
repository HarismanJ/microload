import { useEffect, useRef } from 'react'

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

export function useFocusTrap(ref, { active = true, onEscape } = {}) {
  const onEscapeRef = useRef(onEscape)
  useEffect(() => { onEscapeRef.current = onEscape })

  useEffect(() => {
    if (!active) return
    const el = ref.current
    if (!el) return

    const prevFocused = document.activeElement
    const firstFocusable = el.querySelector(FOCUSABLE)
    ;(firstFocusable || el).focus({ preventScroll: true })

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        if (onEscapeRef.current) {
          e.preventDefault()
          onEscapeRef.current()
        }
        return
      }
      if (e.key !== 'Tab') return
      const focusable = Array.from(el.querySelectorAll(FOCUSABLE))
      if (!focusable.length) { e.preventDefault(); return }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey) {
        if (document.activeElement === first || document.activeElement === el) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    el.addEventListener('keydown', handleKeyDown)
    return () => {
      el.removeEventListener('keydown', handleKeyDown)
      try {
        prevFocused?.focus()
      } catch {
        // Ignore focus restoration failures after the trapped element unmounts.
      }
    }
  }, [active, ref])
}
