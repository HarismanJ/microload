import { getProfileBodyweightKg } from './liftMath'
import { clampContinuousTierScore, updateRollingScore } from './rollingRanks'
import { expandAnchors, getAnchors, getProgress, getTierIdx } from './strengthStandards'

const LBS_TO_KG = 0.453592

function toEstimatedOrmKg(row) {
  const estimatedOrm = Number(row?.estimated_1rm)
  if (!Number.isFinite(estimatedOrm)) return null
  return row?.unit === 'lbs' ? estimatedOrm * LBS_TO_KG : estimatedOrm
}

function uniqueIds(ids = []) {
  return [...new Set((ids || []).filter(id => id !== null && id !== undefined))]
}

function isMissingExerciseRankStatesTable(error) {
  const code = error?.code || ''
  const message = error?.message?.toLowerCase?.() || ''
  return (
    code === '42P01'
    || (message.includes('exercise_rank_states') && message.includes('does not exist'))
  )
}

function getRankRatio(exercise, ormKg, bodyweightKg) {
  if (!bodyweightKg) return 0
  return exercise?.equipment === 'Bodyweight'
    ? (ormKg + bodyweightKg) / bodyweightKg
    : ormKg / bodyweightKg
}

function getContinuousExerciseScore(exercise, ormKg, bodyweightKg, thresholds) {
  const ratio = getRankRatio(exercise, ormKg, bodyweightKg)
  const tierIdx = getTierIdx(ratio, thresholds)
  const progress = getProgress(ratio, thresholds, tierIdx)
  return clampContinuousTierScore(tierIdx + Math.min(0.999, progress / 100))
}

function getWorkoutSession(row) {
  const session = row?.workout_sessions
  return Array.isArray(session) ? session[0] : session
}

function getRankedAt(row) {
  const session = getWorkoutSession(row)
  return session?.finished_at || session?.started_at || row?.completed_at || null
}

async function deleteExerciseRankStates(supabase, userId, exerciseIds = []) {
  const ids = uniqueIds(exerciseIds)
  if (!userId || ids.length === 0) return { missingTable: false }

  const { error } = await supabase
    .from('exercise_rank_states')
    .delete()
    .eq('user_id', userId)
    .in('exercise_id', ids)

  if (error) {
    if (isMissingExerciseRankStatesTable(error)) return { missingTable: true }
    throw error
  }

  return { missingTable: false }
}

export function getBestEstimatedOrmKgByExercise(rows = []) {
  const bestByExerciseId = new Map()

  for (const row of rows || []) {
    if (row?.set_type === 'dropset') continue
    const exerciseId = row?.exercise_id
    if (exerciseId === null || exerciseId === undefined) continue
    const estimatedOrmKg = toEstimatedOrmKg(row)
    if (!Number.isFinite(estimatedOrmKg)) continue

    const key = String(exerciseId)
    bestByExerciseId.set(key, Math.max(bestByExerciseId.get(key) || 0, estimatedOrmKg))
  }

  return bestByExerciseId
}

export async function recalculateExercisePrs(supabase, userId, exerciseIds = []) {
  const uniqueExerciseIds = uniqueIds(exerciseIds)
  if (!userId || uniqueExerciseIds.length === 0) return { updated: [], deleted: [] }

  const { data, error } = await supabase
    .from('workout_sets')
    .select('exercise_id, estimated_1rm, unit, set_type')
    .eq('user_id', userId)
    .in('exercise_id', uniqueExerciseIds)
    .not('estimated_1rm', 'is', null)

  if (error) throw error

  const bestByExerciseId = getBestEstimatedOrmKgByExercise(data || [])
  const nowIso = new Date().toISOString()
  const updated = []
  const deleted = []

  const writeResults = await Promise.all(uniqueExerciseIds.map(exerciseId => {
    const bestOrmKg = bestByExerciseId.get(String(exerciseId))
    if (Number.isFinite(bestOrmKg) && bestOrmKg > 0) {
      updated.push(exerciseId)
      return supabase.from('exercise_prs').upsert({
        user_id: userId,
        exercise_id: exerciseId,
        best_1rm_kg: bestOrmKg,
        updated_at: nowIso,
      }, { onConflict: 'user_id,exercise_id' })
    }

    deleted.push(exerciseId)
    return supabase
      .from('exercise_prs')
      .delete()
      .eq('user_id', userId)
      .eq('exercise_id', exerciseId)
  }))

  const writeError = writeResults.find(result => result?.error)?.error
  if (writeError) throw writeError

  return { updated, deleted }
}

