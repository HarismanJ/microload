import { beforeEach, vi } from 'vitest'

function createMemoryStorage() {
  const store = new Map()
  return {
    get length() {
      return store.size
    },
    clear: vi.fn(() => store.clear()),
    getItem: vi.fn(key => store.get(String(key)) ?? null),
    key: vi.fn(index => Array.from(store.keys())[index] ?? null),
    removeItem: vi.fn(key => store.delete(String(key))),
    setItem: vi.fn((key, value) => store.set(String(key), String(value))),
  }
}

const storage = typeof window.localStorage?.clear === 'function'
  ? window.localStorage
  : createMemoryStorage()

Object.defineProperty(globalThis, 'localStorage', {
  value: storage,
  configurable: true,
})

Object.defineProperty(window, 'localStorage', {
  value: storage,
  configurable: true,
})

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    getPlatform: vi.fn(() => 'web'),
    isNativePlatform: vi.fn(() => false),
    registerPlugin: vi.fn(name => ({ name })),
  },
  registerPlugin: vi.fn(name => ({ name })),
}))

vi.mock('@revenuecat/purchases-capacitor', () => ({
  Purchases: {
    configure: vi.fn(() => Promise.resolve()),
    setLogLevel: vi.fn(() => Promise.resolve()),
    getCustomerInfo: vi.fn(() => Promise.resolve({ customerInfo: { entitlements: { active: {} } } })),
    getOfferings: vi.fn(() => Promise.resolve({ offerings: { current: null } })),
    purchasePackage: vi.fn(() => Promise.resolve({ customerInfo: { entitlements: { active: {} } } })),
    restorePurchases: vi.fn(() => Promise.resolve({ customerInfo: { entitlements: { active: {} } } })),
    logIn: vi.fn(() => Promise.resolve({ customerInfo: { entitlements: { active: {} } }, created: false })),
    logOut: vi.fn(() => Promise.resolve({ customerInfo: { entitlements: { active: {} } } })),
  },
  LOG_LEVEL: { DEBUG: 'DEBUG', INFO: 'INFO', WARN: 'WARN', ERROR: 'ERROR' },
}))

vi.mock('@capacitor/local-notifications', () => ({
  LocalNotifications: {
    schedule: vi.fn(),
    cancel: vi.fn(),
    checkPermissions: vi.fn(() => Promise.resolve({ display: 'granted' })),
    requestPermissions: vi.fn(() => Promise.resolve({ display: 'granted' })),
  },
}))

vi.mock('@capacitor/haptics', () => ({
  Haptics: {
    impact: vi.fn(() => Promise.resolve()),
  },
  ImpactStyle: { Heavy: 'HEAVY', Light: 'LIGHT', Medium: 'MEDIUM' },
}))

if (typeof Element !== 'undefined' && typeof Element.prototype.animate !== 'function') {
  Element.prototype.animate = function () {
    return { cancel: () => {}, finish: () => {}, play: () => {}, pause: () => {} }
  }
}

if (typeof window.matchMedia !== 'function') {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })
}

vi.mock('@sentry/react', () => ({
  init: vi.fn(),
  reactErrorHandler: vi.fn(() => () => {}),
  browserTracingIntegration: vi.fn(),
  replayIntegration: vi.fn(),
  addBreadcrumb: vi.fn(),
  setUser: vi.fn(),
  withScope: vi.fn(callback => callback?.({ setTag: vi.fn() })),
}))

Object.defineProperty(window, 'Notification', {
  value: {
    permission: 'granted',
    requestPermission: vi.fn(() => Promise.resolve('granted')),
  },
  writable: true,
})

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
})
