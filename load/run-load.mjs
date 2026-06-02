import { cleanupLoadData, createAdminClient } from './lib/admin.mjs'
import { parseArgs, percentile, readUsers, requireLoadConfig } from './lib/env.mjs'

const PROFILES = {
  smoke: {
    vus: 5,
    durationSec: 120,
    authRampSec: 2,
    p95ThresholdMs: 2000,
    maxErrorRate: 0.01,
  },
  baseline: {
    vus: 25,
    durationSec: 600,
    authRampSec: 10,
    p95ThresholdMs: 1500,
    maxErrorRate: 0.01,
  },
  comprehensive: {
    vus: 50,
    durationSec: 600,
    authRampSec: 20,
    p95ThresholdMs: 2000,
    maxErrorRate: 0.01,
  },
  spike: {
    vus: 100,
    durationSec: 180,
    authRampSec: 30,
    p95ThresholdMs: 2500,
    maxErrorRate: 0.02,
  },
}

const SCENARIOS = [
  ['dashboardRead', 18, dashboardRead],
  ['finishWorkout', 12, finishWorkout],
  ['trainingPlanWorkout', 10, trainingPlanWorkout],
  ['prAndRankState', 8, prAndRankState],
  ['exercisePreference', 8, exercisePreference],
  ['battleWorkoutFlow', 8, battleWorkoutFlow],
  ['nutritionLog', 8, nutritionLog],
  ['bodyWeightLog', 5, bodyWeightLog],
  ['profileUpdate', 5, profileUpdate],
  ['socialLookup', 6, socialLookup],
  ['calendarMonthRead', 6, calendarMonthRead],
  ['customFoodLifecycle', 6, customFoodLifecycle],
  ['nutritionDashboardRead', 5, nutritionDashboardRead],
  ['workoutDayDetailRead', 5, workoutDayDetailRead],
]

const args = parseArgs(process.argv.slice(2))
const profileName = args.profile || 'smoke'
const profile = PROFILES[profileName]
if (!profile) throw new Error(`Unknown load profile "${profileName}". Use one of: ${Object.keys(PROFILES).join(', ')}`)

const config = requireLoadConfig({ serviceRole: configNeedsServiceRole() })
const users = readUsers()
const settings = {
  vus: Number.parseInt(process.env.LOAD_TEST_VUS || args.vus || profile.vus, 10),
  durationSec: Number.parseInt(process.env.LOAD_TEST_DURATION_SEC || args.duration || profile.durationSec, 10),
  authRampSec: Number.parseInt(process.env.LOAD_TEST_AUTH_RAMP_SEC || args.authRamp || profile.authRampSec, 10),
  p95ThresholdMs: Number.parseInt(process.env.LOAD_TEST_P95_MS || profile.p95ThresholdMs, 10),
  maxErrorRate: Number.parseFloat(process.env.LOAD_TEST_MAX_ERROR_RATE || profile.maxErrorRate),
}

if (users.length < settings.vus) {
  console.warn(`Only ${users.length} seeded users for ${settings.vus} VUs; credentials will be reused.`)
}

const metrics = createMetrics()
const stopAt = Date.now() + settings.durationSec * 1000
const signedInSessions = new Map()

console.log(`Running ${profileName} load test: ${settings.vus} VUs for ${settings.durationSec}s, auth ramp ${settings.authRampSec}s`)
console.log(`Target: ${config.supabaseUrl}`)

await Promise.all(
  Array.from({ length: settings.vus }, (_, index) => runVirtualUser(index))
)

if (config.cleanupAfterRun && config.serviceRoleKey) {
  const admin = createAdminClient(config)
  await cleanupLoadData(admin, users.map(user => user.id))
}

const summary = summarize(metrics)
printSummary(summary, settings)

if (summary.errorRate > settings.maxErrorRate || summary.p95 > settings.p95ThresholdMs) {
  process.exitCode = 1
}

async function runVirtualUser(index) {
  const user = users[index % users.length]
  await sleep(initialAuthDelay(index))
  let session
  try {
    session = await signIn(user)
    rememberSession(session)
  } catch (error) {
    metrics.errors.push({ scenario: 'auth.signIn', message: error.message })
    return
  }

  while (Date.now() < stopAt) {
    const scenario = pickScenario()
    await runScenario(scenario, session)
    await sleep(randomInt(250, 900))
  }
}

