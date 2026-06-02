import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
export const stateDir = path.join(rootDir, '.load')
export const usersFile = path.join(stateDir, 'users.json')

for (const envFile of ['.env.load', '.env.e2e', '.env.local', '.env']) {
  loadEnvFile(path.join(rootDir, envFile))
}

export function loadConfig() {
  const supabaseUrl = cleanUrl(process.env.LOAD_SUPABASE_URL || process.env.VITE_SUPABASE_URL)
  const anonKey = process.env.LOAD_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.LOAD_SUPABASE_SERVICE_ROLE_KEY
    || process.env.E2E_SUPABASE_SERVICE_ROLE_KEY
    || process.env.SUPABASE_SERVICE_ROLE_KEY

  return {
    supabaseUrl,
    anonKey,
    serviceRoleKey,
    target: process.env.LOAD_TEST_TARGET || '',
    emailPrefix: process.env.LOAD_TEST_EMAIL_PREFIX || 'liftlog-load',
    emailDomain: process.env.LOAD_TEST_EMAIL_DOMAIN || 'example-load-test.invalid',
    password: process.env.LOAD_TEST_PASSWORD || 'LiftLogLoad123!',
    userCount: readPositiveInt('LOAD_TEST_USER_COUNT', 25),
    cleanupAfterRun: process.env.LOAD_TEST_CLEANUP !== '0',
    maxErrorRate: readNumber('LOAD_TEST_MAX_ERROR_RATE', 0.01),
    p95ThresholdMs: readPositiveInt('LOAD_TEST_P95_MS', 1500),
  }
}

export function requireLoadConfig({ serviceRole = false } = {}) {
  const config = loadConfig()
  const missing = []
  if (!config.supabaseUrl) missing.push('LOAD_SUPABASE_URL or VITE_SUPABASE_URL')
  if (!config.anonKey) missing.push('LOAD_SUPABASE_ANON_KEY or VITE_SUPABASE_ANON_KEY')
  if (serviceRole && !config.serviceRoleKey) {
    missing.push('LOAD_SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_ROLE_KEY')
  }

  if (missing.length) {
    throw new Error(`Missing load-test env: ${missing.join(', ')}`)
  }

  assertNonProductionTarget(config)
  return config
}

export function ensureStateDir() {
  fs.mkdirSync(stateDir, { recursive: true })
}

export function readUsers() {
  if (!fs.existsSync(usersFile)) {
    throw new Error(`No seeded load users found at ${usersFile}. Run npm run load:seed first.`)
  }
  const parsed = JSON.parse(fs.readFileSync(usersFile, 'utf8'))
  if (!Array.isArray(parsed.users) || parsed.users.length === 0) {
    throw new Error(`Seed file ${usersFile} does not contain any users.`)
  }
  return parsed.users
}

export function writeUsers(users, config) {
  ensureStateDir()
  fs.writeFileSync(usersFile, JSON.stringify({
    generatedAt: new Date().toISOString(),
    supabaseUrl: config.supabaseUrl,
    emailPrefix: config.emailPrefix,
    users,
  }, null, 2))
}

export function parseArgs(argv) {
  const args = {}
  for (const item of argv) {
    const trimmed = item.replace(/^--/, '')
    const [key, ...rest] = trimmed.split('=')
    args[key] = rest.length ? rest.join('=') : true
  }
  return args
}

export function percentile(values, pct) {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.ceil((pct / 100) * sorted.length) - 1
  return sorted[Math.max(0, Math.min(sorted.length - 1, index))]
}

function assertNonProductionTarget(config) {
  const host = new URL(config.supabaseUrl).hostname
  const local = host === 'localhost' || host === '127.0.0.1'
  if (local) return
  if (config.target === 'staging' || process.env.LOAD_TEST_ALLOW_ANY_TARGET === '1') return

  throw new Error(
    'Refusing to run load tests against a hosted Supabase project without LOAD_TEST_TARGET=staging. ' +
    'Use a staging project, or set LOAD_TEST_ALLOW_ANY_TARGET=1 when you really mean it.'
  )
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIndex = trimmed.indexOf('=')
    if (eqIndex === -1) continue
    const key = trimmed.slice(0, eqIndex).trim()
    if (!key || process.env[key] !== undefined) continue
    process.env[key] = parseEnvValue(trimmed.slice(eqIndex + 1).trim())
  }
}

function parseEnvValue(value) {
  const quote = value[0]
  if ((quote === '"' || quote === "'") && value.endsWith(quote)) return value.slice(1, -1)
  return value
}

function cleanUrl(value) {
  return value ? value.replace(/\/+$/, '') : ''
}

function readPositiveInt(name, fallback) {
  const value = Number.parseInt(process.env[name] || '', 10)
  return Number.isFinite(value) && value > 0 ? value : fallback
}

function readNumber(name, fallback) {
  const value = Number.parseFloat(process.env[name] || '')
  return Number.isFinite(value) && value >= 0 ? value : fallback
}
