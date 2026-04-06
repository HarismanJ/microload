import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './App.css'
import App from './App'
import { ThemeProvider } from './context/ThemeContext'
import { applyTheme, getSavedTheme } from './lib/theme'
import { checkMissedTimers } from './lib/restNotification'

// Apply saved theme before first paint to avoid flash
applyTheme(getSavedTheme())

// Register service worker for background notifications
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {})
}

// Fire any notifications that were missed while the tab was backgrounded
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') checkMissedTimers()
})

// Fix iOS keyboard zoom — reset scroll position when any input loses focus
document.addEventListener('focusout', () => {
  if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
    setTimeout(() => window.scrollTo(0, 0), 50)
  }
}, true)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>
)
