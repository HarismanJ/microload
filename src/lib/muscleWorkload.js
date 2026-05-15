import { fetchExercises } from '../data/exercises'
import { supabase } from './supabase'
import { MUSCLE_WORKLOAD_GROUPS } from './muscleGroups'
import { SECONDARY_MUSCLE_CREDIT } from './muscleStimulus'

// weeklyTargets per goal — based on Israetel (RP) MEV/MAV landmarks, adjusted for indirect
// set counting (secondary sets credited at 0.33). Strength: low volume, high CNS load;
// Hypertrophy: RP MAV lower bound; Endurance: high-rep muscular endurance tolerance.

export { MUSCLE_WORKLOAD_GROUPS }

const MUSCLE_TO_GROUPS = MUSCLE_WORKLOAD_GROUPS.reduce((map, group) => {
  group.muscles.forEach(muscle => {
    if (!map.has(muscle)) map.set(muscle, [])
    map.get(muscle).push(group)
  })
  return map
}, new Map())

export function computeMuscleOverlapWeight(priorPrimary, priorSecondary, currentPrimary, currentSecondary) {
  const priorMap = new Map()
  for (const m of (priorPrimary || []))   for (const g of (MUSCLE_TO_GROUPS.get(m) || [])) priorMap.set(g.key, Math.max(priorMap.get(g.key) || 0, 1.0))
  for (const m of (priorSecondary || [])) for (const g of (MUSCLE_TO_GROUPS.get(m) || [])) priorMap.set(g.key, Math.max(priorMap.get(g.key) || 0, SECONDARY_MUSCLE_CREDIT))

  const currentMap = new Map()
  for (const m of (currentPrimary || []))   for (const g of (MUSCLE_TO_GROUPS.get(m) || [])) currentMap.set(g.key, Math.max(currentMap.get(g.key) || 0, 1.0))
  for (const m of (currentSecondary || [])) for (const g of (MUSCLE_TO_GROUPS.get(m) || [])) currentMap.set(g.key, Math.max(currentMap.get(g.key) || 0, SECONDARY_MUSCLE_CREDIT))

  const contributions = []
  for (const [key, priorVal] of priorMap) {
    if (currentMap.has(key)) contributions.push(priorVal * currentMap.get(key))
  }
  return contributions.length > 0 ? Math.max(...contributions) : 0
}

