import { supabase } from './supabase'

function isMissingWorkoutCountColumn(error) {
  const code = error?.code || ''
  const details = `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`.toLowerCase()

  return (
    code === 'PGRST204'
    || (details.includes('workout_count') && details.includes('profiles'))
  )
}

async function countFinishedWorkouts(userId) {
  const { count, error } = await supabase
    .from('workout_sessions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .not('finished_at', 'is', null)

  return {
    count: error ? null : Math.max(0, count || 0),
    error,
  }
}

function normalizeFields(fields = []) {
  const input = Array.isArray(fields) ? fields : [fields]
  return [...new Set(input.map(field => String(field || '').trim()).filter(Boolean))]
}

function normalizeWorkoutCount(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

export async function fetchProfileWithWorkoutCount(userId, fields = []) {
  const normalizedFields = normalizeFields(fields)
  const selectFields = normalizeFields([...normalizedFields, 'workout_count'])

  const { data, error } = await supabase
    .from('profiles')
    .select(selectFields.join(', '))
    .eq('id', userId)
    .single()

  if (error) {
    if (!isMissingWorkoutCountColumn(error)) {
      return {
        data: data ?? null,
        error,
        usedFallback: false,
      }
    }

    const fallbackQueries = []

    if (normalizedFields.length > 0) {
      fallbackQueries.push(
        supabase
          .from('profiles')
          .select(normalizedFields.join(', '))
          .eq('id', userId)
          .single()
      )
    } else {
      fallbackQueries.push(Promise.resolve({ data: {}, error: null }))
    }

    fallbackQueries.push(countFinishedWorkouts(userId))

    const [profileResult, workoutCountResult] = await Promise.all(fallbackQueries)
    if (profileResult.error) {
      return {
        data: profileResult.data ?? null,
        error: profileResult.error,
        usedFallback: true,
      }
    }

    return {
      data: {
        ...(profileResult.data || {}),
        workout_count: workoutCountResult.count,
      },
      error: workoutCountResult.error,
      usedFallback: true,
    }
  }

  const workoutCount = normalizeWorkoutCount(data?.workout_count)
  if (workoutCount !== null) {
    return {
      data: {
        ...(data || {}),
        workout_count: workoutCount,
      },
      error: null,
      usedFallback: false,
    }
  }

  const workoutCountResult = await countFinishedWorkouts(userId)
  return {
    data: {
      ...(data || {}),
      workout_count: workoutCountResult.count,
    },
    error: workoutCountResult.error,
    usedFallback: true,
  }
}
