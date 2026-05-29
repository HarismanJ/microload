import { defineConfig } from 'vitest/config'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

// Mirror the exact env-loading chain from playwright.config.js:
// .env.e2e wins over .env.local wins over .env; already-set vars are not overwritten.
for (const envFile of ['.env.e2e', '.env.local', '.env']) {
  loadEnvFile(path.join(rootDir, envFile))
}

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    testTimeout: 30_000,
    include: ['e2e/rls-cross-user.test.js', 'e2e/delete-account.test.js'],
    // No setupFiles — we want real Supabase network calls, no mocks
  },
})

// Copied verbatim from playwright.config.js so loading behaviour is identical.
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
  if ((quote === '"' || quote === "'") && value.endsWith(quote)) {
    return value.slice(1, -1)
  }
  return value
}
