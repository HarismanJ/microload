# LiftLog - Living Test & Debug Plan

## Context
Current as of 2026-05-30: the Vitest foundation, expanded component coverage, whole-`src/**` coverage gate, and Playwright E2E suite are in place. The Vitest suite has 71 test files and 1031 / 1031 passing tests. Latest verified whole-`src/**` coverage is 59.13% statements, 53.78% branches, 52.79% functions, and 61.47% lines. Playwright has 11 / 11 passing Supabase-backed E2E journeys when `.env.e2e` is configured.

Track A is fully complete. Phase 1, Phase 2, Phase 3 low-coupling component coverage, focused Home loading coverage, and all Track A cleanup files are done. Track A added 8 total new test files: `exerciseOptions`, `muscleGroups`, `useRestTimer`, `useSwipe`, `useFocusTrap`, `usdaFoods`, `friends`, and `restNotification`. The `restNotification.js` tests (37 tests) cover all three execution paths — native Capacitor, web+ServiceWorker, and web setTimeout fallback — using `vi.resetModules()` + `vi.doMock` for the module-level constant, per-describe navigator.serviceWorker mocking, and `vi.useFakeTimers()` for the fallback path.

---

## Framework Selection

**Vitest + @testing-library/react + happy-dom + @vitest/coverage-v8 + Playwright**

Rationale: Vitest inherits the Vite 8 config natively — no ESM transform gymnastics needed for `@supabase/supabase-js` v2 (which is ESM-only and breaks Jest). `@testing-library/react` is already in `node_modules`. happy-dom is faster than jsdom for pure-math tests. Playwright covers the real browser + Supabase flows that are too integrated for meaningful component tests.

### Installed test packages
```sh
npm install --save-dev vitest @testing-library/react happy-dom @vitest/coverage-v8 @playwright/test
```

### Files already created
- `vitest.config.js` (updated: added `env.VITE_USDA_API_KEY` for usdaFoods tests; coverage now includes `src/**` and emits `json-summary`)
- `src/__tests__/setup.js` (Capacitor + Sentry mocks)
- `src/__tests__/lib/*.test.{js,jsx}` (43 lib test files — Phase 1, Phase 2, utility/persistence, Track A, drop-set audit, battle projection, plus newer additions: `admob`, `appVersion`, `backStack`, `purchases`, `workoutCompletion`, and Tier 1 fills: `streakUtils`, `friendlyError`, `offFoods`)
- `src/__tests__/components/WorkoutSummary.test.jsx`
- `src/__tests__/components/Achievements.test.jsx`
- `src/__tests__/components/ProgressionSuggestion.test.jsx`
- `src/__tests__/components/PlateCalculator.test.jsx`
- `src/__tests__/components/AppErrorBoundary.test.jsx`
- `src/__tests__/components/RankBadge.test.jsx`
- `src/__tests__/components/HomeLoading.test.jsx`
- `src/__tests__/components/Auth.test.jsx`
- `src/__tests__/components/BarcodeScanner.test.jsx`
- `src/__tests__/components/FriendProfileDetail.test.jsx`
- `src/__tests__/components/HomeWeightRefresh.test.jsx`
- `src/__tests__/components/Nutrition.test.jsx`
- `src/__tests__/components/NutritionFoodPickerScanner.test.jsx`
- `src/__tests__/components/Ranks.saveBW.test.jsx`
- `src/__tests__/components/Workout.finish.test.jsx`
- `src/__tests__/components/Workout.bodyweightGate.test.jsx`
- `src/__tests__/components/TierProgressBar.test.jsx`
- `src/__tests__/components/WorkoutSummary.recap.test.jsx`
- `src/__tests__/components/ForceUpdate.test.jsx`
- `src/__tests__/components/RestWheelPicker.test.jsx`
- `src/__tests__/components/Paywall.test.jsx`
- `src/__tests__/components/Profile.test.jsx`
- `src/__tests__/components/nutrition/CreateFood.test.jsx`
- `src/__tests__/components/profile/WeightChart.test.jsx`
- `src/__tests__/components/profile/WorkoutCalendar.test.jsx`
- `src/__tests__/components/profile/BodyWeightDetail.test.jsx`
- `src/__tests__/components/profile/FriendsSection.test.jsx`
- `src/__tests__/components/profile/WorkoutDayDetail.test.jsx`
- `src/__tests__/lib/useFocusTrap.test.jsx` (JSX extension — uses renderHook + fireEvent)
- `playwright.config.js`
- `e2e/README.md`
- `e2e/workout-critical-path.spec.js`
- `e2e/helpers/appFlows.js`
- `e2e/helpers/supabaseFixture.js`
- `.github/workflows/ci.yml`

### Scripts in package.json
```json
"test": "vitest run",
"test:watch": "vitest",
"test:coverage": "vitest run --coverage",
"test:e2e": "playwright test",
"test:e2e:headed": "playwright test --headed",
"test:e2e:ui": "playwright test --ui"
```

---

## Mocking Strategy

**Supabase** — Mock the singleton at module level in tests that need it. For `progressiveOverload.js`, Supabase is passed as a function argument to `fetchRecentSessions` — just pass a mock directly.