function localDateString(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function formatWeekLabel(start, endExclusive) {
  const end = new Date(endExclusive)
  end.setDate(end.getDate() - 1)
  const startLabel = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const endLabel = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${startLabel} - ${endLabel}`
}

export function getLocalTrainingWeekRange(date = new Date()) {
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  const day = start.getDay()
  start.setDate(start.getDate() - day)

  const end = new Date(start)
  end.setDate(end.getDate() + 7)

  return {
    start,
    end,
    startIso: start.toISOString(),
    endIso: end.toISOString(),
    startDate: localDateString(start),
    endDate: localDateString(end),
    label: formatWeekLabel(start, end),
  }
}

export function getHeatBucket(targetRatio) {
  if (targetRatio <= 0) return 0
  if (targetRatio < 0.4) return 1
  if (targetRatio < 0.8) return 2
  if (targetRatio < 2.0) return 3
  if (targetRatio < 2.5) return 4
  return 5
}

export function applyMuscleWorkloadGoal(workload, goal = 'hypertrophy') {
  if (!workload) return null

  const groups = (workload.groups || []).map(group => {
    const weeklyTarget = group.weeklyTargets?.[goal] ?? group.weeklyTargets?.hypertrophy ?? 10
    const targetRatio = weeklyTarget > 0 ? group.effectiveSets / weeklyTarget : 0
    return {
      ...group,
      weeklyTarget,
      targetRatio,
      heatBucket: getHeatBucket(targetRatio),
    }
  })

  return {
    ...workload,
    goal,
    groups,
    chartData: groups
      .filter(group => group.heatBucket > 0)
      .map(group => ({
        name: group.label,
        muscles: group.chartMuscles,
        frequency: group.heatBucket,
      })),
  }
}

function roundCredit(value) {
  return Math.round((Number(value) || 0) * 10) / 10
}

function emptyWorkload(range = getLocalTrainingWeekRange()) {
  const groups = MUSCLE_WORKLOAD_GROUPS.map(group => ({
    ...group,
    effectiveSets: 0,
    targetRatio: 0,
    heatBucket: 0,
    trainedDays: [],
    trainedDayCount: 0,
    lastTrainedAt: null,
    contributors: [],
  }))
  return {
    week: range,
    groups,
    chartData: [],
    totalEffectiveSets: 0,
    trainedGroupCount: 0,
    trainedDays: [],
    lastTrainedAt: null,
  }
}

export function buildWeeklyMuscleWorkload({ sessions = [], sets = [], exercises = [], range = getLocalTrainingWeekRange() } = {}) {
  if (!sessions.length || !sets.length || !exercises.length) return emptyWorkload(range)

  const sessionsById = new Map(sessions.map(session => [session.id, session]))
  const exercisesById = new Map(exercises.map(exercise => [exercise.id, exercise]))
  const groupStats = new Map(MUSCLE_WORKLOAD_GROUPS.map(group => [group.key, {
    ...group,
    effectiveSets: 0,
    trainedDays: new Set(),
    contributors: new Map(),
    lastTrainedAt: null,
  }]))
  const allTrainedDays = new Set()

  sets.forEach(set => {
    const session = sessionsById.get(set.session_id)
    const exercise = exercisesById.get(set.exercise_id)
    if (!session || !exercise || exercise.category === 'Cardio' || set.is_warmup) return

    const completedAt = set.completed_at || session.finished_at || session.started_at
    const day = completedAt ? localDateString(new Date(completedAt)) : null
    const groupCredits = new Map()

    ;(exercise.primary_muscles || []).forEach(muscle => {
      ;(MUSCLE_TO_GROUPS.get(muscle) || []).forEach(group => {
        groupCredits.set(group.key, Math.max(groupCredits.get(group.key) || 0, 1))
      })
    })
    ;(exercise.secondary_muscles || []).forEach(muscle => {
      ;(MUSCLE_TO_GROUPS.get(muscle) || []).forEach(group => {
        groupCredits.set(group.key, Math.max(groupCredits.get(group.key) || 0, SECONDARY_MUSCLE_CREDIT))
      })
    })

    groupCredits.forEach((credit, groupKey) => {
      const stat = groupStats.get(groupKey)
      if (!stat) return
      stat.effectiveSets += credit
      if (day) {
        stat.trainedDays.add(day)
        allTrainedDays.add(day)
      }
      if (completedAt && (!stat.lastTrainedAt || new Date(completedAt) > new Date(stat.lastTrainedAt))) {
        stat.lastTrainedAt = completedAt
      }
      const existing = stat.contributors.get(exercise.name)
      stat.contributors.set(exercise.name, { rawSets: (existing?.rawSets || 0) + 1, creditPerSet: credit })
    })
  })

  const groups = MUSCLE_WORKLOAD_GROUPS.map(group => {
    const stat = groupStats.get(group.key)
    const effectiveSets = roundCredit(stat.effectiveSets)
    return {
      ...group,
      effectiveSets,
      trainedDays: [...stat.trainedDays].sort(),
      trainedDayCount: stat.trainedDays.size,
      lastTrainedAt: stat.lastTrainedAt,
      contributors: [...stat.contributors.entries()]
        .map(([name, { rawSets, creditPerSet }]) => ({ name, rawSets, creditPerSet, setsCredit: roundCredit(rawSets * creditPerSet) }))
        .sort((a, b) => b.setsCredit - a.setsCredit || a.name.localeCompare(b.name)),
    }
  })

  return applyMuscleWorkloadGoal({
    week: range,
    groups,
    totalEffectiveSets: roundCredit(groups.reduce((sum, group) => sum + group.effectiveSets, 0)),
    trainedGroupCount: groups.filter(group => group.effectiveSets > 0).length,
    trainedDays: [...allTrainedDays].sort(),
    lastTrainedAt: groups
      .map(group => group.lastTrainedAt)
      .filter(Boolean)
      .sort((a, b) => new Date(b) - new Date(a))[0] || null,
  })
}

export async function fetchWeeklyMuscleWorkload(userId, date = new Date()) {
  if (!userId) return emptyWorkload(getLocalTrainingWeekRange(date))
  const range = getLocalTrainingWeekRange(date)

  const [{ data: sessions, error: sessionsError }, exercises] = await Promise.all([
    supabase
      .from('workout_sessions')
      .select('id, started_at, finished_at')
      .eq('user_id', userId)
      .not('finished_at', 'is', null)
      .gte('finished_at', range.startIso)
      .lt('finished_at', range.endIso),
    fetchExercises(userId),
  ])
  if (sessionsError) throw sessionsError

  const sessionIds = (sessions || []).map(session => session.id).filter(Boolean)
  if (!sessionIds.length) return emptyWorkload(range)

  const { data: sets, error: setsError } = await supabase
    .from('workout_sets')
    .select('id, session_id, exercise_id, completed_at, is_warmup')
    .eq('user_id', userId)
    .in('session_id', sessionIds)
  if (setsError) throw setsError

  return buildWeeklyMuscleWorkload({
    sessions: sessions || [],
    sets: sets || [],
    exercises: exercises || [],
    range,
  })
}
