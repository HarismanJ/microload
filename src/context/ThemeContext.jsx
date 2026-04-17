import { createContext, useContext, useState } from 'react'
import { THEMES, saveTheme, getSavedTheme, applyTheme } from '../lib/theme'

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [themeId, setThemeId] = useState(getSavedTheme)

  function switchTheme(id) {
    setThemeId(id)
    saveTheme(id)
  }

  function previewTheme(id) {
    setThemeId(id)
    applyTheme(id)
  }

  return (
    <ThemeContext.Provider value={{ themeId, switchTheme, previewTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
