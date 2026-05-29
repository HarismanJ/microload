/**
 * Account deletion integration test (S7).
 *
 * Verifies the full delete-account flow end-to-end against the real Supabase
 * project: edge function → delete_user_account_data RPC → all user data removed
 * → auth user gone.
 *
 * Strategy: create a fresh User C, seed data across 4 tables, call the edge
 * function with User C's JWT, then assert all data and the auth account are gone.
 * The edge function is called via Node.js fetch with no Origin header — the CORS
 * guard treats no-origin requests as native/server requests and passes them through.
 *
 * Run with: npm run test:rls  (shares the same vitest.rls.config.js)
 */

import { createClient } from '@supabase/supabase-js'
import { getMissingE2EEnv } from './helpers/supabaseFixture.js'

const missing = getMissingE2EEnv()

let adminClient     // service-role — bypasses RLS for all setup/teardown
let userCId         // UUID of the ephemeral user being deleted
let userCEmail      // used to verify sign-in fails after deletion
let userCPassword

// Parsed response from the edge function — read once in beforeAll so
// the Response body stream is never double-consumed across tests.
let deleteStatus
let deleteBody

async function ignoreCleanupError(action) {
  try {
    await action()
  } catch {
    // Best-effort teardown only; the assertions report real delete failures.
  }
}

