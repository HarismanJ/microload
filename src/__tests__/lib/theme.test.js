import {
  THEMES,
  applyTheme,
  clearCachedTheme,
  getCachedThemeForUser,
  getSavedTheme,
  saveTheme,
  saveThemeForUser,
} from '../../lib/theme.js'

function withStorage(storage, fn) {
  const windowDescriptor = Object.getOwnPropertyDescriptor(window, 'localStorage')
  const globalDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')

  Object.defineProperty(window, 'localStorage', {
    value: storage,
    configurable: true,
  })
  Object.defineProperty(globalThis, 'localStorage', {
    value: storage,
    configurable: true,
  })

  try {
    return fn()
  } finally {
    Object.defineProperty(window, 'localStorage', windowDescriptor)
    Object.defineProperty(globalThis, 'localStorage', globalDescriptor)
  }
}

function throwingStorage(overrides = {}) {
  return {
    get length() {
      return 0
    },
    clear: vi.fn(),
    getItem: vi.fn(() => { throw new Error('storage unavailable') }),
    key: vi.fn(),
    removeItem: vi.fn(() => { throw new Error('storage unavailable') }),
    setItem: vi.fn(() => { throw new Error('storage unavailable') }),
    ...overrides,
  }
}

function themeById(id) {
  return THEMES.find(theme => theme.id === id)
}

describe('theme', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('style')
  })

  it('applies a known theme to document CSS variables', () => {
    const forest = themeById('forest')

    applyTheme('forest')

    expect(document.documentElement.style.getPropertyValue('--blue')).toBe(forest.vars['--blue'])
    expect(document.documentElement.style.getPropertyValue('--surface')).toBe(forest.vars['--surface'])
    expect(document.documentElement.style.getPropertyValue('--text')).toBe(forest.vars['--text'])
  })

  it('falls back to the navy theme for an unknown theme id', () => {
    const navy = themeById('navy')

    applyTheme('not-a-theme')

    expect(document.documentElement.style.getPropertyValue('--blue')).toBe(navy.vars['--blue'])
    expect(document.documentElement.style.getPropertyValue('--bg')).toBe(navy.vars['--bg'])
  })

  it('returns the saved theme or the default when none is saved', () => {
    expect(getSavedTheme()).toBe('navy')

    localStorage.setItem('theme', 'dusk')

    expect(getSavedTheme()).toBe('dusk')
  })

  it('returns the storage-error fallback when saved theme lookup throws', () => {
    withStorage(throwingStorage(), () => {
      expect(getSavedTheme()).toBe('obsidian')
    })
  })

  it('saves a theme and applies its CSS variables', () => {
    const crimson = themeById('crimson')

    saveTheme('crimson')

    expect(localStorage.getItem('theme')).toBe('crimson')
    expect(document.documentElement.style.getPropertyValue('--blue')).toBe(crimson.vars['--blue'])
  })

  it('saves and clears user-scoped theme cache entries', () => {
    saveThemeForUser('twilight', 'user-1')

    expect(localStorage.getItem('theme')).toBe('twilight')
    expect(localStorage.getItem('themeUserId')).toBe('user-1')
    expect(getCachedThemeForUser('user-1')).toBe('twilight')
    expect(getCachedThemeForUser('user-2')).toBeNull()
    expect(getCachedThemeForUser()).toBeNull()

    saveThemeForUser('forest', null)

    expect(localStorage.getItem('theme')).toBe('forest')
    expect(localStorage.getItem('themeUserId')).toBeNull()

    clearCachedTheme()

    expect(localStorage.getItem('theme')).toBeNull()
    expect(localStorage.getItem('themeUserId')).toBeNull()
  })

  it('continues applying themes when localStorage writes throw', () => {
    const dusk = themeById('dusk')

    withStorage(throwingStorage(), () => {
      expect(() => saveTheme('dusk')).not.toThrow()
      expect(() => saveThemeForUser('dusk', 'user-1')).not.toThrow()
      expect(() => clearCachedTheme()).not.toThrow()
      expect(document.documentElement.style.getPropertyValue('--blue')).toBe(dusk.vars['--blue'])
    })
  })
})
