/**
 * RLS cross-user data isolation integration tests (M4).
 *
 * These tests hit the real Supabase database with no mocks. They prove that
 * the RLS policies installed in 20260524000100_lock_down_private_rls.sql
 * actually block User A (a real authenticated JWT) from reading User B's
 * private rows in every protected table.
 *
 * Run with: npm run test:rls
 */

import { createClient } from '@supabase/supabase-js'
import { getMissingE2EEnv } from './helpers/supabaseFixture.js'

// Bench Press is exercise_id = 251 in the catalog (user_id IS NULL, always present).
// Used to seed exercise_prs and exercise_rank_states for User B.
const BENCH_PRESS_ID = 251

// Skip the whole suite if required env vars are absent (local dev without .env.e2e,
// or CI run missing secrets) — same pattern as the Playwright E2E spec.
const missing = getMissingE2EEnv()

let adminClient // service-role client — bypasses RLS for setup/teardown
let userAClient // anon client authenticated as the fixture E2E user
let userAId     // UUID of the existing fixture E2E user
let userBId     // UUID of the ephemeral stranger created for this run

describe.skipIf(missing.length > 0)(
  `RLS cross-user data isolation${missing.length ? ` (SKIPPED — missing env: ${missing.join(', ')})` : ''}`,
  () => {
    // ── Setup ────────────────────────────────────────────────────────────────

    beforeAll(async () => {
      const supabaseUrl = process.env.VITE_SUPABASE_URL
      const anonKey    = process.env.VITE_SUPABASE_ANON_KEY
      // supabaseFixture accepts either key name
      const serviceKey = process.env.E2E_SUPABASE_SERVICE_ROLE_KEY
                      || process.env.SUPABASE_SERVICE_ROLE_KEY

      // Admin client — used for all seeding and teardown (bypasses RLS)
      adminClient = createClient(supabaseUrl, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })

      // Create ephemeral User B with a unique email to avoid CI collision
      const { data: createData, error: createError } =
        await adminClient.auth.admin.createUser({
          email: `rls-test-b-${Date.now()}@example-rls-test.invalid`,
          password: `RlsTest${Date.now()}!`,
          email_confirm: true,
          user_metadata: { full_name: 'RLS Test User B' },
        })
      if (createError) throw createError
      userBId = createData.user.id

      // Seed User B's profile (only `id` is required; all other columns are nullable/defaulted)
      const { error: profileErr } = await adminClient
        .from('profiles')
        .upsert({ id: userBId, username: `rlsb_${userBId.slice(0, 8)}` }, { onConflict: 'id' })
      if (profileErr) throw profileErr

      // Seed one private row per protected table for User B.
      // All inserts use the service-role client (bypasses RLS) so they always succeed
      // regardless of the policies under test.
      const seeds = [
        // workout_sessions — only user_id and started_at required (started_at has default now())
        adminClient.from('workout_sessions')
          .insert({ user_id: userBId, started_at: new Date().toISOString() }),

        // body_weight_logs — column is `weight` (NOT weight_kg), unit defaults to 'kg'
        adminClient.from('body_weight_logs')
          .insert({ user_id: userBId, weight: 80, unit: 'kg' }),

        // exercise_prs — PK is (user_id, exercise_id); best_1rm_kg is NOT NULL
        adminClient.from('exercise_prs')
          .upsert(
            { user_id: userBId, exercise_id: BENCH_PRESS_ID, best_1rm_kg: 120 },
            { onConflict: 'user_id,exercise_id' },
          ),

        // exercise_rank_states — PK is (user_id, exercise_id); scores default to 0
        adminClient.from('exercise_rank_states')
          .upsert(
            { user_id: userBId, exercise_id: BENCH_PRESS_ID },
            { onConflict: 'user_id,exercise_id' },
          ),

        // foods (custom, private) — user_id IS NOT NULL means owner-only per RLS
        adminClient.from('foods')
          .insert({ user_id: userBId, name: 'RLS Secret Food' }),

        // recipes — owner-only per recipes_owner_all RLS policy
        adminClient.from('recipes')
          .insert({ user_id: userBId, name: 'RLS Secret Recipe' }),

        // exercises (custom) — all text columns are NOT NULL; id is serial (omit on insert)
        adminClient.from('exercises')
          .insert({
            user_id: userBId,
            name: 'RLS Secret Exercise',
            category: 'Push',
            equipment: 'Barbell',
            primary_muscles: ['Chest'],
            secondary_muscles: [],
          }),
      ]

      const results = await Promise.all(seeds)
      for (const { error } of results) {
        if (error) throw error
      }

      // Sign in as User A (the existing fixture E2E user) using the anon key.
      // This is exactly how the real app authenticates — a JWT from Supabase auth.
      userAClient = createClient(supabaseUrl, anonKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
      const { error: signInErr } = await userAClient.auth.signInWithPassword({
        email: process.env.E2E_USER_EMAIL,
        password: process.env.E2E_USER_PASSWORD,
      })
      if (signInErr) throw signInErr

      const { data: userData, error: userErr } = await userAClient.auth.getUser()
      if (userErr) throw userErr
      userAId = userData.user.id
    })

    // ── Teardown ─────────────────────────────────────────────────────────────

    afterAll(async () => {
      if (!adminClient || !userBId) return

      if (userAId) {
        await adminClient.from('premium_overrides').delete().eq('user_id', userAId)
      }

      // Delete in child-first (FK-safe) order
      for (const table of [
        'exercise_rank_states',
        'exercise_prs',
        'premium_overrides',
        'workout_sets',
        'workout_sessions',
        'body_weight_logs',
        'nutrition_logs',
        'recipes',
        'foods',
      ]) {
        await adminClient.from(table).delete().eq('user_id', userBId)
      }

      // Custom exercises only — .eq('user_id', userBId) excludes catalog rows (user_id IS NULL)
      await adminClient.from('exercises').delete().eq('user_id', userBId)
      await adminClient.from('profiles').delete().eq('id', userBId)
      await adminClient.auth.admin.deleteUser(userBId)
    })

    // ── Isolation tests ───────────────────────────────────────────────────────
    // User A is authenticated but is NOT a friend of User B.
    // Every query is filtered to user_id = userBId so the only way data
    // could come back is if an RLS policy grants cross-user access.

    test('User A cannot read User B workout_sessions', async () => {
      const { data, error } = await userAClient
        .from('workout_sessions')
        .select('id')
        .eq('user_id', userBId)
      expect(error).toBeNull()
      expect(data).toHaveLength(0)
    })

    test('User A cannot read User B body_weight_logs', async () => {
      const { data, error } = await userAClient
        .from('body_weight_logs')
        .select('id')
        .eq('user_id', userBId)
      expect(error).toBeNull()
      expect(data).toHaveLength(0)
    })

    test('User A cannot read User B exercise_prs', async () => {
      const { data, error } = await userAClient
        .from('exercise_prs')
        .select('best_1rm_kg')
        .eq('user_id', userBId)
      expect(error).toBeNull()
      expect(data).toHaveLength(0)
    })

    test('User A cannot read User B exercise_rank_states', async () => {
      const { data, error } = await userAClient
        .from('exercise_rank_states')
        .select('current_score')
        .eq('user_id', userBId)
      expect(error).toBeNull()
      expect(data).toHaveLength(0)
    })

    test('User A cannot read User B custom foods', async () => {
      const { data, error } = await userAClient
        .from('foods')
        .select('id')
        .eq('user_id', userBId)
      expect(error).toBeNull()
      expect(data).toHaveLength(0)
    })

    test('User A cannot read User B recipes', async () => {
      const { data, error } = await userAClient
        .from('recipes')
        .select('id')
        .eq('user_id', userBId)
      expect(error).toBeNull()
      expect(data).toHaveLength(0)
    })

    test('User A cannot create a recipe owned by User B', async () => {
      const { error } = await userAClient
        .from('recipes')
        .insert({ user_id: userBId, name: 'Forged Recipe' })
      expect(error).toBeTruthy()
    })

    test('User A cannot read User B custom exercises', async () => {
      const { data, error } = await userAClient
        .from('exercises')
        .select('id')
        .eq('user_id', userBId)
      expect(error).toBeNull()
      expect(data).toHaveLength(0)
    })

    test('User A cannot read User B profile directly', async () => {
      const { data, error } = await userAClient
        .from('profiles')
        .select('id, bodyweight, gender')
        .eq('id', userBId)
      expect(error).toBeNull()
      expect(data).toHaveLength(0)
    })

    test('premium_overrides table denies direct authenticated client access', async () => {
      const { error: selectError } = await userAClient
        .from('premium_overrides')
        .select('user_id, enabled')
        .eq('user_id', userAId)
      expect(selectError).toBeTruthy()

      const { error: insertError } = await userAClient
        .from('premium_overrides')
        .insert({ user_id: userAId, enabled: true, reason: 'forbidden' })
      expect(insertError).toBeTruthy()

      const { error: updateError } = await userAClient
        .from('premium_overrides')
        .update({ enabled: true })
        .eq('user_id', userAId)
      expect(updateError).toBeTruthy()

      const { error: deleteError } = await userAClient
        .from('premium_overrides')
        .delete()
        .eq('user_id', userAId)
      expect(deleteError).toBeTruthy()
    })

    test('has_premium_override only reveals the caller own enabled override', async () => {
      await adminClient
        .from('premium_overrides')
        .delete()
        .in('user_id', [userAId, userBId])

      const { error: grantBError } = await adminClient
        .from('premium_overrides')
        .upsert(
          { user_id: userBId, enabled: true, reason: 'rls stranger grant' },
          { onConflict: 'user_id' },
        )
      expect(grantBError).toBeNull()

      const { data: beforeOwnGrant, error: beforeOwnGrantError } = await userAClient
        .rpc('has_premium_override')
      expect(beforeOwnGrantError).toBeNull()
      expect(beforeOwnGrant).toBe(false)

      const { error: grantAError } = await adminClient
        .from('premium_overrides')
        .upsert(
          { user_id: userAId, enabled: true, reason: 'rls own grant' },
          { onConflict: 'user_id' },
        )
      expect(grantAError).toBeNull()

      const { data: afterOwnGrant, error: afterOwnGrantError } = await userAClient
        .rpc('has_premium_override')
      expect(afterOwnGrantError).toBeNull()
      expect(afterOwnGrant).toBe(true)

      const { error: revokeAError } = await adminClient
        .from('premium_overrides')
        .update({ enabled: false })
        .eq('user_id', userAId)
      expect(revokeAError).toBeNull()

      const { data: afterRevoke, error: afterRevokeError } = await userAClient
        .rpc('has_premium_override')
      expect(afterRevokeError).toBeNull()
      expect(afterRevoke).toBe(false)
    })

    // ── Positive tests ────────────────────────────────────────────────────────
    // These prove the lockdown did NOT accidentally remove legitimate access paths.

    test('Global catalog exercises (user_id IS NULL) remain readable by any user', async () => {
      const { data, error } = await userAClient
        .from('exercises')
        .select('id, name')
        .is('user_id', null)
        .limit(5)
      expect(error).toBeNull()
      expect(data.length).toBeGreaterThan(0)
    })

    test('Global catalog foods (user_id IS NULL) remain readable by any user', async () => {
      // Insert a null-owner food via admin then confirm User A can read it
      const { data: inserted, error: insertErr } = await adminClient
        .from('foods')
        .insert({ user_id: null, name: 'RLS Test Global Food' })
        .select('id')
        .single()
      expect(insertErr).toBeNull()

      const { data, error } = await userAClient
        .from('foods')
        .select('id')
        .eq('id', inserted.id)
      expect(error).toBeNull()
      expect(data).toHaveLength(1)

      // Clean up inline — this row is not tied to userBId so afterAll won't catch it
      await adminClient.from('foods').delete().eq('id', inserted.id)
    })

    test('get_public_profiles exposes User B social identity but NOT private fields', async () => {
      // Non-owner profile discovery goes through this explicit SECURITY DEFINER
      // RPC instead of the dropped public_profiles view.
      const { data, error } = await userAClient
        .rpc('get_public_profiles', { p_profile_ids: [userBId] })
      expect(error).toBeNull()
      expect(data).toHaveLength(1) // row visible — by design

      const row = data[0]
      expect(row).toHaveProperty('id', userBId)
      expect(row).toHaveProperty('username')
      // Private columns must not exist on the view at all
      expect(row).not.toHaveProperty('bodyweight')
      expect(row).not.toHaveProperty('gender')
      expect(row).not.toHaveProperty('age')
      expect(row).not.toHaveProperty('calories_goal')
    })
  },
)
