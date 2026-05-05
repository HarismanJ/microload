import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { THEMES, saveTheme, getSavedTheme, applyTheme } from '../lib/theme'

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [themeId, setThemeId] = useState(getSavedTheme)

  const switchTheme = useCallback((id) => {
    setThemeId(id)
    saveTheme(id)
  }, [])

  const previewTheme = useCallback((id) => {
    setThemeId(id)
    applyTheme(id)
  }, [])

  const value = useMemo(() => ({
    themeId,
    switchTheme,
    previewTheme,
    themes: THEMES,
  }), [previewTheme, switchTheme, themeId])

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