**Capacitor** — Global mock in `src/__tests__/setup.js`:
```js
vi.mock('@capacitor/core', () => ({ Capacitor: { getPlatform: vi.fn(() => 'web') } }))
vi.mock('@capacitor/local-notifications', () => ({ LocalNotifications: { schedule: vi.fn(), cancel: vi.fn(), checkPermissions: vi.fn(), requestPermissions: vi.fn() } }))
```

**Sentry** — Global mock in setup.js:
```js
vi.mock('@sentry/react', () => ({ init: vi.fn(), reactErrorHandler: vi.fn(() => () => {}), browserTracingIntegration: vi.fn(), replayIntegration: vi.fn() }))
```

**localStorage** — Built into happy-dom. Call `localStorage.clear()` in `beforeEach`.

**Notification API** — Polyfill in setup.js for `restNotification.js` web path.

**Playwright E2E** — Do not mock Supabase. Use `.env.e2e`, the fixture user, and `resetE2EData()` so each browser test exercises real auth, UI state, and database persistence.

---

## Phase 1 - Foundation (complete)

Goal achieved: pure-logic unit tests run locally and in CI with no Supabase dependency.

### Files to test (in priority order)

| File | Lines | Key test cases |
|------|-------|----------------|
| `src/lib/orm.js` | 44 | reps=1 identity; reps=30 Brzycki/Epley average; reps>30 returns null; zero reps returns null; non-finite weight returns null; bodyweight path: `weight + bodyweightKg` total load, then subtract BW; lbs unit pass-through |
| `src/lib/liftMath.js` | 86 | `toKg(100,'lbs')`=45.36; `fromKg(45.36,'lbs')`≈100; null/non-finite passthrough; `getSetVolumeKg` barbell and bodyweight paths; `isWeightWithinInputRange` below/above bounds; `fmtCompact` abbreviation (<10k passthrough, k/M suffixes) |
| `src/lib/plateUtils.js` | 110 | `snapToPlates(100,'kg','Barbell')` greedy = 100; `snapToPlates(21,'kg','Barbell')` → rounds up to 22.5 (smallest plate used when remainder>0); target ≤ bar weight returns barWeight; lbs path; non-plate equipment returns targetKg unchanged; `weightToPlates` / `platesToWeight` round-trip inverse |
| `src/lib/inputValidation.js` | 201 | empty email; >254 chars; bad format; valid; short/long password; username normalization (removes @, lowercases); username too short; username with space; bodyweight lbs conversion; below min kg; `validateNumber` non-number; excess decimals; `validateNutritionForm` missing serving_size |
| `src/lib/rollingRanks.js` | 108 | null lastRankedAt → no decay; same-day → no decay; 29 days → no decay (grace); 31 days → 0.03 decay; 200 days → capped at 6.0 decay; EMA update formula; `clampContinuousTierScore` bounds; `getContinuousTierScore` mid-tier value |
| `src/lib/chartPeriods.js` | 35 | 1w filters old items; 'all' returns everything; invalid dates excluded |
| `src/lib/planDeload.js` | 119 | `isScheduledDeloadWeek` week 4 with interval=4 → true; week 3 → false; `getDeloadIntervalFromPlan` from preferences string; `getActivePlanWeek` 14 days = week 3; cardio exercise reduces durationSeconds by 40%; strength reduces sets by 50% (ceil) |
| `src/lib/workoutSets.js` | — | `normalizeStrengthSet` round-trip; `markExerciseSetCompleted` sets done=true on correct index only; `restBeforeSeconds` derived from prev `completedAt`; `clearExerciseSetCompletion` clears only target set; `normalizeCardioSet` clamps duration; `set_type`/`set_group_index` DB alias reads; `defaultSet()` includes `setGroupIndex: null`; working-set indexing skips drops; malformed/orphan drop groups are repaired |
| `src/lib/localDraftSanitizers.js` | 174 | null → null; version mismatch → null; excess exercises stripped at MAX_DRAFT_EXERCISES; reps>10000 clamped; rest>3600 clamped; expired restTimer → null; non-array hiddenTemplateIds → []; `setType` round-trip (invalid → 'normal'); `setGroupIndex` round-trip (negative → null); plan/progression metadata survives resume; malformed drop groups are repaired |

### vitest.config.js
```js
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    setupFiles: ['./src/__tests__/setup.js'],
    include: ['src/**/*.test.{js,jsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/lib/**'],
      exclude: ['src/lib/supabase.js', 'src/lib/battles.js'],
    },
    globals: true,
  },
})
```

### ESLint rules added (Phase 1)
Added to `eslint.config.js` rules:
```js
'eqeqeq': ['error', 'always', { null: 'ignore' }],
'valid-typeof': ['error', { requireStringLiterals: true }],
'use-isnan': 'error',
'no-fallthrough': 'error',
'no-empty': ['error', { allowEmptyCatch: false }],  // surfaces silent catch blocks in restNotification.js
```

### Pending Sentry trace-rate fix
If not already applied in the current branch, update `src/instrument.js`:
```js
tracesSampleRate: import.meta.env.MODE === 'production' ? 0.1 : 1.0,
```