function initialAuthDelay(index) {
  if (!settings.authRampSec || settings.authRampSec <= 0) return 0
  const spreadMs = settings.authRampSec * 1000
  return Math.floor((index / settings.vus) * spreadMs) + randomInt(0, 250)
}

async function signIn(user) {
  const result = await timed('auth.signIn', async () => {
    const response = await fetch(`${config.supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        apikey: config.anonKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: user.email, password: user.password }),
    })
    const json = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(`signIn failed ${response.status}: ${json.error_description || json.msg || json.message || response.statusText}`)
    return json
  })

  return {
    userId: result.user.id,
    accessToken: result.access_token,
  }
}

async function runScenario([name, , fn], session) {
  const started = performance.now()
  try {
    await fn(session)
    metrics.scenarios[name] ||= { ok: 0, fail: 0, durations: [] }
    metrics.scenarios[name].ok += 1
    metrics.scenarios[name].durations.push(performance.now() - started)
  } catch (error) {
    metrics.scenarios[name] ||= { ok: 0, fail: 0, durations: [] }
    metrics.scenarios[name].fail += 1
    metrics.errors.push({ scenario: name, message: error.message })
  }
}

async function dashboardRead(session) {
  await Promise.all([
    rest(session, 'GET', '/profiles', { query: `id=eq.${session.userId}&select=id,username,bodyweight,unit_preference,default_rest_seconds` }),
    rest(session, 'GET', '/workout_sessions', { query: `user_id=eq.${session.userId}&select=id,started_at,finished_at,calories_burned&order=started_at.desc&limit=10` }),
    rest(session, 'GET', '/body_weight_logs', { query: `user_id=eq.${session.userId}&select=id,weight,unit,logged_at&order=logged_at.desc&limit=10` }),
    rest(session, 'GET', '/nutrition_logs', { query: `user_id=eq.${session.userId}&select=id,food_name,calories,protein,carbs,fat,created_at&order=created_at.desc&limit=10` }),
  ])
}

async function finishWorkout(session) {
  await finishWorkoutWithOptions(session)
}

async function finishWorkoutWithOptions(session, {
  sourcePlan = null,
  includePr = false,
  caloriesBurned = randomInt(80, 240),
  baseWeight = randomInt(55, 85),
} = {}) {
  const created = await rest(session, 'POST', '/workout_sessions', {
    query: 'select=id',
    body: {
      user_id: session.userId,
      source_plan_id: sourcePlan?.planId ?? null,
      source_plan_day_id: sourcePlan?.dayId ?? null,
      source_plan_week: sourcePlan?.week ?? null,
    },
    prefer: 'return=representation',
  })
  const sessionId = created[0]?.id
  if (!sessionId) throw new Error('workout session insert returned no id')

  const now = new Date().toISOString()
  await rest(session, 'POST', '/rpc/finish_workout_session_atomic', {
    body: {
      p_session_id: sessionId,
      p_finished_at: now,
      p_exercise_notes: {},
      p_calories_burned: caloriesBurned,
      p_source_plan_id: sourcePlan?.planId ?? null,
      p_source_plan_day_id: sourcePlan?.dayId ?? null,
      p_source_plan_week: sourcePlan?.week ?? null,
      p_session_training_volume_kg: baseWeight * 14,
      p_sets: [
        makeSet(1, baseWeight, 5, now),
        makeSet(2, baseWeight + 2.5, 5, now),
        makeSet(3, baseWeight + 5, 4, now),
      ],
      p_prs: includePr ? [makePr(baseWeight + 5, now)] : [],
      p_rank_states: includePr ? [makeRankState(now)] : [],
      p_streak_start_date: new Date().toISOString().slice(0, 10),
      p_streak_last_workout_at: now,
    },
  })

  return sessionId
}

async function trainingPlanWorkout(session) {
  const plan = await rest(session, 'POST', '/user_training_plans', {
    query: 'select=id,days',
    body: makeTrainingPlan(session.userId),
    prefer: 'return=representation',
  })
  const planId = plan[0]?.id
  const dayId = plan[0]?.days?.[0]?.id || 'day-1'
  if (!planId) throw new Error('training plan insert returned no id')

  await rest(session, 'GET', '/user_training_plans', {
    query: [
      `user_id=eq.${session.userId}`,
      'select=id,name,goal,days,duration_weeks,days_per_week,session_minutes,equipment,created_at',
      'order=created_at.desc',
      'limit=5',
    ].join('&'),
  })

  const workoutId = await finishWorkoutWithOptions(session, {
    sourcePlan: { planId, dayId, week: 1 },
    baseWeight: randomInt(50, 75),
  })

  await rest(session, 'GET', '/workout_sessions', {
    query: [
      `id=eq.${workoutId}`,
      'select=id,source_plan_id,source_plan_day_id,source_plan_week,finished_at',
      'limit=1',
    ].join('&'),
  })
}

async function prAndRankState(session) {
  await finishWorkoutWithOptions(session, {
    includePr: true,
    baseWeight: randomInt(70, 100),
  })

  await Promise.all([
    rest(session, 'GET', '/exercise_prs', {
      query: `user_id=eq.${session.userId}&exercise_id=eq.251&select=user_id,exercise_id,best_1rm_kg,updated_at&limit=1`,
    }),
    rest(session, 'GET', '/exercise_rank_states', {
      query: `user_id=eq.${session.userId}&exercise_id=eq.251&select=user_id,exercise_id,current_score,peak_score,last_ranked_at,updated_at&limit=1`,
    }),
  ])
}

async function exercisePreference(session) {
  await rest(session, 'POST', '/user_exercise_preferences', {
    query: 'on_conflict=user_id,exercise_id',
    body: {
      user_id: session.userId,
      exercise_id: 251,
      rest_seconds: [45, 60, 90, 120, 150][randomInt(0, 4)],
    },
    prefer: 'resolution=merge-duplicates,return=minimal',
  })

  await rest(session, 'GET', '/user_exercise_preferences', {
    query: `user_id=eq.${session.userId}&exercise_id=eq.251&select=exercise_id,rest_seconds&limit=1`,
  })
}

async function battleWorkoutFlow(session) {
  const buddySession = await getBuddySession(session.userId)
  if (!buddySession) {
    await socialLookup(session)
    return
  }

  const invite = await rest(session, 'POST', '/battle_invites', {
    query: 'select=id,challenger_id,challenged_id,status,battle_mode',
    body: {
      challenger_id: session.userId,
      challenged_id: buddySession.userId,
      battle_mode: 'hybrid',
    },
    prefer: 'return=representation',
  })
  const inviteId = invite[0]?.id
  if (!inviteId) throw new Error('battle invite insert returned no id')

  const room = await rest(buddySession, 'POST', '/rpc/respond_to_battle_invite_atomic', {
    body: {
      p_invite_id: inviteId,
      p_action: 'accepted',
    },
  })
  const roomId = room?.id
  if (!roomId) throw new Error('battle accept returned no room id')

  await Promise.all([
    logBattleWorkout(session, roomId, randomInt(55, 80)),
    logBattleWorkout(buddySession, roomId, randomInt(50, 75)),
  ])

  await rest(session, 'POST', '/rpc/record_battle_result_atomic', {
    body: {
      p_room_id: roomId,
      p_winner_id: session.userId,
      p_challenger_points: 55,
      p_challenged_points: 45,
      p_score_total: 100,
      p_scoring_version: 'load_test_v1',
      p_recap: {
        source: 'load-test',
        roomId,
        challengerId: session.userId,
        challengedId: buddySession.userId,
      },
    },
  })

  await rest(session, 'GET', '/workout_rooms', {
    query: `id=eq.${roomId}&select=id,status,finalized_at,battle_mode,challenger_id,challenged_id&limit=1`,
  })
}

async function logBattleWorkout(session, roomId, baseWeight) {
  await rest(session, 'POST', '/workout_room_events', {
    body: {
      room_id: roomId,
      user_id: session.userId,
      event_type: 'workout_started',
      payload: {},
    },
    prefer: 'return=minimal',
  })
  await rest(session, 'POST', '/workout_room_events', {
    body: {
      room_id: roomId,
      user_id: session.userId,
      event_type: 'set_completed',
      payload: {
        exerciseId: 251,
        exerciseName: 'Bench Press',
        category: 'Strength',
        equipment: 'Barbell',
        setNumber: 1,
        weight: baseWeight,
        reps: 5,
        unit: 'kg',
      },
    },
    prefer: 'return=minimal',
  })
  await finishWorkoutWithOptions(session, {
    includePr: true,
    caloriesBurned: randomInt(110, 260),
    baseWeight,
  })
  await rest(session, 'POST', '/workout_room_events', {
    body: {
      room_id: roomId,
      user_id: session.userId,
      event_type: 'workout_finished',
      payload: {
        durationSeconds: randomInt(1800, 3600),
        totalSets: 3,
        totalExercises: 1,
        totalVolume: baseWeight * 14,
        totalVolumeKg: baseWeight * 14,
      },
    },
    prefer: 'return=minimal',
  })
}

async function nutritionLog(session) {
  await rest(session, 'POST', '/nutrition_logs', {
    body: {
      user_id: session.userId,
      food_name: `Load Meal ${randomInt(1, 50)}`,
      servings: 1,
      calories: randomInt(250, 650),
      protein: randomInt(15, 45),
      carbs: randomInt(20, 80),
      fat: randomInt(5, 30),
      log_date: new Date().toISOString().slice(0, 10),
    },
    prefer: 'return=minimal',
  })
}

async function bodyWeightLog(session) {
  await rest(session, 'POST', '/body_weight_logs', {
    body: {
      user_id: session.userId,
      weight: randomInt(65, 95),
      unit: 'kg',
      logged_at: new Date().toISOString(),
    },
    prefer: 'return=minimal',
  })
}

async function profileUpdate(session) {
  await rest(session, 'PATCH', '/profiles', {
    query: `id=eq.${session.userId}`,
    body: {
      bodyweight: randomInt(65, 95),
      unit_preference: 'kg',
      default_rest_seconds: [45, 60, 90, 120][randomInt(0, 3)],
    },
    prefer: 'return=minimal',
  })
}

async function socialLookup(session) {
  await Promise.all([
    rest(session, 'POST', '/rpc/get_public_profiles', {
      body: { p_profile_ids: [session.userId, randomUserIdExcept(session.userId)] },
    }),
    rest(session, 'POST', '/rpc/search_profiles_for_friendship', {
      body: { p_search: 'load' },
    }),
  ])
}

async function calendarMonthRead(session) {
  const { startDate, endDate, startIso, endIso } = recentDateWindow()
  await Promise.all([
    rest(session, 'GET', '/workout_sessions', {
      query: [
        `user_id=eq.${session.userId}`,
        `started_at=gte.${filterValue(startIso)}`,
        `started_at=lte.${filterValue(endIso)}`,
        'select=id,started_at,finished_at,calories_burned',
      ].join('&'),
    }),
    rest(session, 'GET', '/nutrition_logs', {
      query: [
        `user_id=eq.${session.userId}`,
        `log_date=gte.${startDate}`,
        `log_date=lte.${endDate}`,
        'select=id,log_date,calories,protein,carbs,fat',
      ].join('&'),
    }),
    rest(session, 'GET', '/body_weight_logs', {
      query: [
        `user_id=eq.${session.userId}`,
        `logged_at=gte.${filterValue(startIso)}`,
        `logged_at=lte.${filterValue(endIso)}`,
        'select=id,weight,unit,logged_at',
      ].join('&'),
    }),
  ])
}

async function customFoodLifecycle(session) {
  const name = `Load Food ${Date.now()} ${randomInt(1000, 9999)}`
  const food = await rest(session, 'POST', '/foods', {
    query: 'select=id,name,calories,protein,carbs,fat',
    body: {
      user_id: session.userId,
      name,
      serving_size: 100,
      serving_unit: 'g',
      calories: randomInt(120, 420),
      protein: randomInt(5, 35),
      carbs: randomInt(5, 60),
      fat: randomInt(2, 25),
      fiber: randomInt(0, 10),
      sugar: randomInt(0, 20),
      saturated_fat: randomInt(0, 8),
      sodium: randomInt(20, 800),
      potassium: randomInt(20, 900),
      cholesterol: randomInt(0, 120),
      calcium: randomInt(0, 500),
      iron: randomInt(0, 20),
      magnesium: randomInt(0, 200),
      zinc: randomInt(0, 20),
      vitamin_a: randomInt(0, 900),
      vitamin_c: randomInt(0, 200),
      vitamin_d: randomInt(0, 50),
      folate: randomInt(0, 400),
      vitamin_b12: randomInt(0, 20),
      vitamin_b6: randomInt(0, 20),
    },
    prefer: 'return=representation',
  })
  const foodId = food[0]?.id
  if (!foodId) throw new Error('food insert returned no id')

  await rest(session, 'GET', '/foods', {
    query: `id=eq.${foodId}&select=id,name,calories,protein,carbs,fat`,
  })
  await rest(session, 'POST', '/nutrition_logs', {
    body: {
      user_id: session.userId,
      food_id: foodId,
      food_name: name,
      servings: 1,
      calories: food[0].calories,
      protein: food[0].protein,
      carbs: food[0].carbs,
      fat: food[0].fat,
      log_date: new Date().toISOString().slice(0, 10),
    },
    prefer: 'return=minimal',
  })
  await rest(session, 'DELETE', '/foods', {
    query: `id=eq.${foodId}`,
    prefer: 'return=minimal',
  })
}

async function nutritionDashboardRead(session) {
  await rest(session, 'GET', '/nutrition_logs', {
    query: [
      `user_id=eq.${session.userId}`,
      `log_date=eq.${new Date().toISOString().slice(0, 10)}`,
      'select=calories,protein,carbs,fat,fiber,sugar,saturated_fat,sodium,potassium,cholesterol,calcium,iron,magnesium,zinc,vitamin_a,vitamin_c,vitamin_d,folate,vitamin_b12,vitamin_b6',
    ].join('&'),
  })
}

async function workoutDayDetailRead(session) {
  const { startDate, endDate, startIso, endIso } = recentDateWindow(1)
  const [sessions] = await Promise.all([
    rest(session, 'GET', '/workout_sessions', {
      query: [
        `user_id=eq.${session.userId}`,
        `started_at=gte.${filterValue(startIso)}`,
        `started_at=lte.${filterValue(endIso)}`,
        'select=id,started_at,finished_at,exercise_notes,calories_burned',
        'order=started_at.desc',
        'limit=10',
      ].join('&'),
    }),
    rest(session, 'GET', '/profiles', {
      query: `id=eq.${session.userId}&select=bodyweight,unit_preference`,
    }),
    rest(session, 'GET', '/nutrition_logs', {
      query: [
        `user_id=eq.${session.userId}`,
        `log_date=gte.${startDate}`,
        `log_date=lte.${endDate}`,
        'select=id,food_name,servings,calories,protein,carbs,fat',
      ].join('&'),
    }),
    rest(session, 'GET', '/body_weight_logs', {
      query: [
        `user_id=eq.${session.userId}`,
        `logged_at=gte.${filterValue(startIso)}`,
        `logged_at=lte.${filterValue(endIso)}`,
        'select=id,weight,unit,logged_at',
      ].join('&'),
    }),
  ])

  const ids = (sessions || []).map(row => row.id).filter(Boolean).slice(0, 10)
  if (!ids.length) return
  await rest(session, 'GET', '/workout_sets', {
    query: [
      `session_id=in.(${ids.join(',')})`,
      'select=id,session_id,exercise_id,set_number,reps,weight,unit,estimated_1rm,set_type,exercises(name,category,equipment)',
      'order=set_number.asc',
    ].join('&'),
  })
}

async function rest(session, method, path, { query = '', body = undefined, prefer = undefined } = {}) {
  const url = `${config.supabaseUrl}/rest/v1${path}${query ? `?${query}` : ''}`
  return timed(`${method} ${path}`, async () => {
    const response = await fetch(url, {
      method,
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${session.accessToken}`,
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(prefer ? { Prefer: prefer } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      throw new Error(`${method} ${path} failed ${response.status}: ${text || response.statusText}`)
    }

    if (response.status === 204) return null
    const text = await response.text()
    return text ? JSON.parse(text) : null
  })
}

async function timed(label, fn) {
  const started = performance.now()
  try {
    const value = await fn()
    metrics.requests.push({ label, ok: true, ms: performance.now() - started })
    return value
  } catch (error) {
    metrics.requests.push({ label, ok: false, ms: performance.now() - started })
    throw error
  }
}

function makeSet(setNumber, weight, reps, completedAt) {
  return {
    exercise_id: 251,
    set_number: setNumber,
    reps,
    weight,
    unit: 'kg',
    estimated_1rm: weight * (1 + reps / 30),
    estimated_fresh_1rm: weight * (1 + reps / 30),
    completed_at: completedAt,
    rest_before_seconds: 60,
    progression_event: null,
    is_warmup: false,
    set_type: 'normal',
    set_group_index: null,
  }
}

function makePr(weight, updatedAt) {
  return {
    exercise_id: 251,
    best_1rm_kg: weight * (1 + 5 / 30),
    updated_at: updatedAt,
  }
}

function makeRankState(updatedAt) {
  const currentScore = randomInt(250, 450) / 100
  return {
    exercise_id: 251,
    current_score: currentScore,
    peak_score: currentScore,
    last_ranked_at: updatedAt,
    updated_at: updatedAt,
  }
}

function makeTrainingPlan(userId) {
  return {
    user_id: userId,
    name: `Load Strength Plan ${randomInt(1000, 9999)}`,
    goal: 'strength',
    experience: 'intermediate',
    days_per_week: 3,
    session_minutes: 60,
    duration_weeks: 4,
    equipment: ['Barbell', 'Dumbbell', 'Machine'],
    preferences: {
      source: 'load-test',
      schedule: { mode: 'flexible' },
      periodization: { style: 'double_progression' },
      adaptiveCoach: { enabled: true },
    },
    days: [
      {
        id: 'day-1',
        name: 'Load Upper',
        focus: 'Strength',
        estimatedMinutes: 60,
        exercises: [
          {
            name: 'Bench Press',
            category: 'Strength',
            equipment: 'Barbell',
            sets: 3,
            reps: 5,
            repRange: '4-6',
            restSeconds: 120,
            notes: 'Load test plan day',
          },
          {
            name: 'Seated Row',
            category: 'Strength',
            equipment: 'Machine',
            sets: 3,
            reps: 8,
            repRange: '8-10',
            restSeconds: 90,
          },
        ],
      },
      {
        id: 'day-2',
        name: 'Load Lower',
        focus: 'Strength',
        estimatedMinutes: 55,
        exercises: [
          {
            name: 'Squat',
            category: 'Strength',
            equipment: 'Barbell',
            sets: 3,
            reps: 5,
            repRange: '4-6',
            restSeconds: 120,
          },
        ],
      },
    ],
  }
}

function rememberSession(session) {
  signedInSessions.set(session.userId, session)
}

async function getBuddySession(userId) {
  return randomSignedInSessionExcept(userId)
}

function randomSignedInSessionExcept(userId) {
  const available = [...signedInSessions.values()].filter(session => session.userId !== userId)
  if (!available.length) return null
  return available[randomInt(0, available.length - 1)]
}

function pickScenario() {
  const total = SCENARIOS.reduce((sum, [, weight]) => sum + weight, 0)
  let ticket = Math.random() * total
  for (const scenario of SCENARIOS) {
    ticket -= scenario[1]
    if (ticket <= 0) return scenario
  }
  return SCENARIOS[0]
}

function createMetrics() {
  return {
    requests: [],
    scenarios: {},
    errors: [],
  }
}

function summarize(source) {
  const durations = source.requests.map(request => request.ms)
  const failedRequests = source.requests.filter(request => !request.ok).length
  const totalRequests = source.requests.length
  return {
    totalRequests,
    failedRequests,
    errorRate: totalRequests ? failedRequests / totalRequests : 0,
    p50: percentile(durations, 50),
    p95: percentile(durations, 95),
    p99: percentile(durations, 99),
    scenarios: source.scenarios,
    errors: source.errors.slice(0, 10),
  }
}

function printSummary(summary, thresholds) {
  console.log('\nLoad test summary')
  console.log(`Requests: ${summary.totalRequests} total, ${summary.failedRequests} failed, error rate ${(summary.errorRate * 100).toFixed(2)}%`)
  console.log(`Latency: p50 ${Math.round(summary.p50)}ms, p95 ${Math.round(summary.p95)}ms, p99 ${Math.round(summary.p99)}ms`)
  console.log(`Thresholds: max error rate ${(thresholds.maxErrorRate * 100).toFixed(2)}%, max p95 ${thresholds.p95ThresholdMs}ms`)

  for (const [name, stats] of Object.entries(summary.scenarios)) {
    const total = stats.ok + stats.fail
    console.log(`Scenario ${name}: ${stats.ok}/${total} ok, p95 ${Math.round(percentile(stats.durations, 95))}ms`)
  }

  for (const error of summary.errors) {
    console.log(`Error sample [${error.scenario}]: ${error.message}`)
  }

  if (summary.errorRate > thresholds.maxErrorRate) console.log('FAIL: error rate threshold exceeded')
  if (summary.p95 > thresholds.p95ThresholdMs) console.log('FAIL: p95 latency threshold exceeded')
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomUserIdExcept(userId) {
  if (users.length <= 1) return userId
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = users[randomInt(0, users.length - 1)]?.id
    if (candidate && candidate !== userId) return candidate
  }
  return users.find(user => user.id !== userId)?.id || userId
}

function recentDateWindow(days = 30) {
  const end = new Date()
  const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000)
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  }
}

function filterValue(value) {
  return encodeURIComponent(value)
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function configNeedsServiceRole() {
  return process.env.LOAD_TEST_CLEANUP !== '0'
}
