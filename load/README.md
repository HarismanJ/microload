# Load Testing

This harness stress-tests the Supabase-backed backend flows without driving the UI.
Use it against a staging Supabase project, not production.

## Environment

Create a local `.env.load` file:

```bash
LOAD_TEST_TARGET=staging
LOAD_SUPABASE_URL=https://your-staging-project.supabase.co
LOAD_SUPABASE_ANON_KEY=your-staging-anon-key
LOAD_SUPABASE_SERVICE_ROLE_KEY=your-staging-service-role-key
LOAD_TEST_USER_COUNT=25
LOAD_TEST_PASSWORD=Use-A-Strong-Staging-Only-Password
```

The scripts also accept the existing `VITE_SUPABASE_URL`,
`VITE_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` names.
Hosted Supabase targets require `LOAD_TEST_TARGET=staging` unless you
explicitly set `LOAD_TEST_ALLOW_ANY_TARGET=1`.

## Commands

```bash
npm run load:seed
npm run load:smoke
npm run load:baseline
npm run load:comprehensive
npm run load:spike
npm run load:cleanup
```

Profiles:

- `load:smoke`: 5 virtual users for 2 minutes
- `load:baseline`: 25 virtual users for 10 minutes
- `load:comprehensive`: 50 virtual users for 10 minutes with broader scenario coverage
- `load:spike`: 100 virtual users for 3 minutes

Override any profile with:

```bash
LOAD_TEST_VUS=10 LOAD_TEST_DURATION_SEC=60 npm run load:smoke
```

## Covered Flows

- Auth sign-in once per virtual user
- Dashboard-style reads from `profiles`, `workout_sessions`,
  `body_weight_logs`, and `nutrition_logs`
- Workout session creation plus `finish_workout_session_atomic`
- Training plan creation, plan-day workout completion, and plan metadata reads
- PR and exercise rank-state updates through workout completion
- Per-exercise rest preference upserts
- Two-user battle invite/accept flow, battle room events, workout logging, and
  `record_battle_result_atomic`
- Nutrition log inserts
- Body-weight log inserts
- Profile preference/bodyweight updates
- Public profile lookup and friendship search RPCs
- Calendar/month reads across workouts, nutrition, and bodyweight
- Custom food create/read/log/delete lifecycle
- Nutrition dashboard reads with micronutrient fields
- Workout day detail reads including `workout_sets` joined to `exercises`

The runner reports total requests, error rate, p50/p95/p99 latency, and
per-scenario success counts. It exits non-zero when error rate or p95 latency
exceeds the selected profile's threshold.

By default, created load-test data is cleaned up after a run. Keep data for
inspection with:

```bash
LOAD_TEST_CLEANUP=0 npm run load:smoke
```

`npm run load:cleanup` removes load-test rows for seeded users. Add
`LOAD_TEST_DELETE_USERS=1` to delete the seeded auth users too.