### CI (.github/workflows/ci.yml)
```yaml
name: CI
on:
  push: { branches: [main] }
  pull_request: { branches: [main] }
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npm run lint
      - run: npm run test
        env:
          VITE_SENTRY_DSN: ''
          VITE_SUPABASE_URL: 'https://placeholder.supabase.co'
          VITE_SUPABASE_ANON_KEY: 'placeholder'
      - run: npm run build
        env:
          VITE_SENTRY_DSN: ''
          VITE_SUPABASE_URL: 'https://placeholder.supabase.co'
          VITE_SUPABASE_ANON_KEY: 'placeholder'
          SENTRY_ORG: ''
          SENTRY_PROJECT: ''
          SENTRY_AUTH_TOKEN: ''
```

**Actual Phase 1 outcome:** foundational pure-lib tests are in place for the 9 targeted files, CI is configured, and the global test setup handles Capacitor, Sentry, localStorage, and Notification behavior.

---

## Phase 2 - Complex Algorithm Coverage (mostly complete)

Goal: cover high-risk algorithmic files before they produce silent regressions. The original highest-risk targets now have broad regression coverage, and the remaining Phase 2 work is optional depth rather than an urgent gap.

### `src/lib/battles.js` weighted scoring - current slice complete

`src/__tests__/lib/battles.test.js` now covers the weighted 0-100 scoring layer and mocked recap paths. `src/__tests__/components/WorkoutSummary.test.jsx` adds the first focused battle display component test.

Current covered scenarios:
- `scoreBattleMetrics` splits close metrics, scores dominant margins by magnitude, handles 0-vs-positive values, redistributes unavailable metric weight, and returns 50-50 when nothing is available
- `buildBattleMetrics` uses the exact configured weights for strength, cardio, and hybrid modes
- `loadBattleRecap` returns `scoringVersion`, `scoreTotal`, weighted `points`, enriched metrics, and non-scoring highlights from `workout_finished`
- stale battles remain voided/cancelled even under weighted scoring
- cancelled battle winner logic when one user leaves
- cardio recap with MET-minutes, duration, density, and overall density
- hybrid recap with mixed strength/cardio events
- old battle events without `highlights` return empty highlight arrays
- `WorkoutSummary` renders weighted metric point labels and "Not scored" highlights

### `src/lib/battleProjection.js` remote live feed - current slice complete

`src/__tests__/lib/battleProjection.test.js` has 3 passing tests. Latest coverage: 71.91% statements, 51.40% branches, 78.94% lines.

Covered scenarios:
- `set_completed` events preserve `setType` and `setGroupIndex`, so remote battle viewers see parent rows plus D1/D2 drop rows instead of plain numbered sets
- legacy `set_completed` events without drop metadata remain compatible and default to normal sets
- grouped `set_removed` events remove the parent working set and all associated drop sets from the remote projection

### `src/lib/progressiveOverload.js` (1,328 lines) - expanded coverage complete

`src/__tests__/lib/progressiveOverload.test.js` now has 46 passing tests.

Covered scenarios include:

| Scenario | Expected action |
|----------|----------------|
| No history (`sessions: []`) | `'first_time'` → returns null suggestion |
| No prior session history but current workout has a completed working set | Maintain the completed set values as the anchor and still apply same-workout fatigue |
| Last 2 sessions both hit rep ceiling | `'increase_weight'` |
| 3+ sessions with estimatedOrmKg < expectedE1rmKg × 0.93 | `'deload'` |
| Session date 31+ days ago | `'maintain'` with `planMode: 'reacclimate_hold'` |
| Session date 29 days ago | `planMode: 'reacclimate_reduce_two'`, reduced weight |
| Post-deload guard (progressionEvent='deload' in last session) | No deload triggered yet |
| All sets are bodyweight-only (weightKg < 0.25) | `'increase_reps'` not `'increase_weight'` |
| All current sets done | Returns null (no active set) |
| `getWeightIncrement('Barbell','kg')` | Returns 2.5 |
| `getWeightIncrement('Dumbbell','lbs')` | Returns 2.268 (5lbs in kg) |

Additional coverage added:
- `fetchRecentSessions` empty/error responses, Supabase query chaining, grouping, sorting, lbs conversion, e1RM normalization, rest clamping, and current-session exclusion
- non-empty `analyzeExerciseHistory` compatibility path
- weighted/bodyweight failure thresholds, post-deload guards, multi-set fatigue cascade, cross-exercise pre-fatigue, cross-fatigue correction, and e1RM floor behavior

Branch depth pass (6 new tests):
- Bodyweight cross-exercise pre-fatigue at Set 0: asserts `suggestedReps < baseline` (no-priorExercises baseline) and `crossExerciseFatiguePct ≈ 0.08`, with reasoning containing 'Pre-fatigued'
- Set 1 correction: overperformed (reps: 15) yields lower `crossExerciseFatiguePct` than underperformed (reps: 5)
- `reps_first` bias below upper bound → `action: 'increase_reps'`; at upper bound → `action` in `/(maintain|increase_weight)/`
- Bodyweight maintenance mode → `action: 'maintain'`, `planMode: 'maintenance'`, `suggestedWeightKg: 0`
- Weighted maintenance mode → `action: 'maintain'`, `planMode: 'maintenance'`, `isBodyweightOnly: false`

Drop set awareness (2 new tests):
- `activeSetIndex` skips drop sets — `[normal(done), dropset(undone), normal(undone)]` → suggestion is non-null and targets the second working set
- All remaining undone sets are drops → `null` returned (no working set to suggest for)

