export const THEMES = [
  {
    id: 'forest',
    name: 'Forest',
    accent: '#4ade80',
    vars: {
      '--blue':     '#4ade80',
      '--blue-dim': 'rgba(74,222,128,0.11)',
      '--bg':       '#101210',
      '--surface':  '#181a18',
      '--surface2': '#1f221f',
      '--border':   'rgba(255,255,255,0.07)',
      '--muted':    '#6b7280',
      '--text':     '#ffffff',
    },
  },
  {
    id: 'obsidian',
    name: 'Obsidian',
    accent: '#10b981',
    vars: {
      '--blue':     '#10b981',
      '--blue-dim': 'rgba(16,185,129,0.12)',
      '--bg':       '#0f0f0f',
      '--surface':  '#191919',
      '--surface2': '#212121',
      '--border':   'rgba(255,255,255,0.06)',
      '--muted':    '#6b7280',
      '--text':     '#ffffff',
    },
  },
  {
    id: 'navy',
    name: 'Navy',
    accent: '#3b9eff',
    vars: {
      '--blue':     '#3b9eff',
      '--blue-dim': 'rgba(59,158,255,0.04)',
      '--bg':       '#0f0f0f',
      '--surface':  '#191919',
      '--surface2': '#212121',
      '--border':   'rgba(255,255,255,0.06)',
      '--muted':    '#6f7682',
      '--text':     '#ffffff',
    },
  },
  {
    id: 'twilight',
    name: 'Twilight',
    accent: '#a78bfa',
    vars: {
      '--blue':     '#a78bfa',
      '--blue-dim': 'rgba(167,139,250,0.04)',
      '--bg':       '#0f0f0f',
      '--surface':  '#191919',
      '--surface2': '#212121',
      '--border':   'rgba(255,255,255,0.06)',
      '--muted':    '#7d7b93',
      '--text':     '#f0eeff',
    },
  },
  {
    id: 'crimson',
    name: 'Crimson',
    accent: '#f43f5e',
    vars: {
      '--blue':     '#f43f5e',
      '--blue-dim': 'rgba(244,63,94,0.04)',
      '--bg':       '#0f0f0f',
      '--surface':  '#191919',
      '--surface2': '#212121',
      '--border':   'rgba(255,255,255,0.06)',
      '--muted':    '#80767c',
      '--text':     '#fff1f5',
    },
  },
  {
    id: 'dusk',
    name: 'Dusk',
    accent: '#f59e0b',
    vars: {
      '--blue':     '#f59e0b',
      '--blue-dim': 'rgba(245,158,11,0.04)',
      '--bg':       '#0f0f0f',
      '--surface':  '#191919',
      '--surface2': '#212121',
      '--border':   'rgba(255,255,255,0.06)',
      '--muted':    '#81786d',
      '--text':     '#faf3e8',
    },
  },
]

export function applyTheme(themeId) {
  const theme = THEMES.find(t => t.id === themeId) || THEMES[1] // obsidian default
  const root = document.documentElement
  Object.entries(theme.vars).forEach(([key, val]) => root.style.setProperty(key, val))
}

export function getSavedTheme() {
  try {
    return localStorage.getItem('theme') || 'obsidian'
  } catch {
    return 'obsidian'
  }
}

export function saveTheme(themeId) {
  try {
    localStorage.setItem('theme', themeId)
  } catch {
    // Ignore storage failures — theme still applies in memory for this session
  }
  applyTheme(themeId)
}
