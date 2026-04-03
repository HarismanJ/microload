import { createContext, useContext, useState } from 'react'
import { THEMES, saveTheme, getSavedTheme } from '../lib/theme'

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [themeId, setThemeId] = useState(getSavedTheme)

  function switchTheme(id) {
    setThemeId(id)
    saveTheme(id)
  }

  return (
    <ThemeContext.Provider value={{ themeId, switchTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