Resume/draft safety coverage:
- Draft sanitizer preserves plan periodization, intensity, bias, deload, root plan references, and set-level `progressionEvent` metadata so resumed workouts do not feed incomplete context into the progression engine.

### `src/lib/exerciseSearch.js` (122 lines)
- Exact match → 100; prefix match → 90
- Typo within tolerance (edit dist ≤ 1 for 5-char token) → non-zero score
- Typo beyond tolerance → 0
- Empty query → always matches

### `src/lib/muscleWorkload.js` - expanded coverage complete

`src/__tests__/lib/muscleWorkload.test.js` covers both the pure workload builder and the Supabase-backed `fetchWeeklyMuscleWorkload` path. Latest coverage: 97.54% statements, 75.63% branches, 98.93% lines.

Covered scenarios:
- `getHeatBucket(0)` = 0; `getHeatBucket(2.4)` = 4; `getHeatBucket(3)` = 5
- Secondary muscles get 0.33× credit (`SECONDARY_MUSCLE_CREDIT` from `muscleStimulus.js`)
- Primary-to-secondary overlap credits correctly
- missing user id returns an empty local-week workload without calling Supabase or `fetchExercises`
- successful fetch loads finished sessions, calls `fetchExercises(userId)`, filters falsy session ids, queries sets, and builds expected chest/front-delt effective sets
- no sessions returns an empty workload without querying `workout_sets`
- session query errors and sets query errors reject with the original error

### `src/lib/overtrain.js` (132 lines)

Current coverage: 94.80% statements, 88.05% branches, 100% lines.

- Empty groups → `{ hasWarning: false }`
- `targetRatio: 4.5`, `heatBucket: 5` → `{ type: 'overuse', severity: 'high' }`
- `targetRatio: 3.5` → `severity: 'moderate'`; `targetRatio: 2.5` → `severity: 'low'` (requires `heatBucket: 5`)
- Current=22, prior=10 sets → `{ type: 'volume_spike', severity: 'high' }`
- Current=13, prior=8 sets (spikePct=0.625 ≤ 0.75) → `severity: 'low'`
- `trainedDayCount: 5`, `hoursSinceLast: 20h` → `{ type: 'high_frequency', severity: 'high' }`
- `trainedDayCount: 5`, `hoursSinceLast: 30h` (≥24 and <36) → `severity: 'moderate'`
- `trainedDayCount: 4`, `hoursSinceLast: 30h` (fails ≥5 checks) → `severity: 'low'`
- Priority: overuse > volume_spike; goal passed through from `currentWorkload.goal`

### `src/lib/calorieMath.js` (56 lines)
- Empty exercises → 0
- Null bodyweightKg uses DEFAULT_BODYWEIGHT_KG
- Single cardio: MET × weight × hours = kcal
- Result always `Math.round()` — never float

### `src/lib/weightTrend.js` (204 lines) — `buildWeightPaceCalorieCoach`
- No trendModeConfig → `'no_pace'`
- < 4 weigh-ins → `'needs_data'`
- Trend matches target → `'on_pace'`
- Too slow for cut → `'deficit'`, positive `adjustmentKcal`
- Adjustment capped at MAX_DAILY_CALORIE_ADJUSTMENT (250 kcal)
- Gap < 0.1 kg/week dead zone → `'on_pace'`

### `src/lib/trainingPlanGenerator.js` (1,500 lines)

Current coverage: 85.5% statements, 70.45% branches, 91.18% lines.

- Missing required fields throws; empty exercise library throws
- Valid 3-day hypertrophy plan → `days.length === 3`, each day has non-empty `exercises`
- `normalizeTrainingPlanForm` clamps `daysPerWeek` to [2, 7], rejects unknown enum values, normalizes exact schedule days, filters invalid equipment
- `focusAreas` filter: invalid entries removed, valid entries preserved
- Exact scheduled days preserved in output (`trainingDays`, `scheduledDay` per day, `deloadInterval`)
- Linear periodization → `periodizationStyle: 'linear'`, `progression.style: 'linear'` on all exercises
- Maintenance periodization → `periodizationStyle: 'maintenance'` on all exercises
- Undulating periodization → all strength exercises have `intensityTag` in `['heavy', 'volume', 'light']`
- Cardio goal → `preferences.schedule.selectedSplit` contains 'cardio', cardio exercises have `durationSeconds > 0`
- Hybrid goal → `plan.goal === 'hybrid'`, cardio exercises exist alongside strength exercises
- `avoid` terms excluded from all exercise names
- `normalizeTrainingPlan(null)` → null; `normalizeTrainingPlan(plan)` preserves `name`, `goal`, `days_per_week`, adds `preferences.qualityScore`
- `getTrainingPlanGoalLabel('hypertrophy')` → `'Hypertrophy'`; unknown label → `'Training'`

### `src/lib/trainingPlanAdaptation.js` - complete current slice

`src/__tests__/lib/trainingPlanAdaptation.test.js` has 18 passing tests. Latest coverage: 95.28% statements, 84.82% branches, 100% lines.

