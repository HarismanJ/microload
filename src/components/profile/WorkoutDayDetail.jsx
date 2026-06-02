import { useState, useEffect, useEffectEvent, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { invalidateCache } from '../../lib/cache'
import { recalculateStreakAfterDeletion } from '../../lib/streakUtils'
import { recalculateExercisePrs, recalculateExerciseRankStatesFromHistory } from '../../lib/workoutHistory'
import { getLocalTrainingWeekRange } from '../../lib/muscleWorkload'
import { useCurrentUserId } from '../../context/UserContext'
import {
  DEFAULT_BODYWEIGHT_KG,
  convertWeight,
  fmtCompact,
  getProfileBodyweightKg,
  getSetTrainingVolumeKg,
  getSetTrainingVolumeInUnit,
} from '../../lib/liftMath'
import { VALIDATION_LIMITS, validateLength, validateNumber } from '../../lib/inputValidation'
import '../../styles/Profile.css'

function formatDuration(start, end) {
  if (!start || !end) return null
  const mins = Math.round((new Date(end) - new Date(start)) / 60000)
  if (mins < 60) return `${mins}m`
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}

function getDaySetType(set) {
  if (set?.is_warmup || set?.setType === 'warmup' || set?.set_type === 'warmup') return 'warmup'
  return set?.set_type ?? set?.setType ?? 'normal'
}

function isDayWorkingSet(group, set) {
  if (group?.category === 'Cardio' || set?.duration_seconds > 0) return true
  const setType = getDaySetType(set)
  return setType !== 'warmup' && setType !== 'dropset'
}

function priorWeekMuscleKey() {
  const d = new Date(Date.now() - 7 * 86400000)
  return `muscle-workload:prior:${getLocalTrainingWeekRange(d).startIso.slice(0, 10)}`
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

function formatStartTime(ts) {
  if (!ts) return null
  return new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function dayBounds(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number)
  return {
    startIso: new Date(year, month - 1, day, 0, 0, 0, 0).toISOString(),
    endIso: new Date(year, month - 1, day, 23, 59, 59, 999).toISOString(),
  }
}

const NUTRITION_LOG_SELECT = [
  'id',
  'created_at',
  'food_name',
  'servings',
  'calories',
  'protein',
  'carbs',
  'fat',
  'fiber',
  'sugar',
  'saturated_fat',
  'sodium',
  'potassium',
  'cholesterol',
  'calcium',
  'iron',
  'vitamin_a',
  'vitamin_c',
  'vitamin_d',
  'magnesium',
  'zinc',
  'folate',
  'vitamin_b12',
  'vitamin_b6',
].join(', ')
const NUTRIENT_FIELDS = [
  'calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'saturated_fat',
  'sodium', 'potassium', 'cholesterol', 'calcium', 'iron', 'vitamin_a',
  'vitamin_c', 'vitamin_d', 'magnesium', 'zinc', 'folate', 'vitamin_b12', 'vitamin_b6',
]
const INTEGER_NUTRIENTS = new Set(['calories', 'sodium', 'potassium', 'cholesterol', 'calcium', 'magnesium', 'vitamin_a'])

function sumNut(logs, key) {
  return logs.reduce((s, l) => s + (l[key] || 0), 0)
}

function buildUpdatedNutritionLog(log, foodName, servings) {
  const nextServings = Number(servings)
  const currentServings = Number(log.servings) || 1
  const ratio = nextServings / currentServings
  const updated = {
    food_name: foodName.trim(),
    servings: nextServings,
  }

  NUTRIENT_FIELDS.forEach(key => {
    const scaled = Number(log[key] || 0) * ratio
    updated[key] = INTEGER_NUTRIENTS.has(key)
      ? Math.round(scaled)
      : Math.round(scaled * 100) / 100
  })

  return updated
}

export default function WorkoutDayDetail({ sessionId = null, sessionIds = [], dateStr, onBack, onDeleteWorkout, onRefresh, onBodyweightChanged }) {
  const userId = useCurrentUserId()
  const mountedRef = useRef(true)
  useEffect(() => () => { mountedRef.current = false }, [])

  const [workoutSessions, setWorkoutSessions] = useState([])
  const [nutLogs, setNutLogs] = useState([])
  const [weightLogs, setWeightLogs] = useState([])
  const [profileMeta, setProfileMeta] = useState(null)
  const [loading, setLoading] = useState(true)
  const [deleteTargetId, setDeleteTargetId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [deleteError, setDeleteError] = useState('')
  const [editingFoodLogId, setEditingFoodLogId] = useState(null)
  const [foodEditDraft, setFoodEditDraft] = useState({ foodName: '', servings: '' })
  const [foodEditError, setFoodEditError] = useState('')
  const [savingFoodLogId, setSavingFoodLogId] = useState(null)
  const [nutritionDeleteTargetId, setNutritionDeleteTargetId] = useState(null)
  const [deletingNutritionId, setDeletingNutritionId] = useState(null)
  const [nutritionDeleteError, setNutritionDeleteError] = useState('')
  const [weightDeleteTargetId, setWeightDeleteTargetId] = useState(null)
  const [deletingWeightId, setDeletingWeightId] = useState(null)
  const [weightDeleteError, setWeightDeleteError] = useState('')
  const [loadError, setLoadError] = useState('')

  async function load() {
    if (!userId) return
    setLoading(true)
    setLoadError('')
    setWorkoutSessions([])
    setDeleteError('')
    setDeleteTargetId(null)
    setEditingFoodLogId(null)
    setFoodEditError('')
    setNutritionDeleteTargetId(null)
    setNutritionDeleteError('')
    setWeightDeleteTargetId(null)
    setWeightDeleteError('')

    try {
      const activeSessionIds = sessionIds.length ? sessionIds : (sessionId ? [sessionId] : [])
      const { startIso, endIso } = dayBounds(dateStr)
      const promises = [
        supabase
          .from('nutrition_logs')
          .select(NUTRITION_LOG_SELECT)
          .eq('user_id', userId)
          .eq('log_date', dateStr)
          .order('created_at'),
        supabase
          .from('body_weight_logs')
          .select('id, weight, unit, logged_at')
          .eq('user_id', userId)
          .gte('logged_at', startIso)
          .lte('logged_at', endIso)
          .order('logged_at', { ascending: false }),
        supabase
          .from('profiles')
          .select('bodyweight, unit_preference')
          .eq('id', userId)
          .single(),
      ]

      if (activeSessionIds.length) {
        promises.push(
          supabase
            .from('workout_sessions')
            .select('id, started_at, finished_at, notes, exercise_notes, calories_burned')
            .eq('user_id', userId)
            .in('id', activeSessionIds)
            .order('started_at'),
          supabase
            .from('workout_sets')
            .select('id, session_id, exercise_id, set_number, reps, weight, unit, estimated_1rm, duration_seconds, is_warmup, set_type, set_group_index, exercises(name, category, equipment)')
            .eq('user_id', userId)
            .in('session_id', activeSessionIds)
            .order('session_id')
            .order('exercise_id')
            .order('set_number'),
        )
      }

      const results = await Promise.all(promises)
      const queryError = results.find(result => result?.error)?.error
      if (queryError) throw queryError

      const nutData = results[0].data || []
      const weightData = results[1].data || []
      const profileData = results[2].data || null
      setNutLogs(nutData)
      setWeightLogs(weightData)
      setProfileMeta(profileData)

      if (activeSessionIds.length) {
        const sessions = results[3].data || []
        const sets = results[4].data || []
        const groupMap = {}

        sets.forEach(set => {
          if (!groupMap[set.session_id]) groupMap[set.session_id] = {}
          if (!groupMap[set.session_id][set.exercise_id]) {
            groupMap[set.session_id][set.exercise_id] = {
              exerciseId: set.exercise_id,
              name: set.exercises.name,
              category: set.exercises.category,
              equipment: set.exercises.equipment,
              sets: [],
            }
          }
          groupMap[set.session_id][set.exercise_id].sets.push(set)
        })

        setWorkoutSessions(sessions.map(sess => ({
          ...sess,
          groups: Object.values(groupMap[sess.id] || {}),
        })))
      }
    } catch (error) {
      setLoadError(error?.message || 'Could not load this day. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  const loadLatest = useEffectEvent(() => { load() })

  useEffect(() => {
    const timer = setTimeout(() => { loadLatest() }, 0)
    return () => clearTimeout(timer)
  }, [sessionId, sessionIds, dateStr, userId])

  function startFoodLogEdit(item) {
    setEditingFoodLogId(item.id)
    setNutritionDeleteTargetId(null)
    setFoodEditDraft({
      foodName: item.food_name || '',
      servings: String(item.servings ?? 1),
    })
    setFoodEditError('')
  }

  async function handleUpdateFoodLog(item) {
    if (!item?.id || savingFoodLogId) return

    const servings = parseFloat(foodEditDraft.servings)
    const foodName = foodEditDraft.foodName.trim()

    const nameError = validateLength(foodName, {
      label: 'Food name',
      min: 1,
      max: VALIDATION_LIMITS.foodNameMaxLength,
      required: true,
    })
    if (nameError) {
      setFoodEditError(nameError)
      return
    }

    const servingsError = validateNumber(foodEditDraft.servings, {
      label: 'Servings',
      min: 0.01,
      max: VALIDATION_LIMITS.nutritionAmountMax,
      required: true,
      decimals: 2,
    })
    if (servingsError) {
      setFoodEditError(servingsError)
      return
    }

    setSavingFoodLogId(item.id)
    setFoodEditError('')

    try {
      const updates = buildUpdatedNutritionLog(item, foodName, servings)
      const { error } = await supabase
        .from('nutrition_logs')
        .update(updates)
        .eq('id', item.id)

      if (error) throw error

      invalidateCache('home', `nut_${dateStr}`, `cal_${dateStr.slice(0, 7)}`)
      setNutLogs(prev => prev.map(log => log.id === item.id ? { ...log, ...updates } : log))
      setEditingFoodLogId(null)
      onRefresh?.()
    } catch (error) {
      setFoodEditError(error?.message || 'Could not update this food log.')
    } finally {
      if (mountedRef.current) setSavingFoodLogId(null)
    }
  }

  async function handleDeleteWorkout(targetSessionId) {
    if (!targetSessionId || deletingId) return
    setDeletingId(targetSessionId)
    setDeleteError('')

    const calKey = `cal_${dateStr.slice(0, 7)}`

    const bwKg = getProfileBodyweightKg(profileMeta, DEFAULT_BODYWEIGHT_KG)
    const targetSession = workoutSessions.find(sess => sess.id === targetSessionId)
    const sessionVolumeKg = (targetSession?.groups || []).reduce((sum, group) => (
      sum + group.sets.reduce((s2, set) => (
        s2 + getSetTrainingVolumeKg({
          weight: set.weight,
          reps: set.reps,
          unit: set.unit,
          equipment: group.equipment,
          bodyweightKg: bwKg,
          set_type: set.set_type,
          is_warmup: set.is_warmup,
        })
      ), 0)
    ), 0)

    try {
      const { data: profileVol, error: profileFetchError } = await supabase.from('profiles').select('lifetime_volume_kg').eq('id', userId).single()
      if (profileFetchError) throw profileFetchError
      const newLifetimeVolumeKg = Math.max(0, (profileVol?.lifetime_volume_kg ?? 0) - sessionVolumeKg)

      const affectedExerciseIds = [...new Set((targetSession?.groups || []).map(g => g.exerciseId).filter(Boolean))]

      const [{ error }, { error: profileError }] = await Promise.all([
        supabase.from('workout_sessions').delete().eq('id', targetSessionId),
        supabase.from('profiles').update({ lifetime_volume_kg: newLifetimeVolumeKg }).eq('id', userId),
      ])

      if (error || profileError) throw (error || profileError)

      await recalculateExercisePrs(supabase, userId, affectedExerciseIds)
      await recalculateExerciseRankStatesFromHistory(supabase, userId, affectedExerciseIds)

      const remainingSessions = workoutSessions.filter(sess => sess.id !== targetSessionId)
      await recalculateStreakAfterDeletion(supabase, userId)
      invalidateCache('home', 'profile', 'ranks', 'achievements', calKey, priorWeekMuscleKey())
      setWorkoutSessions(remainingSessions)
      setDeleteTargetId(null)
      onDeleteWorkout?.({
        sessionId: targetSessionId,
        remainingSessionIds: remainingSessions.map(sess => sess.id),
        dateStr,
      })
      onRefresh?.()
    } catch (error) {
      setDeleteError(error?.message || 'Could not delete this workout.')
    } finally {
      if (mountedRef.current) setDeletingId(null)
    }
  }

  async function handleDeleteNutritionLog(logId) {
    if (!logId || deletingNutritionId) return
    setDeletingNutritionId(logId)
    setNutritionDeleteError('')

    try {
      const { error } = await supabase.from('nutrition_logs').delete().eq('id', logId)
      if (error) throw error

      invalidateCache('home', `nut_${dateStr}`, `cal_${dateStr.slice(0, 7)}`)
      setNutLogs(prev => prev.filter(log => log.id !== logId))
      setNutritionDeleteTargetId(null)
      onRefresh?.()
    } catch (error) {
      setNutritionDeleteError(error?.message || 'Could not delete this nutrition log.')
    } finally {
      if (mountedRef.current) setDeletingNutritionId(null)
    }
  }

  async function handleDeleteWeightLog(logId) {
    if (!logId || deletingWeightId) return
    setDeletingWeightId(logId)
    setWeightDeleteError('')

    try {
      const [{ error: deleteError }, { data: latestLog, error: latestError }] = await Promise.all([
        supabase.from('body_weight_logs').delete().eq('id', logId),
        supabase
          .from('body_weight_logs')
          .select('weight, unit')
          .eq('user_id', userId)
          .order('logged_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ])

      if (deleteError || latestError) throw (deleteError || latestError)

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          bodyweight: latestLog
            ? convertWeight(latestLog.weight, latestLog.unit || profileMeta?.unit_preference || 'kg', profileMeta?.unit_preference || 'kg')
            : null,
        })
        .eq('id', userId)

      if (profileError) throw profileError

      invalidateCache('profile', 'ranks', 'home', `cal_${dateStr.slice(0, 7)}`)
      setWeightLogs(prev => prev.filter(log => log.id !== logId))
      setWeightDeleteTargetId(null)
      onRefresh?.()
      onBodyweightChanged?.()
    } catch (error) {
      setWeightDeleteError(error?.message || 'Could not delete this weight log.')
    } finally {
      if (mountedRef.current) setDeletingWeightId(null)
    }
  }

  const singleSession = workoutSessions.length === 1 ? workoutSessions[0] : null
  const duration = singleSession ? formatDuration(singleSession.started_at, singleSession.finished_at) : null
  const totalSessions = workoutSessions.length
  const totalExercises = workoutSessions.reduce((sum, sess) => sum + sess.groups.length, 0)
  const hasStrengthWorkout = workoutSessions.some(sess => sess.groups.some(group => group.category !== 'Cardio'))
  const totalSets = workoutSessions.reduce((sum, sess) => (
    sum + sess.groups.reduce((groupSum, group) => (
      groupSum + group.sets.filter(set => isDayWorkingSet(group, set)).length
    ), 0)
  ), 0)
  const totalDropSets = workoutSessions.reduce((sum, sess) => (
    sum + sess.groups.reduce((groupSum, group) => (
      groupSum + group.sets.filter(set => group.category !== 'Cardio' && getDaySetType(set) === 'dropset').length
    ), 0)
  ), 0)
  const profileBodyweightKg = getProfileBodyweightKg(profileMeta, DEFAULT_BODYWEIGHT_KG)
  const totalVolume = workoutSessions.reduce((sum, sess) => (
    sum + sess.groups.reduce((groupSum, group) => (
      groupSum + group.sets.reduce((setSum, set) => (
        setSum + getSetTrainingVolumeInUnit({
          weight: set.weight,
          reps: set.reps,
          unit: set.unit,
          equipment: group.equipment,
          bodyweightKg: profileBodyweightKg,
          set_type: set.set_type,
          is_warmup: set.is_warmup,
        }, profileMeta?.unit_preference || 'kg')
      ), 0)
    ), 0)
  ), 0)

  const totalCaloriesBurned = workoutSessions.reduce((sum, sess) => sum + (sess.calories_burned || 0), 0)
  const totalCals = sumNut(nutLogs, 'calories')
  const totalProtein = sumNut(nutLogs, 'protein')
  const totalCarbs = sumNut(nutLogs, 'carbs')
  const totalFat = sumNut(nutLogs, 'fat')

  return (
    <div className="day-detail">
      <div className="day-detail-header">
        <button className="day-detail-back-btn" onClick={onBack}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
        </button>
        <div>
          <div className="day-detail-date">{formatDate(dateStr)}</div>
          {(duration || totalSessions > 1) && (
            <div className="day-detail-meta">
              {singleSession
                ? `${duration}${totalSets > 0 ? ` · ${totalSets} sets` : ''}`
                : `${totalSessions} workouts${totalSets > 0 ? ` · ${totalSets} sets` : ''}`}
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="day-detail-loading" aria-live="polite">
          <div className="day-detail-calendar-loader" aria-hidden="true">
            <div className="day-detail-calendar-loader-top">
              <span />
              <span />
            </div>
            <div className="day-detail-calendar-loader-grid">
              {Array.from({ length: 9 }, (_, index) => (
                <span key={index} className={`day-detail-calendar-cell day-detail-calendar-cell-${index + 1}`} />
              ))}
            </div>
          </div>
        </div>
      ) : loadError ? (
        <div className="day-detail-content">
          <div className="day-empty-state">
            <p>{loadError}</p>
            <button className="day-detail-retry-btn" onClick={load}>
              Retry
            </button>
          </div>
        </div>
      ) : (
        <div className="day-detail-content">
          {workoutSessions.length > 0 && (
            <>
              <div className="day-section-title">Workout</div>
              <div className="day-summary-row">
                <div className="day-summary-stat">
                  <div className="day-summary-value">{totalSessions > 1 ? totalSessions : totalExercises}</div>
                  <div className="day-summary-label">{totalSessions > 1 ? 'Workouts' : 'Exercises'}</div>
                </div>
                <div className="day-summary-stat">
                  <div className="day-summary-value">{totalDropSets ? `${totalSets} + ${totalDropSets}` : totalSets}</div>
                  <div className="day-summary-label">{totalDropSets ? 'Work + Drops' : (hasStrengthWorkout ? 'Working Sets' : 'Entries')}</div>
                </div>
                <div className="day-summary-stat">
                  <div className="day-summary-value">
                    {totalVolume >= 1000 ? `${(totalVolume / 1000).toFixed(1)}k` : totalVolume.toFixed(0)}
                  </div>
                  <div className="day-summary-label">Effective Vol</div>
                </div>
                {totalCaloriesBurned > 0 && (
                  <div className="day-summary-stat">
                    <div className="day-summary-value">~{fmtCompact(totalCaloriesBurned)}</div>
                    <div className="day-summary-label">kcal</div>
                  </div>
                )}
              </div>

              {workoutSessions.map((sess, idx) => (
                <div key={sess.id} className="day-session-block">
                  <div className="day-session-top">
                    <div>
                      <div className="day-session-title">{totalSessions > 1 ? `Workout #${idx + 1}` : 'Workout'}</div>
                      <div className="day-session-meta">
                        {formatStartTime(sess.started_at)}
                        {sess.finished_at ? ` · ${formatDuration(sess.started_at, sess.finished_at)}` : ''}
                        {sess.groups.length ? ` · ${sess.groups.length} exercises` : ''}
                      </div>
                    </div>
                    <button
                      className="day-delete-btn"
                      onClick={() => {
                        setDeleteTargetId(deleteTargetId === sess.id ? null : sess.id)
                        setDeleteError('')
                      }}
                      disabled={Boolean(deletingId)}
                    >
                      {deleteTargetId === sess.id ? 'Cancel' : 'Delete workout'}
                    </button>
                  </div>

                  {deleteTargetId === sess.id && (
                    <div className="day-delete-card">
                      <div className="day-delete-title">Delete this workout?</div>
                      <div className="day-delete-text">
                        This removes only this session and its sets. Your ranks, profile stats, streaks, achievements, and calendar will update from the remaining workouts.
                      </div>
                      {deleteError && <div className="day-delete-error">{deleteError}</div>}
                      <div className="day-delete-actions">
                        <button className="day-delete-cancel" onClick={() => setDeleteTargetId(null)} disabled={Boolean(deletingId)}>
                          Keep workout
                        </button>
                        <button className="day-delete-confirm" onClick={() => handleDeleteWorkout(sess.id)} disabled={deletingId === sess.id}>
                          {deletingId === sess.id ? 'Deleting…' : 'Delete forever'}
                        </button>
                      </div>
                    </div>
                  )}

                  {sess.groups.map(group => (
                    <div key={`${sess.id}-${group.name}`} className="day-exercise-block">
                      <div className="day-exercise-header">
                        <div className="day-exercise-name">{group.name}</div>
                        <div className="day-exercise-category">{group.category}</div>
                      </div>
                      <div className="day-sets-header">
                        <span>Set</span>
                        <span>Weight</span>
                        <span>Reps</span>
                      </div>
                      {group.sets.map(set => (
                        <div key={set.id} className="day-set-item">
                          <div className="day-set-row">
                            <span className="day-set-num">{set.set_number}</span>
                            {set.duration_seconds != null ? (
                              <span className="day-set-duration">{Math.round(set.duration_seconds / 60)} min</span>
                            ) : (
                              <>
                                <span>{set.weight} {set.unit}</span>
                                <span>{set.reps}</span>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                      {sess.exercise_notes?.[group.exerciseId] && (
                        <div className="day-exercise-note">{sess.exercise_notes[group.exerciseId]}</div>
                      )}
                    </div>
                  ))}

                  {sess.notes && (
                    <div className="day-notes">
                      <div className="day-notes-label">Notes</div>
                      <div className="day-notes-text">{sess.notes}</div>
                    </div>
                  )}
                </div>
              ))}
            </>
          )}

          {nutLogs.length > 0 && (
            <>
              <div className="day-section-title">Nutrition</div>

              <div className="day-nut-summary">
                <div className="day-nut-cal">
                  <span className="day-nut-cal-val">{fmtCompact(Math.round(totalCals))}</span>
                  <span className="day-nut-cal-unit">kcal</span>
                </div>
                <div className="day-nut-macros">
                  {[
                    { label: 'Protein', val: totalProtein, color: '#3b9eff' },
                    { label: 'Carbs', val: totalCarbs, color: '#a855f7' },
                    { label: 'Fat', val: totalFat, color: '#f97316' },
                  ].map(m => (
                    <div key={m.label} className="day-nut-macro">
                      <span className="day-nut-macro-val" style={{ color: m.color }}>{Math.round(m.val)}g</span>
                      <span className="day-nut-macro-label">{m.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {nutritionDeleteError && <div className="day-delete-error">{nutritionDeleteError}</div>}

              <div className="day-meal-block">
                {nutLogs.map(item => (
                    <div key={item.id} className="day-meal-item">
                      <div className="day-meal-row">
                        <span className="day-meal-food">{item.food_name}</span>
                        <span className="day-meal-meta">{item.servings} × {Math.round(item.calories)} kcal</span>
                        <div className="day-meal-right">
                          <button
                            className="day-edit-btn"
                            onClick={() => {
                              if (editingFoodLogId === item.id) {
                                setEditingFoodLogId(null)
                                setFoodEditError('')
                                return
                              }
                              startFoodLogEdit(item)
                            }}
                            disabled={Boolean(savingFoodLogId)}
                          >
                            {editingFoodLogId === item.id ? 'Cancel' : 'Edit'}
                          </button>
                          <button
                            className="day-meal-delete-btn"
                            onClick={() => {
                              setNutritionDeleteTargetId(nutritionDeleteTargetId === item.id ? null : item.id)
                              setNutritionDeleteError('')
                            }}
                            disabled={Boolean(deletingNutritionId)}
                          >
                            {nutritionDeleteTargetId === item.id ? 'Cancel' : 'Delete'}
                          </button>
                        </div>
                      </div>
                      {editingFoodLogId === item.id && (
                        <div className="day-edit-card">
                          <div className="day-edit-grid day-edit-grid-2">
                            <label className="day-edit-field day-edit-field-wide">
                              <span className="day-edit-label">Food name</span>
                              <input
                                className="day-edit-input"
                                value={foodEditDraft.foodName}
                                maxLength={VALIDATION_LIMITS.foodNameMaxLength}
                                onChange={e => setFoodEditDraft(draft => ({ ...draft, foodName: e.target.value }))}
                              />
                            </label>
                            <label className="day-edit-field">
                              <span className="day-edit-label">Servings</span>
                              <input
                                className="day-edit-input"
                                type="number"
                                min="0.01"
                                max={VALIDATION_LIMITS.nutritionAmountMax}
                                step="0.01"
                                inputMode="decimal"
                                value={foodEditDraft.servings}
                                onChange={e => setFoodEditDraft(draft => ({ ...draft, servings: e.target.value }))}
                              />
                            </label>
                          </div>
                          <div className="day-edit-hint">
                            Calories and nutrients will rescale from the original log when you confirm.
                          </div>
                          {foodEditError && <div className="day-delete-error">{foodEditError}</div>}
                          <div className="day-delete-actions">
                            <button
                              className="day-delete-cancel"
                              onClick={() => {
                                setEditingFoodLogId(null)
                                setFoodEditError('')
                              }}
                              disabled={Boolean(savingFoodLogId)}
                            >
                              Keep original
                            </button>
                            <button
                              className="day-delete-confirm"
                              onClick={() => handleUpdateFoodLog(item)}
                              disabled={savingFoodLogId === item.id}
                            >
                              {savingFoodLogId === item.id ? 'Saving…' : 'Confirm update'}
                            </button>
                          </div>
                        </div>
                      )}
                      {nutritionDeleteTargetId === item.id && (
                        <div className="day-delete-card">
                          <div className="day-delete-title">Delete this food log?</div>
                          <div className="day-delete-text">
                            This removes only this nutrition entry from the day totals.
                          </div>
                          {nutritionDeleteError && <div className="day-delete-error">{nutritionDeleteError}</div>}
                          <div className="day-delete-actions">
                            <button
                              className="day-delete-cancel"
                              onClick={() => setNutritionDeleteTargetId(null)}
                              disabled={Boolean(deletingNutritionId)}
                            >
                              Keep log
                            </button>
                            <button
                              className="day-delete-confirm"
                              onClick={() => handleDeleteNutritionLog(item.id)}
                              disabled={deletingNutritionId === item.id}
                            >
                              {deletingNutritionId === item.id ? 'Deleting…' : 'Delete forever'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
              </div>

              <div className="day-micros-block">
                <div className="day-micros-title">Micronutrients</div>
                <div className="day-micros-grid">
                  {[
                    { label: 'Fiber', val: sumNut(nutLogs, 'fiber'), unit: 'g' },
                    { label: 'Sugar', val: sumNut(nutLogs, 'sugar'), unit: 'g' },
                    { label: 'Sat. Fat', val: sumNut(nutLogs, 'saturated_fat'), unit: 'g' },
                    { label: 'Sodium', val: sumNut(nutLogs, 'sodium'), unit: 'mg' },
                    { label: 'Potassium', val: sumNut(nutLogs, 'potassium'), unit: 'mg' },
                    { label: 'Cholesterol', val: sumNut(nutLogs, 'cholesterol'), unit: 'mg' },
                    { label: 'Vitamin D', val: sumNut(nutLogs, 'vitamin_d'), unit: 'mcg' },
                    { label: 'Magnesium', val: sumNut(nutLogs, 'magnesium'), unit: 'mg' },
                    { label: 'Zinc', val: sumNut(nutLogs, 'zinc'), unit: 'mg' },
                    { label: 'Folate', val: sumNut(nutLogs, 'folate'), unit: 'mcg' },
                    { label: 'Vitamin B12', val: sumNut(nutLogs, 'vitamin_b12'), unit: 'mcg' },
                    { label: 'Vitamin B6', val: sumNut(nutLogs, 'vitamin_b6'), unit: 'mg' },
                  ].filter(m => m.val > 0).map(m => (
                    <div key={m.label} className="day-micro-item">
                      <span className="day-micro-label">{m.label}</span>
                      <span className="day-micro-val">{m.val < 10 ? m.val.toFixed(1) : Math.round(m.val)}{m.unit}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {weightLogs.length > 0 && (
            <>
              <div className="day-section-title">Body Weight</div>
              <div className="day-weight-block">
                {weightLogs.map(log => (
                  <div key={log.id} className="day-weight-item">
                    <div className="day-weight-row">
                      <div>
                        <div className="day-weight-value">{log.weight} {log.unit}</div>
                        <div className="day-weight-time">{formatStartTime(log.logged_at)}</div>
                      </div>
                      <button
                        className="day-weight-delete-btn"
                        onClick={() => {
                          setWeightDeleteTargetId(weightDeleteTargetId === log.id ? null : log.id)
                          setWeightDeleteError('')
                        }}
                        disabled={Boolean(deletingWeightId)}
                      >
                        {weightDeleteTargetId === log.id ? 'Cancel' : 'Delete'}
                      </button>
                    </div>
                    {weightDeleteTargetId === log.id && (
                      <div className="day-delete-card">
                        <div className="day-delete-title">Delete this weight log?</div>
                        <div className="day-delete-text">
                          This removes only this weigh-in. Your current bodyweight will update to the newest remaining entry.
                        </div>
                        {weightDeleteError && <div className="day-delete-error">{weightDeleteError}</div>}
                        <div className="day-delete-actions">
                          <button
                            className="day-delete-cancel"
                            onClick={() => setWeightDeleteTargetId(null)}
                            disabled={Boolean(deletingWeightId)}
                          >
                            Keep log
                          </button>
                          <button
                            className="day-delete-confirm"
                            onClick={() => handleDeleteWeightLog(log.id)}
                            disabled={deletingWeightId === log.id}
                          >
                            {deletingWeightId === log.id ? 'Deleting…' : 'Delete forever'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {workoutSessions.length === 0 && nutLogs.length === 0 && weightLogs.length === 0 && (
            <div className="ex-no-data">No activity recorded for this day</div>
          )}
        </div>
      )}
    </div>
  )
}