export async function recalculateExerciseRankStatesFromHistory(supabase, userId, exerciseIds = []) {
  const uniqueExerciseIds = uniqueIds(exerciseIds)
  if (!userId || uniqueExerciseIds.length === 0) return { updated: [], deleted: [], missingTable: false }

  const [
    { data: profile, error: profileError },
    { data: exercises, error: exercisesError },
    { data: setRows, error: setsError },
    anchors,
  ] = await Promise.all([
    supabase.from('profiles').select('bodyweight, gender, unit_preference').eq('id', userId).single(),
    supabase.from('exercises').select('id, name, equipment').in('id', uniqueExerciseIds),
    supabase
      .from('workout_sets')
      .select('exercise_id, session_id, estimated_1rm, unit, completed_at, is_warmup, set_type, workout_sessions!inner(id, started_at, finished_at)')
      .eq('user_id', userId)
      .in('exercise_id', uniqueExerciseIds)
      .not('estimated_1rm', 'is', null)
      .not('workout_sessions.finished_at', 'is', null),
    getAnchors(),
  ])

  const queryError = profileError || exercisesError || setsError
  if (queryError) throw queryError

  const bodyweightKg = getProfileBodyweightKg(profile)
  if (!Number.isFinite(bodyweightKg) || bodyweightKg <= 0) {
    const { missingTable } = await deleteExerciseRankStates(supabase, userId, uniqueExerciseIds)
    return { updated: [], deleted: uniqueExerciseIds, missingTable }
  }

  const genderKey = profile?.gender?.toLowerCase?.() === 'female' ? 'female' : 'male'
  const exercisesById = new Map((exercises || []).map(exercise => [String(exercise.id), exercise]))
  const sessionsByExerciseId = new Map()

  for (const row of setRows || []) {
    if (row?.is_warmup || row?.set_type === 'warmup' || row?.set_type === 'dropset') continue

    const exerciseId = row?.exercise_id
    if (exerciseId === null || exerciseId === undefined) continue

    const exercise = exercisesById.get(String(exerciseId))
    const exerciseAnchors = exercise ? anchors?.[genderKey]?.[exercise.name] : null
    if (!exerciseAnchors) continue

    const estimatedOrmKg = toEstimatedOrmKg(row)
    if (!Number.isFinite(estimatedOrmKg) || estimatedOrmKg <= 0) continue

    const rankedAt = getRankedAt(row)
    const rankedAtMs = new Date(rankedAt).getTime()
    if (!rankedAt || !Number.isFinite(rankedAtMs)) continue

    const thresholds = expandAnchors(exerciseAnchors)
    const sessionScore = getContinuousExerciseScore(exercise, estimatedOrmKg, bodyweightKg, thresholds)
    const exerciseKey = String(exerciseId)
    const sessionKey = String(row.session_id ?? rankedAt)

    if (!sessionsByExerciseId.has(exerciseKey)) sessionsByExerciseId.set(exerciseKey, new Map())
    const sessionMap = sessionsByExerciseId.get(exerciseKey)
    const current = sessionMap.get(sessionKey)
    if (!current || sessionScore > current.sessionScore) {
      sessionMap.set(sessionKey, {
        exerciseId,
        sessionId: row.session_id,
        rankedAt,
        rankedAtMs,
        sessionScore,
      })
    }
  }

  const nowIso = new Date().toISOString()
  const updates = []
  const deleted = []

  for (const exerciseId of uniqueExerciseIds) {
    const exercise = exercisesById.get(String(exerciseId))
    const exerciseAnchors = exercise ? anchors?.[genderKey]?.[exercise.name] : null
    const sessions = [...(sessionsByExerciseId.get(String(exerciseId))?.values() || [])]
      .sort((a, b) => {
        if (a.rankedAtMs !== b.rankedAtMs) return a.rankedAtMs - b.rankedAtMs
        return String(a.sessionId ?? '').localeCompare(String(b.sessionId ?? ''))
      })

    if (!exercise || !exerciseAnchors || sessions.length === 0) {
      deleted.push(exerciseId)
      continue
    }

    let currentScore = null
    let peakScore = null
    let priorLastRankedAt = null
    let bestAchievableScore = 0

    for (const session of sessions) {
      const priorScore = currentScore ?? session.sessionScore
      const nextScore = updateRollingScore({
        priorScore,
        priorLastRankedAt,
        sessionScore: session.sessionScore,
        now: session.rankedAt,
      })

      bestAchievableScore = Math.max(bestAchievableScore, session.sessionScore)
      peakScore = Math.max(peakScore ?? priorScore, nextScore, bestAchievableScore)
      currentScore = nextScore
      priorLastRankedAt = session.rankedAt
    }

    updates.push({
      exerciseId,
      currentScore,
      peakScore,
      lastRankedAt: priorLastRankedAt,
      updatedAt: nowIso,
    })
  }

  const writeResults = await Promise.all([
    updates.length
      ? supabase.from('exercise_rank_states').upsert(
          updates.map(update => ({
            user_id: userId,
            exercise_id: update.exerciseId,
            current_score: update.currentScore,
            peak_score: update.peakScore,
            last_ranked_at: update.lastRankedAt,
            updated_at: update.updatedAt,
          })),
          { onConflict: 'user_id,exercise_id' },
        )
      : Promise.resolve({ error: null }),
    deleted.length
      ? supabase
          .from('exercise_rank_states')
          .delete()
          .eq('user_id', userId)
          .in('exercise_id', deleted)
      : Promise.resolve({ error: null }),
  ])

  const writeError = writeResults.find(result => result?.error)?.error
  if (writeError) {
    if (isMissingExerciseRankStatesTable(writeError)) {
      return {
        updated: updates.map(update => update.exerciseId),
        deleted,
        missingTable: true,
      }
    }
    throw writeError
  }

  return {
    updated: updates.map(update => update.exerciseId),
    deleted,
    missingTable: false,
  }
}