Covered scenarios:
- `buildPlanAdaptation` guard/no-op paths for missing plan/day ids and missing completed plan exercises
- ignored non-plan exercises, completed-set accounting, and `planWeek` precedence
- `reduce_volume`, `trim_duration`, `increase_target`, `hold_or_reduce`, and `keep_plan` recommendations
- rounded `completionRate` and `durationRatio` metrics
- planned strength-set accounting ignores `dropset` and `warmup` rows so accessory drop-set work cannot inflate completion rate or top-range/missed-range metrics
- `applyPlanAdaptation` no-op paths, camelCase/snake_case day ids, adaptive coach preferences, ordered multi-adjustment application, strength/cardio target increases, volume reductions, and duration trims
- performance regression guard: applying an adaptation preserves unrelated plan preferences like focus areas, schedule, periodization, and adaptive coach settings

`parseRepRange` branch depth (4 new tests via `buildPlanAdaptation`):
- `planRepRange` as `{ low, high }` object → correctly counts sets hitting the top range
- `planRepRange` as `{ lower, upper }` aliases → same counting behavior
- `planRepRange` as `{ low: 0, high: 10 }` (invalid — `low > 0` fails) → falls through to `Number({...})` = NaN → exercise skipped, `targetableSets: 0`
- `planRepRange` as bare number (e.g. `10`) → `String('10')` → no regex → `Number(10)` → `{ low: 10, high: 10 }` → all sets hit top range

### `src/lib/strengthStandards.js` - complete current slice

`src/__tests__/lib/strengthStandards.test.js` has 12 passing tests. Latest coverage: 100% statements, 89.28% branches, 100% lines.

Covered scenarios:
- rank constants, `TIER_GROUPS`, `TIERS`, `tierGroup`, and `tierColor`
- `expandAnchors` interpolation, rounding, and Bench Press catalog sanity
- `getTierIdx` below/exact/between/above threshold behavior
- `getProgress` clamping, final tier, equal adjacent thresholds, and middle-tier progress
- `weightForOrm` 1-rep identity, common multi-rep conversions, and current invalid/edge behavior
- dynamic anchor loading singleton/cache behavior through concurrent `getAnchors()` calls and `anchorsOrNull()`

### `src/lib/foodEditor.js` - complete current slice

`src/__tests__/lib/foodEditor.test.js` covers user-facing food form metadata, normalization, validation, payload building, and conversion back into food objects. Latest coverage: 100% statements, 91.30% branches, 100% lines.

Covered scenarios:
- `FOOD_FORM_FIELDS` contains the required core fields and `EMPTY_FOOD_FORM` defaults serving size/unit and blank optional nutrition values
- `foodToFormValues` converts missing food data into safe strings and rounds calories/minerals/macros/iron with the current precision rules
- `getFoodFormError` mirrors nutrition validation messages and `isFoodFormValid` separates invalid required fields from complete valid forms
- `buildFoodPayload` includes `user_id`, trims strings, converts blank brand to `null`, defaults bad serving sizes to 100, and normalizes optional nutrition numbers
- `foodFromFormValues` preserves unrelated base food fields, overwrites editable nutrition fields, and handles `persistAsNew`

### `src/lib/foodSearch.js` - complete current slice

`src/__tests__/lib/foodSearch.test.js` covers local/remote food matching, aliases, scoring, sorting, stored-food comparison, and deduping. Latest coverage: 93.38% statements, 82.96% branches, 96.90% lines.

Covered scenarios:
- search normalization collapses punctuation/case and aliases map `pb2`, `pb fit`, `yoghurt`, `garbanzo beans`, and `aubergine`
- empty, multi-token, compact, and fuzzy queries match as expected while short-token and distant typos are rejected
- generic/branded scoring respects `is_branded`, `data_type`, missing brand fallback, and simple generic query preference
- exact name, full text, prefix, contains, and fuzzy matches score in descending order
- sorting uses score first, then generic preference, shorter names, and alphabetical order
- search keys normalize name/brand/unit and round calories
- stored-food matching tolerates case/punctuation and tiny numeric differences
- merged results filter non-matches, dedupe local/remote duplicates by search key, prefer remote order for duplicates, and return sorted results

### Performance regression coverage

- `src/__tests__/components/Achievements.test.jsx` covers the nutrition-day count RPC success path and the missing-function fallback.
- `src/__tests__/lib/trainingPlanAdaptation.test.js` guards that applying plan adaptations preserves plan preferences.
- `src/__tests__/lib/strengthStandards.test.js` guards the dynamic strength-standards anchor singleton/cache contract.
- `src/__tests__/lib/cache.test.js` covers runtime cache eviction, startup snapshot invalidation, and account-deletion cleanup helpers.
- `src/__tests__/lib/workoutCount.test.js` covers direct `profiles.workout_count` reads and the `workout_sessions` count fallback.

### Utility / persistence coverage boost

- `src/__tests__/lib/theme.test.js` covers theme CSS variables, storage fallbacks, user-scoped cached themes, and clearing cached theme data.
- `src/__tests__/lib/incrementSettings.test.js` covers progression increment and starting-weight localStorage behavior, invalid values, and swallowed write errors.
- `src/__tests__/lib/workoutDraft.test.js` covers solo/shared draft keys, sanitization, malformed JSON, expiration windows, write skipping, and scoped clearing.
- `src/__tests__/lib/cache.test.js` covers runtime cache lifecycle, TTL expiry, eviction limits, startup snapshots, invalidation, logout cleanup, account deletion cleanup, and calendar cache keys.
- `src/__tests__/lib/workoutCount.test.js` covers profile count reads, missing-column fallback, count-query chaining, field normalization, and profile/count error paths.