describe.skipIf(missing.length > 0)(
  `delete-account edge function${missing.length ? ` (SKIPPED — missing env: ${missing.join(', ')})` : ''}`,
  () => {
    // ── Setup + call edge function ────────────────────────────────────────────

    beforeAll(async () => {
      const supabaseUrl = process.env.VITE_SUPABASE_URL
      const anonKey     = process.env.VITE_SUPABASE_ANON_KEY
      const serviceKey  = process.env.E2E_SUPABASE_SERVICE_ROLE_KEY
                       || process.env.SUPABASE_SERVICE_ROLE_KEY

      adminClient = createClient(supabaseUrl, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })

      // Create a fresh user whose account this test will delete.
      // Unique timestamp suffix prevents CI collision if a prior run left a zombie user.
      userCEmail    = `delete-test-${Date.now()}@example-delete-test.invalid`
      userCPassword = `DeleteTest${Date.now()}!`

      const { data: createData, error: createError } =
        await adminClient.auth.admin.createUser({
          email:          userCEmail,
          password:       userCPassword,
          email_confirm:  true,
          user_metadata:  { full_name: 'Delete Test User C' },
        })
      if (createError) throw createError
      userCId = createData.user.id

      // handle_new_user trigger creates the profiles row asynchronously.
      // Wait 500 ms then upsert to ensure the row exists with a valid username.
      await new Promise(r => setTimeout(r, 500))
      const { error: profileErr } = await adminClient
        .from('profiles')
        .upsert({ id: userCId, username: `del_${userCId.slice(0, 8)}` }, { onConflict: 'id' })
      if (profileErr) throw profileErr

      // Seed one row per table that delete_user_account_data is responsible for.
      // Column names verified against rls-cross-user.test.js seeding patterns.
      const seeds = [
        // workout_sessions: user_id + started_at (started_at has a server default but we pass it)
        adminClient.from('workout_sessions')
          .insert({ user_id: userCId, started_at: new Date().toISOString() }),

        // body_weight_logs: column is `weight` (NOT weight_kg); `unit` defaults to 'kg'
        adminClient.from('body_weight_logs')
          .insert({ user_id: userCId, weight: 75, unit: 'kg' }),

        // foods (custom): user_id + name; all nutrient columns are nullable
        adminClient.from('foods')
          .insert({ user_id: userCId, name: 'Delete Test Food' }),

        // exercises (custom): all text columns are NOT NULL; id is serial — omit on insert
        adminClient.from('exercises')
          .insert({
            user_id:           userCId,
            name:              'Delete Test Exercise',
            category:          'Push',
            equipment:         'Bodyweight',
            primary_muscles:   ['Chest'],
            secondary_muscles: [],
          }),
      ]

      const results = await Promise.all(seeds)
      for (const { error } of results) {
        if (error) throw error
      }

      // Sign in as User C to get a valid JWT for the edge function call.
      const userCClient = createClient(supabaseUrl, anonKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
      const { data: signInData, error: signInErr } =
        await userCClient.auth.signInWithPassword({
          email:    userCEmail,
          password: userCPassword,
        })
      if (signInErr) throw signInErr
      const accessToken = signInData.session.access_token

      // Call the delete-account edge function.
      // Node.js fetch sends no Origin header; the CORS guard in cors.ts treats
      // no-origin requests as native/server calls and lets them through.
      const res = await fetch(`${supabaseUrl}/functions/v1/delete-account`, {
        method: 'POST',
        headers: {
          Authorization:  `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      })

      // Parse once here so no test has to deal with stream consumption.
      deleteStatus = res.status
      deleteBody   = await res.json()
    }, 60_000) // extended timeout: create user + seed + sign-in + edge function call

    // ── Safety net teardown ───────────────────────────────────────────────────
    // If beforeAll throws, or a test assertion aborts before deletion completes,
    // clean up User C so the real DB is not left with test debris.
    // Every statement is wrapped individually — partial setup must not block cleanup.

    afterAll(async () => {
      if (!adminClient || !userCId) return
      for (const [table, col] of [
        ['workout_sets',      'user_id'],
        ['workout_sessions',  'user_id'],
        ['body_weight_logs',  'user_id'],
        ['foods',             'user_id'],
        ['exercises',         'user_id'],
      ]) {
        await ignoreCleanupError(() => adminClient.from(table).delete().eq(col, userCId))
      }
      await ignoreCleanupError(() => adminClient.from('profiles').delete().eq('id', userCId))
      await ignoreCleanupError(() => adminClient.auth.admin.deleteUser(userCId))
    })

    // ── Tests ─────────────────────────────────────────────────────────────────

    test('returns { success: true } for a valid authenticated user', () => {
      expect(deleteStatus).toBe(200)
      expect(deleteBody).toEqual({ success: true })
    })

    test('removes all seeded data from the database', async () => {
      const checks = [
        { table: 'workout_sessions', col: 'user_id' },
        { table: 'body_weight_logs', col: 'user_id' },
        { table: 'foods',            col: 'user_id' },
        { table: 'exercises',        col: 'user_id' },
        { table: 'profiles',         col: 'id'      },
      ]
      for (const { table, col } of checks) {
        const { data, error } = await adminClient
          .from(table)
          .select('id')
          .eq(col, userCId)
        expect(error, `${table} query failed`).toBeNull()
        expect(data, `${table} still has rows for the deleted user`).toHaveLength(0)
      }
    })

    test('removes the auth user — sign-in with deleted credentials fails', async () => {
      const anonClient = createClient(
        process.env.VITE_SUPABASE_URL,
        process.env.VITE_SUPABASE_ANON_KEY,
        { auth: { autoRefreshToken: false, persistSession: false } },
      )
      const { data, error } = await anonClient.auth.signInWithPassword({
        email:    userCEmail,
        password: userCPassword,
      })
      expect(error).toBeTruthy()
      expect(data.user).toBeNull()
    })

    test('rejects requests from non-user tokens — function auth check', async () => {
      // The Supabase gateway requires some JWT to let requests reach function code.
      // Sending the anon key (a role token, not a user JWT) gets past the gateway
      // but our function calls getUser() which returns null for the anon role,
      // triggering our own 401 { error: 'Unauthorized' } response.
      // This directly tests our function's auth guard, not just the gateway's rejection.
      const res = await fetch(
        `${process.env.VITE_SUPABASE_URL}/functions/v1/delete-account`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}`,
          },
        },
      )
      expect(res.ok).toBe(false)
      const json = await res.json()
      expect(json).toHaveProperty('error')
    })
  },
)