### ESLint additions (Phase 2) ✓
Installed `eslint-plugin-react` and `eslint-plugin-import`. Added to `eslint.config.js`:
```js
'react/jsx-key': ['error', { checkFragmentShorthand: true }],  // 0 violations
'react/no-array-index-key': 'warn',                            // 13 intentional violations, kept as warn
'import/no-cycle': 'error',                                    // 0 violations
```

### Sentry additions (Phase 2) ✓
- `src/App.jsx` — `Sentry.setUser({ id, email })` on login, `Sentry.setUser(null)` on logout, inside `prevUserId !== nextUserId` guard in `onAuthStateChange`
- `src/components/Workout.jsx` — `Sentry.addBreadcrumb` on: workout started (with `sessionId`), set completed (with `exerciseId`, `setIdx`), workout finished
- `generateTrainingPlan` Sentry scope — deferred (optional)

### Dev debug utility (Phase 2)
Add to `src/main.jsx` under `import.meta.env.DEV` guard:
```js
window.__liftlog = {
  supabase,
  clearDraft: () => localStorage.removeItem('workoutDraft'),
  inspectDraft: () => JSON.parse(localStorage.getItem('workoutDraft') || 'null'),
}
```

**Current Phase 2 outcome:** core algorithm and user-facing pure-lib coverage is in place across the progression engine, battle recap/scoring, battle live-feed projection, training plan generation, training plan adaptation, strength standards, weight trend, workload, overtraining, calorie math, exercise search, food editing, food search, USDA food lookup, friends, cache infrastructure, workout counts, theme storage, increment settings, workout draft persistence, rest notifications, lookup modules, and hooks. Remaining Phase 2 work is optional branch-depth cleanup, mainly targeted edge cases in `trainingPlanGenerator.js`.

---

## Phase 3 — Component Tests + E2E (current)

### Component coverage current slice complete

Low-coupling component tests:
- `WorkoutSummary.test.jsx` covers battle recap display for weighted metric point labels and "Not scored" highlights.
- `Achievements.test.jsx` covers the nutrition-day RPC path and fallback behavior when the RPC is unavailable.
- `ProgressionSuggestion.test.jsx` covers null/unknown suggestions, display copy, kg/lbs apply callbacks, settings panel behavior, outside click close, and validation.
- `PlateCalculator.test.jsx` covers barbell/bodyweight total calculation, plate add/clear interactions, custom bar validation, confirm callbacks, and animated close.
- `AppErrorBoundary.test.jsx` covers normal render, crash fallback, dev error capture, and refresh action.
- `RankBadge.test.jsx` covers supported tier SVG output, sizing, strength-standard color wiring, and unsupported tier null rendering.
- `HomeLoading.test.jsx` covers Home's new skeleton loading state, cached/startup data rendering during pending refresh, and failed initial-load retry state.

Focused higher-coupling component slices (added since 2026-05-18):
- `Auth.test.jsx` covers the sign-in/sign-up flow surface.
- `BarcodeScanner.test.jsx` covers scanner lifecycle and result handling.
- `FriendProfileDetail.test.jsx` covers friend profile view assembly.
- `HomeWeightRefresh.test.jsx` covers Home re-fetching bodyweight on the refresh-tick path.
- `Nutrition.test.jsx` covers nutrition screen logging/goal interactions.
- `NutritionFoodPickerScanner.test.jsx` covers the food picker's scanner integration.
- `Ranks.saveBW.test.jsx` covers Ranks' bodyweight save path and error handling.
- `Workout.finish.test.jsx` covers finishWorkout's session/sets write path and downstream propagation.
- `ForceUpdate.test.jsx` covers the forced-upgrade screen and app-store CTA.
- `RestWheelPicker.test.jsx` covers rest-time stepping and display behavior.
- `Paywall.test.jsx` covers offering loading, package selection/savings, purchase/restore success and failure, and platform unavailable states.
- `Profile.test.jsx` covers cached profile load, edit/save validation, theme persistence, premium activation, sign-out, bug-report rate limiting/submission, and account-deletion confirmation.
- `CreateFood.test.jsx` covers food validation/save, micronutrient toggles, recipe ingredient search/add/remove, recipe totals, and recipe save payloads.
- `WeightChart.test.jsx`, `WorkoutCalendar.test.jsx`, `BodyWeightDetail.test.jsx`, and `FriendsSection.test.jsx` cover profile subcomponent chart/calendar/bodyweight/social slices.
- `WorkoutDayDetail.test.jsx` covers focused day-detail loading/error/empty states, workout/nutrition/weight display, set edit/delete, nutrition edit/delete, weight-log deletion, and workout deletion callbacks.

### Component tests worth writing next
The targeted low- and mid-coupling component queue is largely cleared. Future focused tests should pick narrow, deterministic slices of larger screens (e.g. additional Workout subflows, Profile subcomponents with bounded props), or stay in E2E for fully integrated flows.

### What NOT to broad component-test yet
`Workout.jsx` and `Home.jsx` remain too deeply coupled to Supabase realtime, auth context, and Capacitor for broad component tests. Continue covering broad behavior in E2E; only add focused component tests for narrow states where the mocks stay honest (the pattern used by `HomeLoading.test.jsx`, `HomeWeightRefresh.test.jsx`, `Workout.finish.test.jsx`, `Ranks.saveBW.test.jsx`, and `WorkoutDayDetail.test.jsx`).

### E2E with Playwright

Status: set up and passing with `.env.e2e`.

Current scenarios in `e2e/workout-critical-path.spec.js`:
- Workout critical path: sign in, start empty workout, add Bench Press, log set, finish, verify saved session/set in Supabase.
- Workout draft/resume: leave an unfinished workout in local storage, restart the app, resume it, verify set inputs, finish, verify DB.
- Workout cancel/discard: abandon an in-progress workout and verify no finished/open workout session remains.
- Suggested routine start: start `Push`, verify Bench Press appears, log a set, finish, verify DB.
- Nutrition create/log/delete: create `E2E Test Food`, log it, verify DB, delete it, verify DB removal.
- Home calendar/history: complete a workout, open today's calendar entry, verify workout detail, set count, and nonzero volume.
- Drop-set persistence: add a parent set plus drop set, complete the drop group, finish, and verify normal/drop rows share `set_group_index`.
- Profile edit persistence: update full name and username, reload, verify UI and `profiles` row.
- Recipe create/log/delete: create an ingredient food, build a recipe from it, log recipe nutrition, then delete the recipe log.
- Mobile workout finish smoke: run the workout finish path at `390x844` and verify the saved session/set.
- Sign-out/sign-in data retention: finish a workout, sign out through Profile, sign back in, and verify the saved workout remains.

Operational notes:
- `playwright.config.js` loads `.env.e2e`, `.env.local`, and `.env`.
- `e2e/helpers/supabaseFixture.js` creates/updates the fixture user and resets workout/nutrition data before each test and after the run.
- CI E2E is now live — dedicated Supabase CI project set up with `supabase/schema.sql` + `supabase/exercises_seed.sql`. GitHub secrets added. `e2e` job in `ci.yml` runs after `test` passes.

### Coverage gate ✓
Whole-`src/**` coverage is enabled in `vitest.config.js`, with `text`, `lcov`, and `json-summary` reporters. CI runs `npm run test:coverage` and checks `coverage/coverage-summary.json`; the current gate fails if `total.lines.pct < 55`. The previous reporter mismatch is fixed by the `json-summary` reporter.

---

## Applied and Pending File Status

### Applied

| File | Change |
|------|--------|
| `package.json` | Add Vitest scripts, Playwright scripts, and test dev deps |
| `vitest.config.js` | Vitest config with `env.VITE_USDA_API_KEY`; whole-`src/**` coverage; `text`, `lcov`, and `json-summary` reporters |
| `src/__tests__/setup.js` | New file (Capacitor/Sentry mocks) |
| `src/__tests__/lib/*.test.{js,jsx}` | 43 lib test files covering Phase 1, Phase 2, utility/persistence, Track A, drop-set audit, battle projection, plus admob, appVersion, backStack, purchases, workoutCompletion, streakUtils, friendlyError, and offFoods |
| `src/__tests__/components/*.test.jsx` | 28 component test files, including WorkoutSummary, Achievements, ProgressionSuggestion, PlateCalculator, AppErrorBoundary, RankBadge, HomeLoading, Auth, BarcodeScanner, FriendProfileDetail, HomeWeightRefresh, Nutrition, NutritionFoodPickerScanner, Ranks.saveBW, Workout.finish, TierProgressBar, WorkoutSummary.recap, Workout.bodyweightGate, ForceUpdate, RestWheelPicker, Paywall, Profile, CreateFood, WeightChart, WorkoutCalendar, BodyWeightDetail, FriendsSection, and WorkoutDayDetail |
| `src/__tests__/lib/useFocusTrap.test.jsx` | Hook test using JSX (`.jsx` extension required) |
| `playwright.config.js` | Local/manual Playwright config, env loading, dev server setup |
| `e2e/workout-critical-path.spec.js` | 11 Supabase-backed E2E user journeys |
| `e2e/helpers/appFlows.js` | Reusable Playwright UI flows |
| `e2e/helpers/supabaseFixture.js` | Fixture user setup/reset and DB assertions |
| `e2e/README.md` | E2E setup and command docs |
| `.github/workflows/ci.yml` | New file |
| `eslint.config.js` | Add 5 bug-catching rules |
| `src/lib/progressiveOverload.js` | Backward-compatible `planMode` return shape support; no-history/current-workout maintain anchor; drop set awareness: all drops excluded from `getSetHistoryByIndex` pool, `countWorkingSets`, and inner suggestion loop; `workingSetPos` counter decouples flat array index from historical set position; `setNumber` field added to suggestion return; `fetchRecentSessions` DB query selects `set_type` and `set_group_index` |
| `src/lib/trainingPlanGenerator.js` | Cardio-goal split priority fix |
| `src/App.jsx` | Shortened intro timing and retuned splash progress |
| `src/components/Home.jsx` / `src/styles/Home.css` | Home skeleton loading, cached-data rendering during background refresh, reduced-motion skeleton handling; calendar refresh key includes workout refresh ticks so newly finished workouts appear in today's history |
| `src/components/Workout.jsx` / `src/styles/Workout.css` | Routine start waits for exercise library before creating a session; disabled start styling; full drop set feature (groupSets, addDropSet, completeDropGroup, timer suppression, finishWorkout DB writes, grouped render with D1/D2 labels, orange group border); drop row UX polish (normal full-size rows, red trash icon replaces type selector, "—" in prev column, "Complete Drop Sets" right-aligned, `startedDropGroups` grey-out after rest timer tap); `addDropSet` cancels an already-started parent rest timer; `applyProgressionSuggestion` skips drops; `addSet` copies from last working set; `removeSet` removes last working set + its drops; set count label excludes drops; battle events publish set/drop metadata and grouped-removal intent |
| `src/components/ProgressionSuggestion.jsx` | Uses `suggestion.setNumber` (working-set ordinal) instead of `activeSetIndex + 1` (flat array ordinal) for set label display |
| `src/lib/workoutSets.js` | `defaultSet` + `normalizeStrengthSet` drop set field support; working-set index helpers; `repairDropSetGroups` for orphan drops and duplicate parent group indexes |
| `src/lib/localDraftSanitizers.js` | `sanitizeStrengthSet` preserves `setType` and `setGroupIndex`; aliases accepted; malformed drop groups repaired; plan/progression metadata preserved for resume |
| `src/lib/trainingPlanAdaptation.js` | Planned strength-set completion metrics ignore `dropset` and `warmup` rows |
| `src/lib/battleProjection.js` | New remote battle projection helper preserving drop-set metadata, legacy compatibility, repair, and grouped removals |
| `src/__tests__/lib/battleProjection.test.js` | Regression coverage for remote drop-set projection and grouped removal |
| `supabase/schema.sql` | `set_type` + `set_group_index` columns + `workout_sets_set_type_check` constraint |
| `src/App.jsx` | Sentry user tagging — `setUser({ id, email })` on login, `setUser(null)` on logout |
| `src/components/Workout.jsx` | Sentry breadcrumbs — workout started, set completed, workout finished |
| `eslint.config.js` | Phase 2 ESLint rules — `react/jsx-key` (error), `react/no-array-index-key` (warn), `import/no-cycle` (error) |
| `.github/workflows/ci.yml` | Whole-`src/**` coverage gate at 55% lines + `e2e` job (after `test`): installs Chromium, injects CI Supabase secrets, runs 11 Playwright journeys, uploads HTML report on failure |
| `supabase/schema.sql` | Full production schema dump for CI Supabase project setup |
| `supabase/exercises_seed.sql` | Exercises-only seed data (275 lines, user_ids nulled, no user data) |

### Pending

| File / Area | Pending work |
|-------------|--------------|
| `src/main.jsx` | Optional dev-only `window.__liftlog` debug utility |

## Verification
- `npm test -- --reporter=dot` -> passed: 71 files, 1031 tests (verified 2026-05-30 after remaining component tests)
- `npm run test:coverage -- --reporter=dot` -> passed: 71 files, 1031 tests; `coverage/coverage-summary.json` generated; whole-`src/**` CI gate enforces 55% lines minimum
- `node -e "const r=require('./coverage/coverage-summary.json'); ..."` -> passed: whole-src coverage 61.47% OK
- `npm run build` -> passed
- `npm run lint` -> currently blocked by pre-existing/unrelated lint errors in `Workout.jsx`, `WorkoutSummary.jsx`, `WeightChart.jsx`, and an unused variable in `WorkoutCalendar.test.jsx`
- `npm run test:e2e` -> passed: 11 Playwright tests (verified 2026-05-30 after adding drop-set, profile, recipe, mobile, and sign-out/sign-in journeys)
- Latest coverage (whole `src/**` scope, verified 2026-05-30) -> 59.13% statements, 53.78% branches, 52.79% functions, 61.47% lines
- Latest lib-only coverage within whole-src report remains high: `src/lib` -> 94.28% statements, 85.58% branches, 97.97% functions, 97.4% lines
- Tier 2 lib fills: `appVersion.js` 55% → **100%** stmts/lines; `purchases.js` 77% → **97.1%** stmts / **100%** lines; `battleProjection.js` 72% → **87.64%** stmts / **65.49%** branches / **93.42%** lines
- Tier 3 component fills: `WorkoutSummary.recap.test.jsx` covers reveal pipeline + `RankUpCard` postWalk + `ProgressCard` 4-stage machine + haptics + screen shake + reduced-motion bailout + tap-to-skip; `Workout.bodyweightGate.test.jsx` covers cached/async/null/reject/busy-guard branches of the new `gateOnBodyweight` race fix
- Tier 1 lib fills (prior pass): `offFoods.js` 2.08% → **100%**; `streakUtils.js`, `friendlyError.js` → near-100%
- Global mocks added to `src/__tests__/setup.js`: `@capacitor/haptics` (`Haptics.impact` + `ImpactStyle`), `Element.prototype.animate` polyfill, `window.matchMedia` polyfill
- Known harmless warning during Vitest runs: `Warning: --localstorage-file was provided without a valid path`
