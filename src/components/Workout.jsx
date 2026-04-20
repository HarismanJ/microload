import { useState, useEffect, useRef, useEffectEvent, lazy, Suspense, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../lib/supabase'
import { createCustomExercise, fetchExercises, invalidateExercisesCache } from '../data/exercises'
import { fetchExerciseRankStates, mapExerciseRankStates, upsertExerciseRankStates } from '../data/rankStates'
import { calculateORM } from '../lib/orm'
import { TEMPLATES } from '../data/templates'
import { invalidateCache } from '../lib/cache'
import { ANCHORS, TIERS, expandAnchors, getTierIdx, getProgress, tierColor } from '../lib/strengthStandards'
import { ACHIEVEMENTS } from '../data/achievements'
import LoadingSpinner from './LoadingSpinner'
import RestWheelPicker from './RestWheelPicker'
import {
  DndContext, closestCenter, PointerSensor, TouchSensor,
  useSensor, useSensors, MeasuringStrategy
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy,
  useSortable, arrayMove
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { scheduleRestEndNotification, cancelRestNotification } from '../lib/restNotification'
import { normalizeSearchValue, matchesSearchQuery, scoreExerciseMatch } from '../lib/exerciseSearch'
import {
  DEFAULT_BODYWEIGHT_KG,
  MAX_REPS,
  getProfileBodyweightKg,
  getSetVolumeInUnit,
  getSetVolumeKg,
  getWeightInputMax,
  getWeightInputMin,
  isRepsWithinInputRange,
  isWeightWithinInputRange,
} from '../lib/liftMath'
import {
  loadBattleRecap,
  loadOpponentEvents,
  publishWorkoutRoomEvent,
  resolveWorkoutRoomIfComplete,
} from '../lib/battles'
import { CUSTOM_EQUIPMENT_OPTIONS, SUPPORTED_MUSCLES } from '../lib/exerciseOptions'
import { clampContinuousTierScore, updateRollingScore } from '../lib/rollingRanks'
import '../styles/Workout.css'

const ExerciseDetail = lazy(() => import('./exercise/ExerciseDetail'))
const WORKOUT_DRAFT_VERSION = 1
const SOLO_WORKOUT_DRAFT_MAX_AGE_MS = 12 * 60 * 60 * 1000
const SHARED_WORKOUT_DRAFT_MAX_AGE_MS = 24 * 60 * 60 * 1000

const defaultSet = () => ({ reps: '', weight: '', done: false })
const defaultCardioSet = () => ({ duration: '', done: false })

function getWorkoutDraftStorageKey(userId, roomId = null) {
  return roomId
    ? `battleWorkoutDraft:${roomId}:${userId}`
    : `workoutDraft:${userId}`
}

function readStoredWorkoutDraft(userId, roomId = null) {
  if (!userId || typeof window === 'undefined') return { draft: null, expiredSessionId: null }

  try {
    const raw = window.localStorage.getItem(getWorkoutDraftStorageKey(userId, roomId))
    if (!raw) return { draft: null, expiredSessionId: null }

    const parsed = JSON.parse(raw)
    if (!parsed || parsed.version !== WORKOUT_DRAFT_VERSION) {
      window.localStorage.removeItem(getWorkoutDraftStorageKey(userId, roomId))
      return { draft: null, expiredSessionId: null }
    }

    const maxAgeMs = roomId ? SHARED_WORKOUT_DRAFT_MAX_AGE_MS : SOLO_WORKOUT_DRAFT_MAX_AGE_MS
    if (parsed.savedAt && Date.now() - parsed.savedAt > maxAgeMs) {
      window.localStorage.removeItem(getWorkoutDraftStorageKey(userId, roomId))
      return { draft: null, expiredSessionId: parsed.sessionId || null }
    }

    return { draft: parsed, expiredSessionId: null }
  } catch {
    return { draft: null, expiredSessionId: null }
  }
}

function writeStoredWorkoutDraft(userId, draft, roomId = null) {
  if (!userId || !draft || typeof window === 'undefined') return

  try {
    window.localStorage.setItem(getWorkoutDraftStorageKey(userId, roomId), JSON.stringify(draft))
  } catch {
    // Ignore storage issues so the workout itself stays usable.
  }
}

function clearStoredWorkoutDraft(userId, roomId = null) {
  if (!userId || typeof window === 'undefined') return

  try {
    window.localStorage.removeItem(getWorkoutDraftStorageKey(userId, roomId))
  } catch {
    // Ignore storage issues so the workout itself stays usable.
  }
}

function getRankRatio(exercise, ormKg, bodyweightKg) {
  if (!bodyweightKg) return 0
  return exercise.equipment === 'Bodyweight'
    ? (ormKg + bodyweightKg) / bodyweightKg
    : ormKg / bodyweightKg
}

function getContinuousExerciseScore(exercise, ormKg, bodyweightKg, thresholds) {
  const ratio = getRankRatio(exercise, ormKg, bodyweightKg)
  const tierIdx = getTierIdx(ratio, thresholds)
  const progress = getProgress(ratio, thresholds, tierIdx)
  return clampContinuousTierScore(tierIdx + Math.min(0.999, progress / 100))
}

function createRestTimer(seconds, exerciseName) {
  return {
    endTime: Date.now() + seconds * 1000,
    total: seconds,
    exerciseName,
    completed: false,
  }
}

function getRemainingRestSeconds(restTimer) {
  return Math.max(0, Math.ceil((restTimer.endTime - Date.now()) / 1000))
}

function buildRemoteWorkouts(events, exerciseLibrary, participants = []) {
  const exerciseLookup = new Map((exerciseLibrary || []).map(exercise => [exercise.id, exercise]))
  const orderedEvents = [...(events || [])].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
  const participantsById = new Map((participants || []).map(participant => [participant.user_id, participant]))
  const workoutsByUser = new Map()

  const ensureWorkout = (userId) => {
    if (!workoutsByUser.has(userId)) {
      const participant = participantsById.get(userId)
      workoutsByUser.set(userId, {
        userId,
        name: participant?.profile?.full_name || participant?.profile?.username || 'Friend',
        status: 'live',
        exercises: new Map(),
        order: [],
        lastEventAt: null,
      })
    }
    return workoutsByUser.get(userId)
  }

  const ensureExercise = (workout, exerciseId, exerciseName, fallbackUnit = 'kg', fallbackCategory = 'Live battle') => {
    const key = exerciseId ?? exerciseName
    if (!key) return null
    if (!workout.exercises.has(key)) {
      const meta = exerciseId ? exerciseLookup.get(exerciseId) : null
      workout.exercises.set(key, {
        key,
        id: exerciseId ?? null,
        name: exerciseName || meta?.name || 'Exercise',
        category: meta?.category || fallbackCategory,
        unit: fallbackUnit,
        sets: [],
      })
      workout.order.push(key)
    }
    return workout.exercises.get(key)
  }

  for (const event of orderedEvents) {
    const payload = event.payload || {}
    const workout = ensureWorkout(event.user_id)
    workout.lastEventAt = event.created_at

    if (event.event_type === 'workout_finished') {
      workout.status = 'finished'
      continue
    }

    if (event.event_type === 'workout_cancelled') {
      workout.status = 'left'
      continue
    }

    if (event.event_type === 'exercise_added') {
      const ids = payload.exerciseIds || []
      const names = payload.exerciseNames || []
      const categories = payload.exerciseCategories || []
      const count = Math.max(ids.length, names.length)
      for (let i = 0; i < count; i += 1) {
        ensureExercise(workout, ids[i] ?? null, names[i] ?? null, 'kg', categories[i] || 'Live battle')
      }
    }

    if (event.event_type === 'set_completed') {
      const exercise = ensureExercise(workout, payload.exerciseId ?? null, payload.exerciseName ?? null, payload.unit || 'kg', payload.category || 'Live battle')
      if (!exercise) continue
      const setIndex = Math.max(0, (Number(payload.setNumber) || 1) - 1)
      while (exercise.sets.length <= setIndex) {
        exercise.sets.push({ weight: '', reps: '', done: false })
      }
      exercise.unit = payload.unit || exercise.unit || 'kg'
      exercise.sets[setIndex] = {
        weight: Number(payload.weight) || 0,
        reps: Number(payload.reps) || 0,
        done: true,
      }
    }

    if (event.event_type === 'set_removed') {
      const exercise = ensureExercise(workout, payload.exerciseId ?? null, payload.exerciseName ?? null, payload.unit || 'kg', payload.category || 'Live battle')
      if (!exercise) continue
      const setIndex = Math.max(0, (Number(payload.setNumber) || 1) - 1)
      if (setIndex < exercise.sets.length) {
        exercise.sets.splice(setIndex, 1)
      }
    }
  }

  return [...workoutsByUser.values()]
    .map(workout => ({
      ...workout,
      exercises: workout.order.map(key => workout.exercises.get(key)).filter(Boolean),
    }))
    .sort((a, b) => {
      if (a.status !== b.status) {
        if (a.status === 'live') return -1
        if (b.status === 'live') return 1
      }
      return a.name.localeCompare(b.name)
    })
}


function SortableRoutineRow({ name, children }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: name })
  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }
  return (
    <div ref={setNodeRef} style={style}>
      {children({ listeners, attributes })}
    </div>
  )
}

function SortableExerciseBlock({ id, children }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div ref={setNodeRef} className="sortable-exercise-shell" style={style}>
      {children({ listeners, attributes, isDragging })}
    </div>
  )
}

export default function Workout({
  onStatusChange,
  onFinish,
  battleRoom,
  onBattleRoomClosed,
  startEmptyWorkoutTick = 0,
  resumeWorkoutTick = 0,
  isVisible = false,
}) {
  const [activeWorkout, setActiveWorkout] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [showExercises, setShowExercises] = useState(false)
  const [pickerExiting, setPickerExiting] = useState(false)
  const [selected, setSelected] = useState([])
  const [workoutExercises, setWorkoutExercises] = useState([])
  const [exerciseLibrary, setExerciseLibrary] = useState([])
  const [sessionId, setSessionId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [detailExerciseId, setDetailExerciseId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [confirmAction, setConfirmAction] = useState(null) // null | 'cancel' | 'finish' | 'restart' | 'incomplete'
  const [confirmBusy, setConfirmBusy] = useState(false)
  const [defaultRest, setDefaultRest] = useState(90)
  const [restTimer, setRestTimer] = useState(null)
  const [editingRest, setEditingRest] = useState(null)
  const sensors = useSensors(
    useSensor(TouchSensor, { activationConstraint: { delay: 100, tolerance: 6 } }),
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )
  const [userId, setUserId] = useState(null)
  const [userBodyweightKg, setUserBodyweightKg] = useState(null)
  const [prevSetsMap, setPrevSetsMap] = useState({})
  const [defaultUnit, setDefaultUnit] = useState('kg')
  const [swipeState, setSwipeState] = useState(null) // { exId, idx, dx } — for rendering
  const swipeRef = useRef(null) // { exId, idx, startX, dx } — for event handlers
  const swipeRafRef = useRef(null)
  const workoutStartRef = useRef(null) // absolute timestamp when workout started
  const [templateSwipeState, setTemplateSwipeState] = useState(null) // { id, dx }
  const templateSwipeRef = useRef(null) // { id, startX, dx }
  const [exerciseNotes, setExerciseNotes] = useState({}) // { [exId]: string }
  const [notesOpen, setNotesOpen] = useState({}) // { [exId]: bool }
  const [battleEvents, setBattleEvents] = useState([])
  const [battleSyncError, setBattleSyncError] = useState('')
  const [battleNotice, setBattleNotice] = useState('')
  const [savedWorkoutDraft, setSavedWorkoutDraft] = useState(null)
  const [savedWorkoutDraftBusy, setSavedWorkoutDraftBusy] = useState(false)
  const [savedBattleWorkoutDraft, setSavedBattleWorkoutDraft] = useState(null)
  const [expiredWorkoutDraftSessionId, setExpiredWorkoutDraftSessionId] = useState(null)
  const [expiredBattleWorkoutDraftSessionId, setExpiredBattleWorkoutDraftSessionId] = useState(null)
  const [battleDraftReady, setBattleDraftReady] = useState(false)
  const [battleDraftBusy, setBattleDraftBusy] = useState(false)
  const [battleFeedHidden, setBattleFeedHidden] = useState(() => {
    try { return localStorage.getItem('battleFeedHidden') === '1' } catch { return false }
  })
  const [battleStarting, setBattleStarting] = useState(false)
  const [showCustomExerciseForm, setShowCustomExerciseForm] = useState(false)
  const [savingCustomExercise, setSavingCustomExercise] = useState(false)
  const [customExerciseError, setCustomExerciseError] = useState('')
  const [customExerciseForm, setCustomExerciseForm] = useState({
    name: '',
    category: '',
    equipment: 'Bodyweight',
    primary_muscles: [],
    secondary_muscles: [],
    default_rest_seconds: 90,
  })
  const battleStartedRoomRef = useRef(null)
  const completedBattleRoomRef = useRef(null)
  const isFinishingRef = useRef(false)
  const latestWorkoutDraftRef = useRef(null)
  const latestBattleWorkoutDraftRef = useRef(null)
  const battleModeActive = Boolean(battleRoom?.id) && completedBattleRoomRef.current !== battleRoom.id
  const surfacedRemoteFinishEventIdsRef = useRef(new Set())

  // Routine builder state
  const [userRoutines, setUserRoutines] = useState([])
  const [hiddenTemplates, setHiddenTemplates] = useState(() => {
    try { return JSON.parse(localStorage.getItem('hiddenTemplates') || '[]') } catch { return [] }
  })
  const [showRoutineBuilder, setShowRoutineBuilder] = useState(false)
  const [routineName, setRoutineName] = useState('')
  const [routineDesc, setRoutineDesc] = useState('')
  const [routineExercises, setRoutineExercises] = useState([]) // [{ name, sets }]
  const [editingRoutineId, setEditingRoutineId] = useState(null)
  const [pickerContext, setPickerContext] = useState('workout') // 'workout' | 'routine'

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        const [exercises, { data: prof }, { data: routines }, { data: restPrefs }] = await Promise.all([
          fetchExercises(user.id),
          supabase.from('profiles').select('default_rest_seconds, unit_preference, bodyweight').eq('id', user.id).single(),
          supabase.from('user_routines').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
          supabase.from('user_exercise_preferences').select('exercise_id, rest_seconds').eq('user_id', user.id),
        ])
        setUserId(user.id)
        const prefMap = new Map((restPrefs || []).map(p => [p.exercise_id, p.rest_seconds]))
        const libraryWithPrefs = (exercises || []).map(ex =>
          prefMap.has(ex.id) ? { ...ex, default_rest_seconds: prefMap.get(ex.id) } : ex
        )
        setExerciseLibrary(libraryWithPrefs)
        setDefaultRest(prof?.default_rest_seconds ?? 90)
        setDefaultUnit(prof?.unit_preference || 'kg')
        setUserBodyweightKg(getProfileBodyweightKg(prof))
        setUserRoutines(routines || [])
        const soloDraftState = readStoredWorkoutDraft(user.id)
        setSavedWorkoutDraft(soloDraftState.draft)
        setExpiredWorkoutDraftSessionId(soloDraftState.expiredSessionId)
      } catch (err) {
        setBattleSyncError(err.message || 'Could not load your workout setup.')
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  useEffect(() => {
    if (!battleNotice) return undefined
    const timer = setTimeout(() => setBattleNotice(''), 2200)
    return () => clearTimeout(timer)
  }, [battleNotice])

  const clearWorkoutDraft = useEffectEvent(() => {
    if (!userId) return
    latestWorkoutDraftRef.current = null
    clearStoredWorkoutDraft(userId)
    setSavedWorkoutDraft(null)
  })

  const flushWorkoutDraft = useEffectEvent(() => {
    if (!userId) return
    const draft = latestWorkoutDraftRef.current
    if (!draft) return
    writeStoredWorkoutDraft(userId, { ...draft, savedAt: Date.now() })
  })

  const clearBattleWorkoutDraft = useEffectEvent(() => {
    if (!userId || !battleRoom?.id) return
    latestBattleWorkoutDraftRef.current = null
    clearStoredWorkoutDraft(userId, battleRoom.id)
    setSavedBattleWorkoutDraft(null)
  })

  const flushBattleWorkoutDraft = useEffectEvent(() => {
    if (!userId || !battleRoom?.id) return
    const draft = latestBattleWorkoutDraftRef.current
    if (!draft) return
    writeStoredWorkoutDraft(userId, { ...draft, savedAt: Date.now() }, battleRoom.id)
  })

  useEffect(() => {
    if (!userId || !battleRoom?.id) {
      setSavedBattleWorkoutDraft(null)
      setExpiredBattleWorkoutDraftSessionId(null)
      setBattleDraftReady(!battleRoom?.id)
      latestBattleWorkoutDraftRef.current = null
      return
    }

    const battleDraftState = readStoredWorkoutDraft(userId, battleRoom.id)
    setSavedBattleWorkoutDraft(battleDraftState.draft)
    setExpiredBattleWorkoutDraftSessionId(battleDraftState.expiredSessionId)
    setBattleDraftReady(true)
  }, [battleRoom?.id, userId])

  useEffect(() => {
    if (!userId || !activeWorkout || !sessionId || battleModeActive) {
      latestWorkoutDraftRef.current = null
      return undefined
    }

    const startedAt = workoutStartRef.current || Date.now()
    workoutStartRef.current = startedAt

    latestWorkoutDraftRef.current = {
      version: WORKOUT_DRAFT_VERSION,
      savedAt: Date.now(),
      sessionId,
      startedAt,
      workoutExercises,
      exerciseNotes,
      notesOpen,
      restTimer: restTimer && getRemainingRestSeconds(restTimer) > 0 ? restTimer : null,
      defaultUnit,
      defaultRest,
    }

    const timer = setTimeout(() => flushWorkoutDraft(), 160)
    return () => clearTimeout(timer)
  }, [
    activeWorkout,
    battleModeActive,
    defaultRest,
    defaultUnit,
    exerciseNotes,
    flushWorkoutDraft,
    notesOpen,
    restTimer,
    sessionId,
    userId,
    workoutExercises,
  ])

  useEffect(() => {
    if (!userId || !battleModeActive || !battleRoom?.id || !activeWorkout || !sessionId) {
      latestBattleWorkoutDraftRef.current = null
      return undefined
    }

    const startedAt = workoutStartRef.current || Date.now()
    workoutStartRef.current = startedAt

    latestBattleWorkoutDraftRef.current = {
      version: WORKOUT_DRAFT_VERSION,
      savedAt: Date.now(),
      sessionId,
      startedAt,
      workoutExercises,
      exerciseNotes,
      notesOpen,
      restTimer: restTimer && getRemainingRestSeconds(restTimer) > 0 ? restTimer : null,
      defaultUnit,
      defaultRest,
      roomId: battleRoom.id,
    }

    const timer = setTimeout(() => flushBattleWorkoutDraft(), 160)
    return () => clearTimeout(timer)
  }, [
    activeWorkout,
    battleModeActive,
    battleRoom?.id,
    defaultRest,
    defaultUnit,
    exerciseNotes,
    flushBattleWorkoutDraft,
    notesOpen,
    restTimer,
    sessionId,
    userId,
    workoutExercises,
  ])

  useEffect(() => {
    if (!userId) return undefined

    const handlePageHide = () => {
      flushWorkoutDraft()
      flushBattleWorkoutDraft()
    }
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushWorkoutDraft()
        flushBattleWorkoutDraft()
      }
    }

    window.addEventListener('pagehide', handlePageHide)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('pagehide', handlePageHide)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [flushBattleWorkoutDraft, flushWorkoutDraft, userId])

  useEffect(() => {
    if (!userId || !expiredWorkoutDraftSessionId) return undefined

    let cancelled = false

    const cleanup = async () => {
      try {
        await supabase
          .from('workout_sessions')
          .delete()
          .eq('id', expiredWorkoutDraftSessionId)
          .eq('user_id', userId)
          .is('finished_at', null)
      } finally {
        if (!cancelled) setExpiredWorkoutDraftSessionId(null)
      }
    }

    cleanup()
    return () => { cancelled = true }
  }, [expiredWorkoutDraftSessionId, userId])

  useEffect(() => {
    if (!userId || !expiredBattleWorkoutDraftSessionId) return undefined

    let cancelled = false

    const cleanup = async () => {
      try {
        if (battleRoom?.id) {
          await publishWorkoutRoomEvent(battleRoom.id, userId, 'workout_stale', {
            sessionId: expiredBattleWorkoutDraftSessionId,
          })
          await resolveWorkoutRoomIfComplete(battleRoom.id, userId)
        }

        await supabase
          .from('workout_sessions')
          .delete()
          .eq('id', expiredBattleWorkoutDraftSessionId)
          .eq('user_id', userId)
          .is('finished_at', null)
      } finally {
        if (!cancelled) setExpiredBattleWorkoutDraftSessionId(null)
      }
    }

    cleanup()
    return () => { cancelled = true }
  }, [battleRoom?.id, expiredBattleWorkoutDraftSessionId, userId])

  const performStartWorkout = async ({ isBattleStart = false } = {}) => {
    if (battleStarting || activeWorkout || sessionId) return false

    setBattleStarting(true)
    setBattleSyncError('')

    const { data: { user } } = await supabase.auth.getUser()
    try {
      const [{ data: sess, error: sessionError }, { data: prof, error: profileError }] = await Promise.all([
        supabase.from('workout_sessions').insert({ user_id: user.id }).select().single(),
        supabase.from('profiles').select('unit_preference').eq('id', user.id).single(),
      ])

      if (sessionError) throw sessionError
      if (profileError) throw profileError
      if (!sess) throw new Error('Could not create your workout session.')

      workoutStartRef.current = Date.now()
      setSessionId(sess.id)
      const unit = prof?.unit_preference || 'kg'
      setDefaultUnit(unit)
      setActiveWorkout(true)
      writeStoredWorkoutDraft(user.id, {
        version: WORKOUT_DRAFT_VERSION,
        savedAt: Date.now(),
        sessionId: sess.id,
        startedAt: workoutStartRef.current,
        workoutExercises: [],
        exerciseNotes: {},
        notesOpen: {},
        restTimer: null,
        defaultUnit: unit,
        defaultRest,
      }, battleModeActive ? battleRoom?.id : null)

      if (battleModeActive && isBattleStart) {
        try {
          await publishBattleEvent('workout_started', {})
        } catch (err) {
          setBattleSyncError(err.message || 'Could not announce your battle workout start.')
        }
      }

      return true
    } catch (err) {
      setBattleSyncError(err.message || 'Could not start your workout.')
      return false
    } finally {
      setBattleStarting(false)
    }
  }

  async function publishBattleEvent(eventType, payload = {}) {
    if (!battleRoom?.id || !userId) return
    await publishWorkoutRoomEvent(battleRoom.id, userId, eventType, payload)
  }

  async function resolveCurrentBattleRoom() {
    if (!battleRoom?.id) return false
    return resolveWorkoutRoomIfComplete(battleRoom.id, userId)
  }

  async function loadCurrentBattleRecap() {
    if (!battleRoom?.id || !userId) return null
    return loadBattleRecap(battleRoom.id, userId)
  }

  const startBattleWorkout = useEffectEvent(() => {
    performStartWorkout({ isBattleStart: true })
  })

  const loadUserRoutines = async (uid) => {
    const { data } = await supabase.from('user_routines').select('*').eq('user_id', uid).order('created_at', { ascending: false })
    if (data) setUserRoutines(data)
  }

  const loadPrevSets = async (exerciseIds, uid, sid) => {
    if (!exerciseIds.length || !uid) return
    let q = supabase
      .from('workout_sets')
      .select('exercise_id, weight, reps, unit, set_number, session_id, duration_seconds')
      .eq('user_id', uid)
      .in('exercise_id', exerciseIds)
      .order('created_at', { ascending: false })
      .limit(exerciseIds.length * 12)
    if (sid) q = q.neq('session_id', sid)
    const { data } = await q
    if (!data?.length) return
    const seen = {}
    const map = {}
    for (const row of data) {
      if (!seen[row.exercise_id]) seen[row.exercise_id] = row.session_id
      if (seen[row.exercise_id] === row.session_id) {
        if (!map[row.exercise_id]) map[row.exercise_id] = []
        map[row.exercise_id].push(row)
      }
    }
    for (const id in map) map[id].sort((a, b) => a.set_number - b.set_number)
    setPrevSetsMap(prev => ({ ...prev, ...map }))
  }

  // Pre-fill blank first sets from previous session when prevSetsMap loads
  useEffect(() => {
    if (!Object.keys(prevSetsMap).length) return
    setWorkoutExercises(prev => prev.map(ex => {
      const prevSet = prevSetsMap[ex.id]?.[0]
      if (!prevSet) return ex
      const first = ex.sets[0]
      if (first.weight !== '' || first.reps !== '') return ex // user already entered data
      const weight = prevSet.unit === ex.unit
        ? prevSet.weight
        : prevSet.unit === 'lbs'
          ? Math.round(prevSet.weight * 0.453592 * 10) / 10
          : Math.round(prevSet.weight * 2.20462 * 10) / 10
      return { ...ex, sets: ex.sets.map((s, i) => i === 0 ? { ...s, weight: String(weight), reps: String(prevSet.reps) } : s) }
    }))
  }, [prevSetsMap])

  // Rest countdown — uses absolute endTime so backgrounding doesn't desync
  useEffect(() => {
    if (!restTimer) return
    if (restTimer.completed) {
      const timeout = setTimeout(() => setRestTimer(null), 1200)
      return () => clearTimeout(timeout)
    }
    const tick = () => {
      const remaining = Math.ceil((restTimer.endTime - Date.now()) / 1000)
      if (remaining <= 0) {
        setRestTimer(current => current ? {
          ...current,
          endTime: Date.now(),
          completed: true,
        } : null)
      } else {
        setRestTimer(r => r ? { ...r } : null) // trigger re-render to recalculate remaining
      }
    }
    const t = setTimeout(tick, 500)
    return () => clearTimeout(t)
  }, [restTimer])

  // Trigger from quick-action sheet: start an empty workout if none is active
  useEffect(() => {
    if (startEmptyWorkoutTick === 0) return
    if (!activeWorkout && !sessionId) performStartWorkout()
  }, [startEmptyWorkoutTick]) // eslint-disable-line react-hooks/exhaustive-deps

  // Workout timer — uses absolute start time so backgrounding doesn't desync
  useEffect(() => {
    if (!activeWorkout) { setSeconds(0); workoutStartRef.current = null; return }
    if (!workoutStartRef.current) workoutStartRef.current = Date.now()
    const interval = setInterval(() => {
      setSeconds(Math.floor((Date.now() - workoutStartRef.current) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [activeWorkout])

  useEffect(() => {
    const roomId = battleRoom?.id
    if (!roomId || !userId) {
      return undefined
    }

    let mounted = true

    const loadEvents = async () => {
      try {
        const events = await loadOpponentEvents(roomId, userId)
        if (mounted) {
          setBattleEvents(events)
          setBattleSyncError('')
        }
      } catch (err) {
        if (mounted) setBattleSyncError(err.message || 'Could not sync your battle feed.')
      }
    }

    loadEvents()

    const channel = supabase
      .channel(`workout-room-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'workout_room_events',
          filter: `room_id=eq.${roomId}`,
        },
        payload => {
          if (!mounted) return
          const row = payload.new
          if (!row || row.user_id === userId) return
          if (row.event_type === 'workout_finished') {
            if (!surfacedRemoteFinishEventIdsRef.current.has(row.id)) {
              surfacedRemoteFinishEventIdsRef.current.add(row.id)
              const finisherName = battleRoom.opponentProfile?.full_name || battleRoom.opponentProfile?.username || 'Your friend'
              setBattleNotice(`${finisherName} finished their workout.`)
            }
          }
          setBattleEvents(prev => [row, ...prev.filter(event => event.id !== row.id)].slice(0, 100))
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workout_rooms',
          filter: `id=eq.${roomId}`,
        },
        payload => {
          if (payload.new?.status === 'finished' || payload.new?.status === 'cancelled') {
            onBattleRoomClosed?.(payload.new.status)
          }
        }
      )
      .subscribe()

    return () => {
      mounted = false
      supabase.removeChannel(channel)
    }
  }, [battleRoom, onBattleRoomClosed, userId])

  useEffect(() => {
    if (
      !battleRoom?.id
      || !battleDraftReady
      || savedBattleWorkoutDraft
      || battleDraftBusy
      || loading
      || activeWorkout
      || sessionId
      || battleStartedRoomRef.current === battleRoom.id
      || completedBattleRoomRef.current === battleRoom.id
    ) return

    let cancelled = false
    const roomId = battleRoom.id

    const timer = setTimeout(async () => {
      const started = await startBattleWorkout()
      if (!cancelled && started) {
        battleStartedRoomRef.current = roomId
      }
    }, 0)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [activeWorkout, battleDraftBusy, battleDraftReady, battleRoom?.id, loading, savedBattleWorkoutDraft, sessionId])

  useEffect(() => {
    if (!battleRoom?.id) {
      completedBattleRoomRef.current = null
    }
  }, [battleRoom?.id])

  const resumeSavedBattleWorkout = useEffectEvent(async () => {
    if (
      !battleModeActive
      || !battleRoom?.id
      || !battleDraftReady
      || !savedBattleWorkoutDraft
      || activeWorkout
      || sessionId
      || loading
      || battleDraftBusy
      || !userId
    ) return

    setBattleDraftBusy(true)
    try {
      const { data: sessionRow, error } = await supabase
        .from('workout_sessions')
        .select('id')
        .eq('id', savedBattleWorkoutDraft.sessionId)
        .eq('user_id', userId)
        .is('finished_at', null)
        .maybeSingle()

      if (error || !sessionRow) {
        clearBattleWorkoutDraft()
        setBattleSyncError('Your shared workout could not be resumed.')
        return
      }

      const restoredStartedAt = savedBattleWorkoutDraft.startedAt || Date.now()
      const restoredExercises = Array.isArray(savedBattleWorkoutDraft.workoutExercises)
        ? savedBattleWorkoutDraft.workoutExercises
        : []
      const restoredRestTimer = savedBattleWorkoutDraft.restTimer && getRemainingRestSeconds(savedBattleWorkoutDraft.restTimer) > 0
        ? savedBattleWorkoutDraft.restTimer
        : null

      workoutStartRef.current = restoredStartedAt
      setSessionId(savedBattleWorkoutDraft.sessionId)
      setDefaultUnit(savedBattleWorkoutDraft.defaultUnit || defaultUnit)
      setDefaultRest(savedBattleWorkoutDraft.defaultRest ?? defaultRest)
      setWorkoutExercises(restoredExercises)
      setExerciseNotes(savedBattleWorkoutDraft.exerciseNotes || {})
      setNotesOpen(savedBattleWorkoutDraft.notesOpen || {})
      setRestTimer(restoredRestTimer)
      setSeconds(Math.max(0, Math.floor((Date.now() - restoredStartedAt) / 1000)))
      setActiveWorkout(true)
      setSavedBattleWorkoutDraft(null)

      if (restoredRestTimer) {
        scheduleRestEndNotification(getRemainingRestSeconds(restoredRestTimer), restoredRestTimer.exerciseName)
      }

      if (restoredExercises.length > 0) {
        loadPrevSets(restoredExercises.map(exercise => exercise.id), userId, savedBattleWorkoutDraft.sessionId)
      }
    } finally {
      setBattleDraftBusy(false)
    }
  })

  useEffect(() => {
    if (
      !battleModeActive
      || !battleRoom?.id
      || !battleDraftReady
      || !savedBattleWorkoutDraft
      || activeWorkout
      || sessionId
      || loading
      || battleDraftBusy
      || !userId
    ) return undefined

    let cancelled = false

    const timer = setTimeout(async () => {
      try {
        if (cancelled) return
        await resumeSavedBattleWorkout()
      } catch {
        // Resume errors are surfaced inside the resume helper.
      }
    }, 0)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [
    activeWorkout,
    battleDraftBusy,
    battleDraftReady,
    battleModeActive,
    battleRoom?.id,
    clearBattleWorkoutDraft,
    defaultRest,
    defaultUnit,
    loading,
    resumeSavedBattleWorkout,
    savedBattleWorkoutDraft,
    sessionId,
    userId,
  ])

  useEffect(() => {
    if (resumeWorkoutTick === 0) return
    if (activeWorkout || sessionId || loading) return
    if (savedWorkoutDraft) {
      resumeSavedWorkout()
      return
    }
    if (savedBattleWorkoutDraft) {
      resumeSavedBattleWorkout()
    }
  }, [
    activeWorkout,
    loading,
    resumeSavedBattleWorkout,
    resumeWorkoutTick,
    savedBattleWorkoutDraft,
    savedWorkoutDraft,
    sessionId,
  ])

  useEffect(() => {
    onStatusChange?.({
      active: activeWorkout,
      resumable: activeWorkout || Boolean(savedWorkoutDraft) || Boolean(savedBattleWorkoutDraft),
      seconds,
      restTimer: restTimer
        ? { ...restTimer, secondsLeft: getRemainingRestSeconds(restTimer) }
        : null,
    })
  }, [activeWorkout, onStatusChange, restTimer, savedBattleWorkoutDraft, savedWorkoutDraft, seconds])

  const formatTime = (s) => {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
    return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
  }

  const confirmCancel = async () => {
    const cancelledSessionId = sessionId
    if (sessionId) {
      await supabase.from('workout_sessions').delete().eq('id', sessionId)
    }
    if (battleModeActive && userId) {
      try {
        await publishBattleEvent('workout_cancelled', { sessionId: cancelledSessionId })
        const finished = await resolveCurrentBattleRoom()
        if (finished) onBattleRoomClosed?.('cancelled')
        else onBattleRoomClosed?.('left')
      } catch (err) {
        setBattleSyncError(err.message || 'Could not update your battle room.')
      }
    }
    setActiveWorkout(false)
    setWorkoutExercises([])
    setSessionId(null)
    setBattleStarting(false)
    battleStartedRoomRef.current = null
    completedBattleRoomRef.current = battleRoom?.id || null
    setBattleEvents([])
    setPrevSetsMap({})
    cancelRestNotification(); setRestTimer(null)
    setExerciseNotes({})
    setNotesOpen({})
    if (battleModeActive) clearBattleWorkoutDraft()
    else clearWorkoutDraft()
  }

  const restartWorkoutFromSavedDraft = async () => {
    if (!savedWorkoutDraft || !userId) return

    const { error } = await supabase
      .from('workout_sessions')
      .delete()
      .eq('id', savedWorkoutDraft.sessionId)
      .eq('user_id', userId)

    if (error) {
      setBattleSyncError(error.message || 'Could not start a fresh workout.')
      return
    }

    clearWorkoutDraft()
    await performStartWorkout()
  }

  const closeConfirm = () => {
    if (!confirmBusy) setConfirmAction(null)
  }

  const getFinishableSetMeta = useCallback((exercise, set, index) => {
    if (exercise.category === 'Cardio') {
      const duration = Number.parseInt(set.duration, 10)
      const valid = Number.isInteger(duration) && duration > 0
      return {
        exerciseId: exercise.id,
        setIndex: index,
        duration: valid ? duration : 0,
        shouldInclude: valid,
        incomplete: valid && !set.done,
      }
    }

    const weight = Number.parseFloat(set.weight)
    const reps = Number.parseInt(set.reps, 10)
    const validReps = Number.isInteger(reps) && reps > 0 && reps <= MAX_REPS
    const validWeight = isWeightWithinInputRange(weight, {
      equipment: exercise.equipment,
      unit: exercise.unit,
      bodyweightKg: userBodyweightKg,
    })

    return {
      exerciseId: exercise.id,
      setIndex: index,
      weight: Number.isFinite(weight) ? weight : 0,
      reps: Number.isInteger(reps) ? reps : 0,
      shouldInclude: validReps && validWeight,
      incomplete: validReps && validWeight && !set.done,
    }
  }, [userBodyweightKg])

  const hasIncompleteFinishableSets = useCallback(() => (
    workoutExercises.some(exercise => (
      exercise.sets.some((set, index) => getFinishableSetMeta(exercise, set, index).incomplete)
    ))
  ), [getFinishableSetMeta, workoutExercises])

  const buildWorkoutExercisesWithIncompleteSetsDone = useCallback((sourceExercises = workoutExercises) => (
    sourceExercises.map(exercise => ({
      ...exercise,
      sets: exercise.sets.map((set, index) => {
        const meta = getFinishableSetMeta(exercise, set, index)
        return meta.incomplete ? { ...set, done: true } : set
      }),
    }))
  ), [getFinishableSetMeta, workoutExercises])

  const promptFinishWorkout = useCallback(() => {
    setConfirmAction(hasIncompleteFinishableSets() ? 'incomplete' : 'finish')
  }, [hasIncompleteFinishableSets])

  const runConfirmedAction = async () => {
    if (!confirmAction || confirmBusy || isFinishingRef.current) return
    isFinishingRef.current = true
    setConfirmBusy(true)
    try {
      if (confirmAction === 'cancel') await confirmCancel()
      if (confirmAction === 'incomplete') {
        const completedExercises = buildWorkoutExercisesWithIncompleteSetsDone()
        setWorkoutExercises(completedExercises)
        await finishWorkout(completedExercises)
      }
      if (confirmAction === 'finish') await finishWorkout()
      if (confirmAction === 'restart') await restartWorkoutFromSavedDraft()
      setConfirmAction(null)
    } catch (err) {
      console.error('runConfirmedAction failed:', err)
    } finally {
      setConfirmBusy(false)
      isFinishingRef.current = false
    }
  }

  const finishWorkout = async (exercisesOverride = workoutExercises) => {
    const { data: { user } } = await supabase.auth.getUser()

    const setsToInsert = []
    exercisesOverride.forEach(ex => {
      ex.sets.forEach((s, i) => {
        const meta = getFinishableSetMeta(ex, s, i)
        if (!meta.shouldInclude) return
        if (ex.category === 'Cardio') {
          setsToInsert.push({
            user_id: user.id,
            session_id: sessionId,
            exercise_id: ex.id,
            set_number: i + 1,
            duration_seconds: meta.duration * 60,
          })
        } else {
          setsToInsert.push({
            user_id: user.id,
            session_id: sessionId,
            exercise_id: ex.id,
            set_number: i + 1,
            reps: meta.reps,
            weight: meta.weight,
            unit: ex.unit,
            equipment: ex.equipment,
            estimated_1rm: calculateORM(meta.weight, meta.reps),
          })
        }
      })
    })

    const exerciseIds = exercisesOverride.map(e => e.id)
    const [{ data: prevBests }, { data: prof }, { count: prevSessionCount }, rankStatesResult] = await Promise.all([
      supabase.from('exercise_prs').select('exercise_id, best_1rm_kg').eq('user_id', user.id).in('exercise_id', exerciseIds),
      supabase.from('profiles').select('gender, bodyweight, unit_preference, lifetime_volume_kg').eq('id', user.id).single(),
      supabase.from('workout_sessions').select('*', { count: 'exact', head: true }).eq('user_id', user.id).not('finished_at', 'is', null),
      fetchExerciseRankStates(user.id, exerciseIds),
    ])

    const prevOrmKg = {}
    for (const pr of prevBests || []) {
      if (pr.best_1rm_kg) prevOrmKg[pr.exercise_id] = pr.best_1rm_kg
    }

    const newOrmKg = { ...prevOrmKg }
    for (const s of setsToInsert) {
      if (s.estimated_1rm !== null && s.estimated_1rm !== undefined) {
        const kg = s.unit === 'lbs' ? s.estimated_1rm * 0.453592 : s.estimated_1rm
        newOrmKg[s.exercise_id] = Math.max(newOrmKg[s.exercise_id] || 0, kg)
      }
    }

    const sessionBestOrmKg = {}
    for (const s of setsToInsert) {
      if (s.estimated_1rm === null || s.estimated_1rm === undefined) continue
      const kg = s.unit === 'lbs' ? s.estimated_1rm * 0.453592 : s.estimated_1rm
      sessionBestOrmKg[s.exercise_id] = Math.max(sessionBestOrmKg[s.exercise_id] || 0, kg)
    }

    const bwKg = getProfileBodyweightKg(prof, DEFAULT_BODYWEIGHT_KG)
    const genderKey = prof?.gender?.toLowerCase() === 'female' ? 'female' : 'male'
    const rankUps = []
    for (const ex of exercisesOverride) {
      const anchors = ANCHORS[genderKey]?.[ex.name]
      if (!anchors) continue
      const thresholds = expandAnchors(anchors)
      const hadPrevOrm = Object.prototype.hasOwnProperty.call(prevOrmKg, ex.id)
      const hadNewOrm = Object.prototype.hasOwnProperty.call(newOrmKg, ex.id)
      if (!hadNewOrm) continue

      const prevOrm = hadPrevOrm ? prevOrmKg[ex.id] : null
      const newOrm = newOrmKg[ex.id]
      if (hadPrevOrm && newOrm <= prevOrm) continue

      const prevIdx = hadPrevOrm
        ? getTierIdx(getRankRatio(ex, prevOrm, bwKg), thresholds)
        : null
      const newIdx = getTierIdx(getRankRatio(ex, newOrm, bwKg), thresholds)

      if (!hadPrevOrm || newIdx > prevIdx) {
        rankUps.push({
          exercise: ex.name,
          from: hadPrevOrm ? TIERS[prevIdx] : 'Unranked',
          to: TIERS[newIdx],
          color: tierColor(TIERS[newIdx]),
        })
      }
    }

    const newAchievements = []
    const prevOrmByName = {}
    const newOrmByName = {}
    for (const ex of exercisesOverride) {
      const name = ex.name.toLowerCase()
      const prev = prevOrmKg[ex.id] || 0
      const next = newOrmKg[ex.id] || 0
      if (prev > 0) prevOrmByName[name] = Math.max(prevOrmByName[name] || 0, prev)
      if (next > 0) newOrmByName[name] = Math.max(newOrmByName[name] || 0, next)
    }

    const prevTotalVolumeKg = prof?.lifetime_volume_kg ?? 0
    const thisSessionVolumeKg = setsToInsert.reduce((sum, s) => {
      return sum + getSetVolumeKg({
        weight: s.weight,
        reps: s.reps,
        unit: s.unit,
        equipment: s.equipment,
        bodyweightKg: bwKg,
      })
    }, 0)
    const newTotalVolumeKg = prevTotalVolumeKg + thisSessionVolumeKg
    const prevSessionCount_ = prevSessionCount || 0
    const newSessionCount = prevSessionCount_ + 1

    for (const a of ACHIEVEMENTS) {
      if (a.match) {
        const prevBest = Object.entries(prevOrmByName).filter(([n]) => n.includes(a.match)).reduce((m, [, v]) => Math.max(m, v), 0)
        const newBest  = Object.entries(newOrmByName).filter(([n]) => n.includes(a.match)).reduce((m, [, v]) => Math.max(m, v), 0)
        if (prevBest < a.kgTarget && newBest >= a.kgTarget) newAchievements.push(a)
      } else if (a.sessions !== undefined) {
        if (prevSessionCount_ < a.sessions && newSessionCount >= a.sessions) newAchievements.push(a)
      } else if (a.totalVolumeKg !== undefined) {
        if (prevTotalVolumeKg < a.totalVolumeKg && newTotalVolumeKg >= a.totalVolumeKg) newAchievements.push(a)
      }
    }

    if (sessionId && setsToInsert.length > 0) {
      await supabase.from('workout_sets').insert(setsToInsert.map(set => ({
        user_id: set.user_id,
        session_id: set.session_id,
        exercise_id: set.exercise_id,
        set_number: set.set_number,
        reps: set.reps,
        weight: set.weight,
        unit: set.unit,
        estimated_1rm: set.estimated_1rm,
        duration_seconds: set.duration_seconds,
      })))
    }

    if (sessionId) {
      const seen = new Set()
      const prUpserts = exercisesOverride
        .filter(ex => {
          if (seen.has(ex.id) || newOrmKg[ex.id] === undefined) return false
          if (newOrmKg[ex.id] <= (prevOrmKg[ex.id] || 0)) return false
          seen.add(ex.id)
          return true
        })
        .map(ex => ({
          user_id: user.id,
          exercise_id: ex.id,
          best_1rm_kg: newOrmKg[ex.id],
          updated_at: new Date().toISOString(),
        }))

      const nowIso = new Date().toISOString()
      const rankStatesByExerciseId = mapExerciseRankStates(rankStatesResult.rows)
      const activeRankStateUpserts = exercisesOverride
        .map(ex => {
          const sessionOrmKg = sessionBestOrmKg[ex.id]
          if (!Number.isFinite(sessionOrmKg)) return null

          const anchors = ANCHORS[genderKey]?.[ex.name]
          if (!anchors) return null
          const thresholds = expandAnchors(anchors)

          const sessionScore = getContinuousExerciseScore(ex, sessionOrmKg, bwKg, thresholds)
          const previousState = rankStatesByExerciseId.get(ex.id) || null
          const previousStoredScore = Number.isFinite(previousState?.current_score)
            ? Number(previousState.current_score)
            : null

          const previousBestOrm = prevOrmKg[ex.id]
          const fallbackPriorScore = Number.isFinite(previousBestOrm)
            ? getContinuousExerciseScore(ex, previousBestOrm, bwKg, thresholds)
            : sessionScore
          const priorScore = previousStoredScore ?? fallbackPriorScore

          const nextScore = updateRollingScore({
            priorScore,
            priorLastRankedAt: previousState?.last_ranked_at ?? null,
            sessionScore,
            now: nowIso,
          })

          const previousPeakScore = Number.isFinite(previousState?.peak_score)
            ? Number(previousState.peak_score)
            : priorScore

          return {
            exerciseId: ex.id,
            currentScore: nextScore,
            peakScore: Math.max(previousPeakScore, nextScore),
            lastRankedAt: nowIso,
            updatedAt: nowIso,
          }
        })
        .filter(Boolean)

      const sessionOps = [
        supabase.from('workout_sessions').update({ finished_at: new Date().toISOString(), exercise_notes: exerciseNotes }).eq('id', sessionId),
        supabase.from('profiles').update({ lifetime_volume_kg: newTotalVolumeKg }).eq('id', user.id),
      ]
      if (prUpserts.length > 0) {
        sessionOps.push(supabase.from('exercise_prs').upsert(prUpserts, { onConflict: 'user_id,exercise_id' }))
      }
      if (activeRankStateUpserts.length > 0) {
        sessionOps.push(upsertExerciseRankStates(user.id, activeRankStateUpserts))
      }
      await Promise.all(sessionOps)
    }

    const now = new Date()
    const calKey = `cal_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    invalidateCache('home', 'ranks', 'profile', 'achievements', calKey)

    const unit = prof?.unit_preference || defaultUnit
    const totalVolume = Math.round(setsToInsert.reduce((sum, s) => (
      sum + getSetVolumeInUnit({
        weight: s.weight,
        reps: s.reps,
        unit: s.unit,
        equipment: s.equipment,
        bodyweightKg: bwKg,
      }, unit)
    ), 0))
    const totalVolumeKg = setsToInsert.reduce((sum, s) => {
      return sum + getSetVolumeKg({
        weight: s.weight,
        reps: s.reps,
        unit: s.unit,
        equipment: s.equipment,
        bodyweightKg: bwKg,
      })
    }, 0)
    const summary = {
      durationSeconds: seconds,
      totalSets: setsToInsert.length,
      totalVolume,
      unit,
      exercises: exercisesOverride
        .map(ex => {
          if (ex.category === 'Cardio') {
            const sets = ex.sets
              .map((set, index) => {
                const meta = getFinishableSetMeta(ex, set, index)
                return meta.shouldInclude ? { durationSeconds: meta.duration * 60 } : null
              })
              .filter(Boolean)
            return sets.length > 0 ? { name: ex.name, sets, isCardio: true } : null
          }
          return {
            name: ex.name,
            sets: ex.sets
              .map((set, index) => {
                const meta = getFinishableSetMeta(ex, set, index)
                return meta.shouldInclude ? { weight: meta.weight, reps: meta.reps, unit: ex.unit } : null
              })
              .filter(Boolean),
          }
        })
        .filter(ex => ex && ex.sets.length > 0),
      rankUps,
      newAchievements,
    }

    if (battleModeActive && user.id) {
      try {
        await publishBattleEvent('workout_finished', {
          durationSeconds: seconds,
          totalSets: setsToInsert.length,
          totalExercises: exercisesOverride.length,
          totalVolume,
          totalVolumeKg,
          unit,
        })
        summary.battle = await loadCurrentBattleRecap()
        const finished = await resolveCurrentBattleRoom()
        if (finished) {
          completedBattleRoomRef.current = null
          onBattleRoomClosed?.('finished')
        } else {
          completedBattleRoomRef.current = battleRoom.id
          onBattleRoomClosed?.('waiting')
        }
      } catch (err) {
        setBattleSyncError(err.message || 'Could not finish the battle room cleanly.')
        return
      }
    }

    setActiveWorkout(false)
    setWorkoutExercises([])
    setSessionId(null)
    setBattleStarting(false)
    battleStartedRoomRef.current = battleRoom?.id && completedBattleRoomRef.current === battleRoom.id
      ? battleRoom.id
      : null
    setPrevSetsMap({})
    cancelRestNotification(); setRestTimer(null)
    setExerciseNotes({})
    setNotesOpen({})
    if (battleModeActive) clearBattleWorkoutDraft()
    else clearWorkoutDraft()
    onFinish?.(summary)
  }

  const confirmDialog = confirmAction && typeof document !== 'undefined'
    ? createPortal(
        <div
          className="confirm-overlay"
          data-tab-swipe-ignore="true"
          role="presentation"
          onClick={closeConfirm}
          onTouchStart={e => e.stopPropagation()}
          onTouchEnd={e => e.stopPropagation()}
        >
          <div
            className="confirm-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="workout-confirm-title"
            onClick={e => e.stopPropagation()}
            onTouchStart={e => e.stopPropagation()}
            onTouchEnd={e => e.stopPropagation()}
          >
            <div id="workout-confirm-title" className="confirm-title">
              {confirmAction === 'finish'
                ? 'Finish Workout?'
                : confirmAction === 'restart'
                  ? 'Start Fresh Workout?'
                  : confirmAction === 'incomplete'
                    ? 'Incomplete Workout'
                    : 'Cancel Workout?'}
            </div>
            <div className="confirm-body">
              {confirmAction === 'finish'
                ? 'Your workout will be saved.'
                : confirmAction === 'incomplete'
                  ? 'You have incomplete sets with recorded repetitions. Would you like to mark all completed sets before finishing this workout?'
                : confirmAction === 'restart'
                  ? 'All progress in the current saved workout will be lost.'
                  : 'All progress will be lost.'}
            </div>
            <div className="confirm-actions">
              <button
                type="button"
                className="confirm-keep"
                onClick={closeConfirm}
                disabled={confirmBusy}
              >
                {confirmAction === 'incomplete' ? 'Back' : 'Keep Going'}
              </button>
              <button
                type="button"
                className={confirmAction === 'cancel' || confirmAction === 'restart' ? 'confirm-discard' : 'confirm-submit'}
                onClick={runConfirmedAction}
                disabled={confirmBusy}
              >
                {confirmBusy
                  ? 'Working...'
                  : confirmAction === 'finish'
                    ? 'Finish'
                    : confirmAction === 'restart'
                      ? 'Start Fresh'
                      : confirmAction === 'incomplete'
                        ? 'Check and Finish'
                        : 'Discard'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )
    : null

  // Routine builder functions
  const openRoutineBuilder = (routine = null) => {
    if (routine) {
      setRoutineName(routine.name)
      setRoutineDesc(routine.description || '')
      setRoutineExercises(routine.exercises || [])
      setEditingRoutineId(routine.id)
    } else {
      setRoutineName('')
      setRoutineDesc('')
      setRoutineExercises([])
      setEditingRoutineId(null)
    }
    setShowRoutineBuilder(true)
  }

  const closeRoutineBuilder = () => {
    setShowRoutineBuilder(false)
    setRoutineName('')
    setRoutineDesc('')
    setRoutineExercises([])
    setEditingRoutineId(null)
  }

  const saveRoutine = async () => {
    const payload = { name: routineName.trim(), description: routineDesc.trim(), exercises: routineExercises }
    if (editingRoutineId) {
      await supabase.from('user_routines').update(payload).eq('id', editingRoutineId)
    } else {
      await supabase.from('user_routines').insert({ ...payload, user_id: userId })
    }
    await loadUserRoutines(userId)
    closeRoutineBuilder()
  }

  const hideTemplate = (id) => {
    const updated = [...hiddenTemplates, id]
    setHiddenTemplates(updated)
    localStorage.setItem('hiddenTemplates', JSON.stringify(updated))
  }

  const deleteRoutine = async (id) => {
    await supabase.from('user_routines').delete().eq('id', id)
    setUserRoutines(prev => prev.filter(r => r.id !== id))
  }

  const toggleSelect = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }

  const fmtRest = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  const handleAddExercises = () => {
    if (pickerContext === 'routine') {
      const toAdd = exerciseLibrary
        .filter(e => selected.includes(e.id))
        .filter(e => !routineExercises.find(r => r.name === e.name))
        .map(e => ({ name: e.name, sets: 3 }))
      setRoutineExercises(prev => [...prev, ...toAdd])
      closePicker()
      return
    }
    const toAdd = exerciseLibrary
      .filter(e => selected.includes(e.id))
      .filter(e => !workoutExercises.find(p => p.id === e.id))
      .map(e => ({ ...e, sets: [e.category === 'Cardio' ? defaultCardioSet() : defaultSet()], unit: defaultUnit, restSeconds: e.default_rest_seconds ?? defaultRest }))
    setWorkoutExercises(prev => [...prev, ...toAdd])
    closePicker()
    loadPrevSets(toAdd.map(e => e.id), userId, sessionId)
    if (battleModeActive && userId && toAdd.length > 0) {
      publishBattleEvent('exercise_added', {
        exerciseIds: toAdd.map(ex => ex.id),
        exerciseNames: toAdd.map(ex => ex.name),
        exerciseCategories: toAdd.map(ex => ex.category),
      }).catch(err => {
        setBattleSyncError(err.message || 'Could not sync your added exercises.')
      })
    }
  }

  const closePicker = () => {
    setPickerExiting(true)
    setTimeout(() => {
      setShowExercises(false)
      setPickerExiting(false)
      setSelected([])
      setSearchQuery('')
    }, 280)
  }

  const startFromTemplate = async (template) => {
    const { data: { user } } = await supabase.auth.getUser()
    const [{ data, error }, { data: prof }] = await Promise.all([
      supabase.from('workout_sessions').insert({ user_id: user.id }).select().single(),
      supabase.from('profiles').select('unit_preference').eq('id', user.id).single(),
    ])
    if (!error) setSessionId(data.id)
    const unit = prof?.unit_preference || 'kg'
    workoutStartRef.current = Date.now()
    setDefaultUnit(unit)

    const exercises = template.exercises
      .map(t => {
        const normalizedTemplateName = normalizeSearchValue(t.name)
        const found = exerciseLibrary.find(e => normalizeSearchValue(e.name) === normalizedTemplateName)
          || exerciseLibrary.find(e => matchesSearchQuery(t.name, e.name, e.category, e.equipment, (e.primary_muscles || []).join(' '), (e.secondary_muscles || []).join(' ')))
        if (!found) return null
        return {
          ...found,
          unit,
          restSeconds: found.default_rest_seconds ?? defaultRest,
          sets: Array.from({ length: t.sets }, () => ({ reps: '', weight: '', done: false })),
        }
      })
      .filter(Boolean)

    writeStoredWorkoutDraft(user.id, {
      version: WORKOUT_DRAFT_VERSION,
      savedAt: Date.now(),
      sessionId: data?.id || null,
      startedAt: workoutStartRef.current,
      workoutExercises: exercises,
      exerciseNotes: {},
      notesOpen: {},
      restTimer: null,
      defaultUnit: unit,
      defaultRest,
    }, battleModeActive ? battleRoom?.id : null)

    setWorkoutExercises(exercises)
    setActiveWorkout(true)
    loadPrevSets(exercises.map(e => e.id), user.id, data?.id || null)
  }

  const resumeSavedWorkout = async () => {
    if (!savedWorkoutDraft || !userId || savedWorkoutDraftBusy) return

    setSavedWorkoutDraftBusy(true)
    try {
      const { data: sessionRow, error } = await supabase
        .from('workout_sessions')
        .select('id')
        .eq('id', savedWorkoutDraft.sessionId)
        .eq('user_id', userId)
        .is('finished_at', null)
        .maybeSingle()

      if (error || !sessionRow) {
        clearWorkoutDraft()
        setBattleSyncError('Your saved workout could not be resumed.')
        return
      }

      const restoredStartedAt = savedWorkoutDraft.startedAt || Date.now()
      const restoredExercises = Array.isArray(savedWorkoutDraft.workoutExercises)
        ? savedWorkoutDraft.workoutExercises
        : []
      const restoredRestTimer = savedWorkoutDraft.restTimer && getRemainingRestSeconds(savedWorkoutDraft.restTimer) > 0
        ? savedWorkoutDraft.restTimer
        : null

      workoutStartRef.current = restoredStartedAt
      setSessionId(savedWorkoutDraft.sessionId)
      setDefaultUnit(savedWorkoutDraft.defaultUnit || defaultUnit)
      setDefaultRest(savedWorkoutDraft.defaultRest ?? defaultRest)
      setWorkoutExercises(restoredExercises)
      setExerciseNotes(savedWorkoutDraft.exerciseNotes || {})
      setNotesOpen(savedWorkoutDraft.notesOpen || {})
      setRestTimer(restoredRestTimer)
      setSeconds(Math.max(0, Math.floor((Date.now() - restoredStartedAt) / 1000)))
      setActiveWorkout(true)
      setSavedWorkoutDraft(null)

      if (restoredRestTimer) {
        scheduleRestEndNotification(getRemainingRestSeconds(restoredRestTimer), restoredRestTimer.exerciseName)
      }

      if (restoredExercises.length > 0) {
        loadPrevSets(restoredExercises.map(exercise => exercise.id), userId, savedWorkoutDraft.sessionId)
      }
    } finally {
      setSavedWorkoutDraftBusy(false)
    }
  }

  const discardSavedWorkout = async () => {
    if (!savedWorkoutDraft || !userId || savedWorkoutDraftBusy) return

    setSavedWorkoutDraftBusy(true)
    try {
      const { error } = await supabase
        .from('workout_sessions')
        .delete()
        .eq('id', savedWorkoutDraft.sessionId)
        .eq('user_id', userId)

      if (error) {
        setBattleSyncError(error.message || 'Could not discard your saved workout.')
        return
      }

      clearWorkoutDraft()
    } finally {
      setSavedWorkoutDraftBusy(false)
    }
  }

  function formatDraftSavedAt(timestamp) {
    if (!timestamp) return 'Saved recently'
    const diffMs = Date.now() - timestamp
    const diffMinutes = Math.max(0, Math.round(diffMs / 60000))

    if (diffMinutes < 1) return 'Saved just now'
    if (diffMinutes === 1) return 'Saved 1 minute ago'
    if (diffMinutes < 60) return `Saved ${diffMinutes} minutes ago`

    const diffHours = Math.round(diffMinutes / 60)
    if (diffHours === 1) return 'Saved 1 hour ago'
    if (diffHours < 24) return `Saved ${diffHours} hours ago`

    return `Saved on ${new Date(timestamp).toLocaleDateString()}`
  }

  const filteredLibrary = useMemo(() => {
    if (!searchQuery.trim()) return exerciseLibrary

    return exerciseLibrary
      .filter(e =>
        matchesSearchQuery(
          searchQuery,
          e.name,
          e.category,
          e.equipment,
          (e.primary_muscles || []).join(' '),
          (e.secondary_muscles || []).join(' ')
        )
      )
      .sort((a, b) => {
        const diff = scoreExerciseMatch(searchQuery, b) - scoreExerciseMatch(searchQuery, a)
        return diff !== 0 ? diff : a.name.length - b.name.length
      })
  }, [exerciseLibrary, searchQuery])

  const addSet = (exId) => {
    setWorkoutExercises(prev => prev.map(ex => {
      if (ex.id !== exId) return ex
      const last = ex.sets[ex.sets.length - 1]
      return { ...ex, sets: [...ex.sets, { ...last, done: false }] }
    }))
  }

  const removeSet = (exId) => {
    const ex = workoutExercises.find(item => item.id === exId)
    if (!ex || ex.sets.length === 1) return

    const removedSetNumber = ex.sets.length
    setWorkoutExercises(prev => prev.map(item => {
      if (item.id !== exId || item.sets.length === 1) return item
      return { ...item, sets: item.sets.slice(0, -1) }
    }))

    if (battleModeActive && userId) {
      publishBattleEvent('set_removed', {
        exerciseId: ex.id,
        exerciseName: ex.name,
        category: ex.category,
        equipment: ex.equipment,
        setNumber: removedSetNumber,
        unit: ex.unit,
      }).catch(err => {
        setBattleSyncError(err.message || 'Could not sync your removed set.')
      })
    }
  }

  const updateSet = (exId, setIdx, field, value) => {
    let nextValue = value

    if (field === 'reps') {
      if (value === '') {
        nextValue = ''
      } else {
        const parsed = Number.parseInt(value, 10)
        if (Number.isNaN(parsed)) return
        nextValue = String(Math.max(0, Math.min(MAX_REPS, parsed)))
      }
    }

    setWorkoutExercises(prev => prev.map(ex => {
      if (ex.id !== exId) return ex
      const sets = ex.sets.map((s, i) => i === setIdx ? { ...s, [field]: nextValue } : s)
      return { ...ex, sets }
    }))
    if (field === 'done' && value === true) {
      const ex = workoutExercises.find(e => e.id === exId)
      if (ex) {
        const completedSet = ex.sets[setIdx]
        const weight = Number.parseFloat(completedSet.weight)
        const reps = Number.parseInt(completedSet.reps, 10)
        if (
          !isWeightWithinInputRange(weight, {
            equipment: ex.equipment,
            unit: ex.unit,
            bodyweightKg: userBodyweightKg,
          })
          || !isRepsWithinInputRange(reps)
        ) {
          return
        }
        setRestTimer(createRestTimer(ex.restSeconds, ex.name))
        scheduleRestEndNotification(ex.restSeconds, ex.name)
        if (battleModeActive && userId) {
          publishBattleEvent('set_completed', {
            exerciseId: ex.id,
            exerciseName: ex.name,
            category: ex.category,
            equipment: ex.equipment,
            setNumber: setIdx + 1,
            weight,
            reps,
            unit: ex.unit,
          }).catch(err => {
            setBattleSyncError(err.message || 'Could not sync your completed set.')
          })
        }
      }
    }
  }

  const removeExercise = (exId) => {
    setWorkoutExercises(prev => prev.filter(ex => ex.id !== exId))
  }

  function toggleBattleFeed() {
    setBattleFeedHidden(prev => {
      const next = !prev
      try { localStorage.setItem('battleFeedHidden', next ? '1' : '0') } catch { /* ignore storage errors */ }
      return next
    })
  }

  const customExerciseCategoryOptions = useMemo(() => {
    const categories = new Set(exerciseLibrary.map(exercise => exercise.category).filter(Boolean))
    categories.add('Custom')
    return [...categories].sort((a, b) => a.localeCompare(b))
  }, [exerciseLibrary])

  function resetCustomExerciseForm() {
    const firstCategory = customExerciseCategoryOptions[0] || 'Custom'
    setCustomExerciseForm({
      name: '',
      category: firstCategory,
      equipment: 'Bodyweight',
      primary_muscles: [],
      secondary_muscles: [],
      default_rest_seconds: defaultRest,
    })
    setCustomExerciseError('')
  }

  function toggleMuscleSelection(field, muscle) {
    setCustomExerciseForm(prev => {
      const current = prev[field]
      const exists = current.includes(muscle)
      const next = exists
        ? current.filter(item => item !== muscle)
        : [...current, muscle]

      let siblingField = field === 'primary_muscles' ? 'secondary_muscles' : 'primary_muscles'
      let sibling = prev[siblingField]
      if (!exists && sibling.includes(muscle)) {
        sibling = sibling.filter(item => item !== muscle)
      }

      return {
        ...prev,
        [field]: next,
        [siblingField]: sibling,
      }
    })
  }

  async function handleSaveCustomExercise() {
    if (!userId) return

    const name = customExerciseForm.name.trim()
    const category = customExerciseForm.category.trim()
    if (!name || !category) {
      setCustomExerciseError('Name and category are required.')
      return
    }
    if (customExerciseForm.primary_muscles.length === 0) {
      setCustomExerciseError('Pick at least one primary muscle.')
      return
    }

    setSavingCustomExercise(true)
    setCustomExerciseError('')
    try {
      const created = await createCustomExercise(userId, {
        name,
        category,
        equipment: customExerciseForm.equipment,
        primary_muscles: customExerciseForm.primary_muscles,
        secondary_muscles: customExerciseForm.secondary_muscles,
        default_rest_seconds: Number(customExerciseForm.default_rest_seconds) || defaultRest,
      })

      setExerciseLibrary(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))

      if (pickerContext === 'routine') {
        setRoutineExercises(prev => [...prev, { name: created.name, sets: 3 }])
      } else {
        const customExercise = {
          ...created,
          sets: [created.category === 'Cardio' ? defaultCardioSet() : defaultSet()],
          unit: defaultUnit,
          restSeconds: created.default_rest_seconds ?? defaultRest,
        }
        setWorkoutExercises(prev => [...prev, customExercise])
        loadPrevSets([created.id], userId, sessionId)
      }

      resetCustomExerciseForm()
      setShowCustomExerciseForm(false)
      closePicker()
      setSearchQuery('')
    } catch (err) {
      const message = err.code === '23505'
        ? 'You already have an exercise with that name.'
        : (err.message || 'Could not save your custom exercise.')
      setCustomExerciseError(message)
    } finally {
      setSavingCustomExercise(false)
    }
  }

  const handleTouchStart = (exId, idx, e) => {
    cancelAnimationFrame(swipeRafRef.current)
    swipeRef.current = { exId, idx, startX: e.touches[0].clientX, dx: 0 }
    setSwipeState({ exId, idx, dx: 0 })
  }

  const handleTouchMove = (exId, idx, e) => {
    const ref = swipeRef.current
    if (!ref || ref.exId !== exId || ref.idx !== idx) return
    ref.dx = Math.min(0, e.touches[0].clientX - ref.startX)
    cancelAnimationFrame(swipeRafRef.current)
    swipeRafRef.current = requestAnimationFrame(() => {
      if (swipeRef.current?.exId === exId && swipeRef.current?.idx === idx) {
        setSwipeState({ exId, idx, dx: swipeRef.current.dx })
      }
    })
  }

  const handleTouchEnd = (exId, idx) => {
    cancelAnimationFrame(swipeRafRef.current)
    const dx = swipeRef.current?.dx || 0
    swipeRef.current = null
    setSwipeState(null)
    const threshold = -(window.innerWidth * 0.70)
    if (dx < threshold) {
      const ex = workoutExercises.find(item => item.id === exId)
      setWorkoutExercises(exs => exs.map(ex => {
        if (ex.id !== exId || ex.sets.length === 1) return ex
        return { ...ex, sets: ex.sets.filter((_, j) => j !== idx) }
      }))
      if (battleModeActive && userId && ex && ex.sets.length > 1) {
        publishBattleEvent('set_removed', {
          exerciseId: ex.id,
          exerciseName: ex.name,
          category: ex.category,
          equipment: ex.equipment,
          setNumber: idx + 1,
          unit: ex.unit,
        }).catch(err => {
          setBattleSyncError(err.message || 'Could not sync your removed set.')
        })
      }
    }
  }

  const handleTemplateTouchStart = (id, e) => {
    templateSwipeRef.current = { id, startX: e.touches[0].clientX, dx: 0 }
    setTemplateSwipeState({ id, dx: 0 })
  }

  const handleTemplateTouchMove = (id, e) => {
    const ref = templateSwipeRef.current
    if (!ref || ref.id !== id) return
    const dx = Math.min(0, e.touches[0].clientX - ref.startX)
    ref.dx = dx
    setTemplateSwipeState({ id, dx })
  }

  const handleTemplateTouchEnd = (id, onDelete) => {
    const dx = templateSwipeRef.current?.dx || 0
    templateSwipeRef.current = null
    setTemplateSwipeState(null)
    const threshold = -(window.innerWidth * 0.8)
    if (dx < threshold) onDelete()
  }

  const updateRestTime = async (exId, seconds) => {
    setWorkoutExercises(prev => prev.map(e => e.id === exId ? { ...e, restSeconds: seconds } : e))
    setExerciseLibrary(prev => prev.map(e => e.id === exId ? { ...e, default_rest_seconds: seconds } : e))
    setEditingRest(null)
    await supabase.from('user_exercise_preferences')
      .upsert({ user_id: userId, exercise_id: exId, rest_seconds: seconds }, { onConflict: 'user_id,exercise_id' })
  }

  if (detailExerciseId) {
    return (
      <Suspense fallback={<LoadingSpinner fullPage />}>
        <ExerciseDetail exerciseId={detailExerciseId} onBack={() => setDetailExerciseId(null)} />
      </Suspense>
    )
  }

  const remoteWorkouts = buildRemoteWorkouts(
    battleEvents,
    exerciseLibrary,
    battleRoom?.opponentProfile
      ? [{ user_id: battleRoom.opponentId, profile: battleRoom.opponentProfile }]
      : []
  )

  if (showCustomExerciseForm) {
    return (
      <div className="picker-page">
        <div className="picker-sticky-top">
          <div className="picker-header">
            <button className="back-btn" onClick={() => { setShowCustomExerciseForm(false); setCustomExerciseError('') }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 5l-7 7 7 7"/>
              </svg>
            </button>
            <h2 className="picker-title">Custom Exercise</h2>
            <button className="add-selected-btn" onClick={handleSaveCustomExercise} disabled={savingCustomExercise}>
              {savingCustomExercise ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
        <div className="picker-list custom-exercise-form">
          <input
            className="picker-search"
            type="text"
            placeholder="Exercise name"
            value={customExerciseForm.name}
            onChange={e => setCustomExerciseForm(prev => ({ ...prev, name: e.target.value }))}
            autoFocus
          />
          <label className="custom-field">
            <span>Category</span>
            <select
              className="custom-select"
              value={customExerciseForm.category}
              onChange={e => setCustomExerciseForm(prev => ({ ...prev, category: e.target.value }))}
            >
              {customExerciseCategoryOptions.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>
          <div className="custom-form-grid">
            <label className="custom-field">
              <span>Equipment</span>
              <select
                className="custom-select"
                value={customExerciseForm.equipment}
                onChange={e => setCustomExerciseForm(prev => ({ ...prev, equipment: e.target.value }))}
              >
                {CUSTOM_EQUIPMENT_OPTIONS.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
            <label className="custom-field">
              <span>Default Rest (sec)</span>
              <input
                className="picker-search custom-number"
                type="number"
                min="0"
                value={customExerciseForm.default_rest_seconds}
                onChange={e => setCustomExerciseForm(prev => ({ ...prev, default_rest_seconds: e.target.value }))}
              />
            </label>
          </div>
          <div className="custom-muscle-group">
            <div className="custom-muscle-title">Primary Muscles</div>
            <div className="custom-muscle-chips">
              {SUPPORTED_MUSCLES.map(muscle => (
                <button
                  key={`primary-${muscle}`}
                  type="button"
                  className={`custom-muscle-chip ${customExerciseForm.primary_muscles.includes(muscle) ? 'active' : ''}`}
                  onClick={() => toggleMuscleSelection('primary_muscles', muscle)}
                >
                  {muscle}
                </button>
              ))}
            </div>
          </div>
          <div className="custom-muscle-group">
            <div className="custom-muscle-title">Secondary Muscles</div>
            <div className="custom-muscle-chips">
              {SUPPORTED_MUSCLES.map(muscle => (
                <button
                  key={`secondary-${muscle}`}
                  type="button"
                  className={`custom-muscle-chip secondary ${customExerciseForm.secondary_muscles.includes(muscle) ? 'active' : ''}`}
                  onClick={() => toggleMuscleSelection('secondary_muscles', muscle)}
                >
                  {muscle}
                </button>
              ))}
            </div>
          </div>
          {customExerciseError && <div className="battle-panel-error">{customExerciseError}</div>}
        </div>
      </div>
    )
  }

  // Exercise picker
  if (showExercises) {
    return (
      <div className={`picker-page picker-page-exercises${pickerExiting ? ' picker-page-exit' : ''}`}>
        <div className="picker-sticky-top">
          <div className="picker-header">
            <button className="back-btn" onClick={closePicker}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 5l-7 7 7 7"/>
              </svg>
            </button>
            <h2 className="picker-title">Select Exercises</h2>
            <button
              className="add-selected-btn"
              onClick={handleAddExercises}
              disabled={selected.length === 0}
              style={{ opacity: selected.length === 0 ? 0 : 1, pointerEvents: selected.length === 0 ? 'none' : 'auto' }}
            >
              Add ({selected.length})
            </button>
            <button
              className="battle-panel-toggle"
              onClick={() => { resetCustomExerciseForm(); setShowCustomExerciseForm(true) }}
            >
              Custom
            </button>
          </div>
          <input
            className="picker-search"
            type="text"
            placeholder="Search exercises..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="exercise-list picker-list">
          {loading
            ? <LoadingSpinner fullPage />
            : filteredLibrary.length === 0
              ? <div style={{ color: 'var(--muted)', textAlign: 'center', padding: '40px 0' }}>No exercises found</div>
              : filteredLibrary.map((ex, index) => (
                <div
                  key={ex.id}
                  className={`exercise-item ${selected.includes(ex.id) ? 'selected' : ''}`}
                  style={{ '--exercise-enter-delay': `${Math.min(index, 10) * 42}ms` }}
                  onClick={() => toggleSelect(ex.id)}
                >
                  <div className="exercise-item-left">
                    <div className={`exercise-checkbox ${selected.includes(ex.id) ? 'checked' : ''}`}>
                      {selected.includes(ex.id) && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      )}
                    </div>
                    <div>
                      <div className="exercise-name">{ex.name}</div>
                      <div className="exercise-category">{ex.category} · {ex.equipment}</div>
                    </div>
                  </div>
                  <button className="info-btn" onClick={e => { e.stopPropagation(); setDetailExerciseId(ex.id) }}>i</button>
                </div>
              ))
          }
        </div>
      </div>
    )
  }

  // Routine builder
  if (showRoutineBuilder) {
    return (
      <div className="picker-page">
        <div className="picker-sticky-top">
          <div className="picker-header">
            <button className="back-btn" onClick={closeRoutineBuilder}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 5l-7 7 7 7"/>
              </svg>
            </button>
            <h2 className="picker-title">{editingRoutineId ? 'Edit Routine' : 'Create Routine'}</h2>
            <button
              className="add-selected-btn"
              onClick={saveRoutine}
              disabled={!routineName.trim() || routineExercises.length === 0}
              style={{ opacity: !routineName.trim() || routineExercises.length === 0 ? 0.4 : 1 }}
            >
              Save
            </button>
          </div>
          <input
            className="picker-search"
            type="text"
            placeholder="Routine name..."
            value={routineName}
            onChange={e => setRoutineName(e.target.value)}
            autoFocus
          />
          <input
            className="picker-search"
            style={{ marginTop: 8 }}
            type="text"
            placeholder="Description (optional)..."
            value={routineDesc}
            onChange={e => setRoutineDesc(e.target.value)}
          />
        </div>
        <div className="picker-list">
          {routineExercises.length === 0 ? (
            <div style={{ color: 'var(--muted)', textAlign: 'center', padding: '32px 0', fontSize: 14 }}>
              No exercises added yet
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={({ active, over }) => {
                if (!over || active.id === over.id) return
                setRoutineExercises(prev => {
                  const oldIdx = prev.findIndex(e => e.name === active.id)
                  const newIdx = prev.findIndex(e => e.name === over.id)
                  return arrayMove(prev, oldIdx, newIdx)
                })
              }}
            >
              <SortableContext items={routineExercises.map(e => e.name)} strategy={verticalListSortingStrategy}>
                <div className="routine-exercise-list">
                  {routineExercises.map((ex, i) => (
                    <SortableRoutineRow key={ex.name} name={ex.name}>
                      {({ listeners, attributes }) => (
                        <div className="routine-exercise-row">
                          <button className="routine-drag-handle" {...listeners} {...attributes}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="18" x2="16" y2="18"/>
                            </svg>
                          </button>
                          <div className="routine-exercise-name">{ex.name}</div>
                          <div className="set-controls">
                            <button className="set-ctrl-btn" onClick={() => setRoutineExercises(prev => prev.map((e, j) => j === i ? { ...e, sets: Math.max(1, e.sets - 1) } : e))}>−</button>
                            <span className="set-count">{ex.sets} sets</span>
                            <button className="set-ctrl-btn add" onClick={() => setRoutineExercises(prev => prev.map((e, j) => j === i ? { ...e, sets: e.sets + 1 } : e))}>+</button>
                          </div>
                          <button className="routine-remove-btn" onClick={() => setRoutineExercises(prev => prev.filter((_, j) => j !== i))}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                          </button>
                        </div>
                      )}
                    </SortableRoutineRow>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
          <button className="empty-workout-btn" style={{ marginTop: 12 }} onClick={() => { setPickerContext('routine'); setShowExercises(true) }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add Exercise
          </button>
        </div>
      </div>
    )
  }

  // Active workout
  if (activeWorkout) {
    return (
      <>
      <div className="workout-screen" style={restTimer ? { paddingBottom: 190 } : {}}>
        <div className="timer-bar">
          <div className="timer-label">Workout in progress</div>
          <div className="timer-clock">{formatTime(seconds)}</div>
        </div>

        {battleModeActive && (
          <div className="battle-panel">
            <div className="battle-panel-head">
              <div>
                <div className="battle-panel-eyebrow">Battle Mode</div>
                <div className="battle-panel-title">
                  {`Training with ${battleRoom.opponentProfile?.full_name || battleRoom.opponentProfile?.username || 'friend'}`}
                </div>
              </div>
              <div className="battle-panel-head-actions">
                <button className="battle-panel-toggle" onClick={toggleBattleFeed}>
                  {battleFeedHidden ? 'Show feed' : 'Hide feed'}
                </button>
                <div className="battle-panel-status">Live</div>
              </div>
            </div>
            {!battleFeedHidden && (
              <div className="battle-panel-card">
                <div className="battle-opponent-card-head">
                  <div>
                    <div className="battle-panel-card-label">
                      Opponent Workout
                    </div>
                    <div className="battle-panel-card-body">
                      {`${battleRoom.opponentProfile?.full_name || battleRoom.opponentProfile?.username || 'Your opponent'}'s logged exercises and completed sets.`}
                    </div>
                  </div>
                  <div className="battle-readonly-badge">
                    Their sets
                  </div>
                </div>
                {remoteWorkouts.length === 0 ? (
                  <div className="battle-feed-empty">
                    Your friend has not logged anything yet.
                  </div>
                ) : (
                  <div className="battle-opponent-workout">
                    {remoteWorkouts.map(workout => (
                      <div key={workout.userId} className="battle-remote-card">
                        <div className="battle-remote-card-header">
                          <div>
                            <div className="battle-readonly-label-row">
                              <span className="battle-readonly-pill">{workout.name}</span>
                              {workout.status !== 'live' && (
                                <span className={`battle-readonly-subtle battle-remote-status-${workout.status}`}>
                                  {workout.status === 'finished' ? 'Finished' : 'Left'}
                                </span>
                              )}
                            </div>
                            <div className="battle-panel-card-body">
                              {workout.exercises.length === 0
                                ? 'No logged exercises yet.'
                                : `${workout.exercises.length} exercise${workout.exercises.length === 1 ? '' : 's'} in progress`}
                            </div>
                          </div>
                        </div>
                        {workout.exercises.length === 0 ? (
                          <div className="battle-readonly-empty">Waiting for the first exercise.</div>
                        ) : workout.exercises.map(ex => (
                          <div key={`${workout.userId}-${ex.key}`} className="exercise-block battle-readonly-exercise">
                            <div className="exercise-block-header">
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div className="exercise-block-name">{ex.name}</div>
                                <div className="exercise-category">{ex.category}</div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div className="unit-toggle battle-readonly-unit-toggle">
                                  <button className={`unit-btn ${ex.unit === 'kg' ? 'active' : ''}`} type="button" tabIndex={-1}>kg</button>
                                  <button className={`unit-btn ${ex.unit === 'lbs' ? 'active' : ''}`} type="button" tabIndex={-1}>lbs</button>
                                </div>
                                <div className="set-count battle-readonly-set-count">
                                  {ex.sets.length} sets
                                </div>
                              </div>
                            </div>
                            <div className="set-row header-row">
                              <span className="col-set">Set</span>
                              <span className="col-prev">Previous</span>
                              <span className="col-kg">{ex.unit}</span>
                              <span className="col-reps">Reps</span>
                              <span className="col-done"></span>
                            </div>
                            {ex.sets.length === 0 ? (
                              <div className="battle-readonly-empty">Exercise added. Waiting for the first logged set.</div>
                            ) : ex.sets.map((set, index) => (
                              <div key={`${workout.userId}-${ex.key}-${index}`} className="set-row-wrapper">
                                <div className="set-row done battle-readonly-row">
                                  <span className="col-set">{index + 1}</span>
                                  <span className="col-prev">—</span>
                                  <div className="col-kg set-input battle-readonly-input">{set.weight || 0}</div>
                                  <div className="col-reps set-input battle-readonly-input">{set.reps || 0}</div>
                                  <div className="col-done done-btn checked battle-readonly-done">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                      <polyline points="20 6 9 17 4 12"/>
                                    </svg>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
                {battleSyncError && <div className="battle-panel-error">{battleSyncError}</div>}
              </div>
            )}
          </div>
        )}

        {battleNotice && <div className="battle-room-notice">{battleNotice}</div>}

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
          onDragEnd={({ active, over }) => {
            if (!over || active.id === over.id) return
            setWorkoutExercises(prev => {
              const oldIdx = prev.findIndex(exercise => exercise.id === active.id)
              const newIdx = prev.findIndex(exercise => exercise.id === over.id)
              if (oldIdx === -1 || newIdx === -1 || oldIdx === newIdx) return prev
              return arrayMove(prev, oldIdx, newIdx)
            })
          }}
        >
          <SortableContext items={workoutExercises.map(e => e.id)} strategy={verticalListSortingStrategy}>
            {workoutExercises.map(ex => (
              <SortableExerciseBlock key={ex.id} id={ex.id}>
                {({ listeners, attributes }) => (
          <div className="exercise-block" data-tab-swipe-ignore="true">
            <button className="remove-exercise-btn" onClick={() => removeExercise(ex.id)}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                <path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
              </svg>
            </button>
            <div className="exercise-block-header">
              <button className="drag-handle" {...listeners} {...attributes}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="18" x2="16" y2="18"/>
                </svg>
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="exercise-block-name">{ex.name}</div>
                <div className="exercise-category">{ex.category}{(ex.equipment === 'Dumbbell' || ex.name === 'Cable Lateral Raise') && <span className="db-per-hint-inline"> · log 1 side</span>}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {ex.category !== 'Cardio' && (
                  <div className="unit-toggle">
                    <button className={`unit-btn ${ex.unit === 'kg' ? 'active' : ''}`} onClick={() => {
                      if (ex.unit === 'kg') return
                      setWorkoutExercises(prev => prev.map(e => e.id === ex.id
                        ? { ...e, unit: 'kg', sets: e.sets.map(s => ({ ...s, weight: Math.round(s.weight * 0.453592 * 10) / 10 })) }
                        : e))
                    }}>kg</button>
                    <button className={`unit-btn ${ex.unit === 'lbs' ? 'active' : ''}`} onClick={() => {
                      if (ex.unit === 'lbs') return
                      setWorkoutExercises(prev => prev.map(e => e.id === ex.id
                        ? { ...e, unit: 'lbs', sets: e.sets.map(s => ({ ...s, weight: Math.round(s.weight * 2.20462 * 10) / 10 })) }
                        : e))
                    }}>lbs</button>
                  </div>
                )}
                <div className="set-controls">
                  <button className="set-ctrl-btn" onClick={() => removeSet(ex.id)}>−</button>
                  <span className="set-count">{ex.sets.length} sets</span>
                  <button className="set-ctrl-btn add" onClick={() => addSet(ex.id)}>+</button>
                </div>
              </div>
            </div>

            <div className="rest-time-row">
              <span className="rest-time-label">Rest</span>
              <button className="rest-time-btn" onClick={() => setEditingRest(editingRest === ex.id ? null : ex.id)}>
                {fmtRest(ex.restSeconds)}
              </button>
              {editingRest === ex.id && (
                <button className="rest-done-btn" onClick={() => updateRestTime(ex.id, ex.restSeconds)}>Done</button>
              )}
            </div>

            {editingRest === ex.id && (
              <div className="rest-wheel-panel">
                <RestWheelPicker
                  value={ex.restSeconds}
                  onChange={s => setWorkoutExercises(prev => prev.map(e => e.id === ex.id ? { ...e, restSeconds: s } : e))}
                />
              </div>
            )}

            <button
              className={`exercise-notes-toggle ${notesOpen[ex.id] ? 'open' : ''}`}
              onClick={() => setNotesOpen(prev => ({ ...prev, [ex.id]: !prev[ex.id] }))}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
              </svg>
              Notes
              {exerciseNotes[ex.id] && <span className="notes-dot" />}
            </button>
            {notesOpen[ex.id] && (
              <textarea
                className="exercise-notes-input"
                placeholder="Add notes for this exercise..."
                value={exerciseNotes[ex.id] || ''}
                onChange={e => setExerciseNotes(prev => ({ ...prev, [ex.id]: e.target.value }))}
                rows={3}
              />
            )}

            {ex.category === 'Cardio' ? (
              <div className="set-row cardio-row header-row">
                <span className="col-set">Set</span>
                <span className="col-prev">Previous</span>
                <span className="col-kg">Min</span>
                <span className="col-done"></span>
              </div>
            ) : (
              <div className="set-row header-row">
                <span className="col-set">Set</span>
                <span className="col-prev">Previous</span>
                <span className="col-kg">{ex.unit}{(ex.equipment === 'Dumbbell' || ex.name === 'Cable Lateral Raise') && <span className="db-per-hint">per side</span>}</span>
                <span className="col-reps">Reps</span>
                <span className="col-done"></span>
              </div>
            )}

            {ex.sets.map((s, i) => {
              const isActive = swipeState?.exId === ex.id && swipeState?.idx === i
              const dx = isActive ? swipeState.dx : 0
              const revealing = dx < -20
              const deleteBg = revealing && (
                <div className="set-row-delete-bg" style={{ width: Math.abs(dx) }}>
                  <svg style={{ width: Math.min(20, Math.abs(dx) * 0.25), height: Math.min(20, Math.abs(dx) * 0.25) }} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                    <path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                  </svg>
                </div>
              )
              const swipeProps = {
                onTouchStart: e => handleTouchStart(ex.id, i, e),
                onTouchMove: e => handleTouchMove(ex.id, i, e),
                onTouchEnd: () => handleTouchEnd(ex.id, i),
                onTouchCancel: () => { cancelAnimationFrame(swipeRafRef.current); swipeRef.current = null; setSwipeState(null) },
              }
              const rowStyle = { transform: `translateX(${dx}px)`, transition: isActive ? 'none' : 'transform 0.2s ease' }

              if (ex.category === 'Cardio') {
                const durationValid = Number.isInteger(Number.parseInt(s.duration, 10)) && Number.parseInt(s.duration, 10) > 0
                return (
                  <div key={i} className="set-row-wrapper" {...swipeProps}>
                    {deleteBg}
                    <div className={`set-row cardio-row ${s.done ? 'done' : ''}`} style={rowStyle}>
                      <span className="col-set">{i + 1}</span>
                      <span className="col-prev">
                        {(() => {
                          const p = prevSetsMap[ex.id]?.[i]
                          if (!p || !p.duration_seconds) return '—'
                          return `${Math.round(p.duration_seconds / 60)} min`
                        })()}
                      </span>
                      <input
                        className="col-kg set-input"
                        type="number"
                        inputMode="numeric"
                        value={s.duration}
                        placeholder="30"
                        min="1"
                        max="600"
                        disabled={s.done}
                        onChange={e => updateSet(ex.id, i, 'duration', e.target.value)}
                      />
                      <button className={`col-done done-btn ${s.done ? 'checked' : ''}`} disabled={!s.done && !durationValid} onClick={() => updateSet(ex.id, i, 'done', !s.done)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                )
              }

              const enteredWeight = Number.parseFloat(s.weight)
              const enteredReps = Number.parseInt(s.reps, 10)
              const weightValid = isWeightWithinInputRange(enteredWeight, {
                equipment: ex.equipment,
                unit: ex.unit,
                bodyweightKg: userBodyweightKg,
              })
              const repsValid = isRepsWithinInputRange(enteredReps)
              const minWeight = getWeightInputMin(ex.equipment, ex.unit, userBodyweightKg)
              const maxWeight = getWeightInputMax(ex.equipment, ex.unit)
              return (
              <div key={i} className="set-row-wrapper" {...swipeProps}>
                {deleteBg}
                <div
                  className={`set-row ${s.done ? 'done' : ''}`}
                  style={rowStyle}
                >
                <span className="col-set">{i + 1}</span>
                <span className="col-prev">
                  {(() => {
                    const p = prevSetsMap[ex.id]?.[i]
                    if (!p) return '—'
                    const w = p.unit === ex.unit ? p.weight
                      : p.unit === 'lbs' ? Math.round(p.weight * 0.453592 * 10) / 10
                      : Math.round(p.weight * 2.20462 * 10) / 10
                    return `${w} × ${p.reps}`
                  })()}
                </span>
                <input
                  className="col-kg set-input"
                  type="number"
                  inputMode={minWeight < 0 ? 'text' : 'decimal'}
                  value={s.weight}
                  placeholder="0"
                  min={String(minWeight)}
                  max={String(maxWeight)}
                  disabled={s.done}
                  onChange={e => updateSet(ex.id, i, 'weight', e.target.value)}
                />
                <input className="col-reps set-input" type="number" inputMode="numeric" value={s.reps} placeholder="10" min="0" max={String(MAX_REPS)} disabled={s.done} onChange={e => updateSet(ex.id, i, 'reps', e.target.value)}/>
                <button className={`col-done done-btn ${s.done ? 'checked' : ''}`} disabled={!s.done && (!weightValid || !repsValid)} onClick={() => updateSet(ex.id, i, 'done', !s.done)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </button>
                </div>
              </div>
            )})}
          </div>
                )}
              </SortableExerciseBlock>
            ))}
          </SortableContext>
        </DndContext>

        <div className="workout-actions">
          <button className="action-btn" onClick={() => { setPickerContext('workout'); setShowExercises(true) }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add Exercise
          </button>
        </div>

        <div className="workout-end-actions">
          <button type="button" className="cancel-btn" onClick={() => setConfirmAction('cancel')}>Cancel</button>
          <button type="button" className="finish-btn" onClick={promptFinishWorkout}>Finish Workout</button>
        </div>


      </div>
      {isVisible && restTimer && typeof document !== 'undefined' && createPortal(
        <div className="rest-overlay">
          {(() => {
            const secondsLeft = getRemainingRestSeconds(restTimer)
            return <>
              <div className="rest-overlay-name">{restTimer.exerciseName}</div>
              <div className="rest-countdown">{fmtRest(secondsLeft)}</div>
              <div className="rest-progress-track">
                <div className="rest-progress-fill" style={{ width: `${(secondsLeft / restTimer.total) * 100}%` }} />
              </div>
              <div className="rest-overlay-actions">
                <button className="rest-step-overlay-btn" onClick={() => setRestTimer(r => { if (!r) return null; const updated = { ...r, endTime: r.endTime - 5000 }; scheduleRestEndNotification(Math.max(0, (updated.endTime - Date.now()) / 1000), r.exerciseName); return updated })}>−5s</button>
                <button className="rest-skip-btn" onClick={() => { cancelRestNotification(); setRestTimer(null) }}>Skip</button>
                <button className="rest-step-overlay-btn" onClick={() => setRestTimer(r => { if (!r) return null; const updated = { ...r, endTime: r.endTime + 5000 }; scheduleRestEndNotification((updated.endTime - Date.now()) / 1000, r.exerciseName); return updated })}>+5s</button>
              </div>
            </>
          })()}
        </div>,
        document.body
      )}
      {confirmDialog}
      </>
    )
  }

  // Default — pre-workout screen
  if (battleModeActive) {
    return (
      <div className="workout-screen">
        <div className="section">
          <div className="battle-lobby-card">
            <div>
              <div className="battle-panel-eyebrow">Battle Active</div>
              <div className="battle-lobby-title">
                {`Starting workout with ${battleRoom.opponentProfile?.full_name || battleRoom.opponentProfile?.username || 'your friend'}`}
              </div>
              <div className="battle-lobby-body">
                Both sides jump into a new empty workout automatically. Completed sets and added exercises will sync live.
              </div>
            </div>
          </div>
          <LoadingSpinner />
          {battleSyncError && (
            <div className="battle-panel-error" style={{ marginTop: 14 }}>
              {battleSyncError}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <>
    <div className="workout-screen">
      {savedWorkoutDraft && !battleModeActive && (
        <div className="section">
          <h2 className="section-title">Resume Workout</h2>
          <div className="battle-lobby-card workout-draft-card">
            <div>
              <div className="battle-panel-eyebrow">Saved Workout</div>
              <div className="battle-lobby-title">
                {savedWorkoutDraft.workoutExercises?.length
                  ? `${savedWorkoutDraft.workoutExercises.length} exercise${savedWorkoutDraft.workoutExercises.length === 1 ? '' : 's'} ready to resume`
                  : 'Continue your in-progress workout'}
              </div>
              <div className="battle-lobby-body">
                {formatDraftSavedAt(savedWorkoutDraft.savedAt)}. Your unfinished workout was kept locally so you can pick up where you left off.
              </div>
            </div>
            <div className="workout-draft-actions">
              <button className="confirm-discard" onClick={discardSavedWorkout} disabled={savedWorkoutDraftBusy}>
                {savedWorkoutDraftBusy ? 'Working...' : 'Discard'}
              </button>
              <button className="confirm-submit" onClick={resumeSavedWorkout} disabled={savedWorkoutDraftBusy}>
                {savedWorkoutDraftBusy ? 'Working...' : 'Resume'}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="section">
        <h2 className="section-title">Routines</h2>
        {battleModeActive && (
          <div className="battle-lobby-card">
            <div>
              <div className="battle-panel-eyebrow">Battle Active</div>
              <div className="battle-lobby-title">
                {`${battleRoom.opponentProfile?.full_name || battleRoom.opponentProfile?.username || 'Your friend'} is waiting`}
              </div>
              <div className="battle-lobby-body">
                A new empty workout will start automatically and completed sets will sync live.
              </div>
            </div>
          </div>
        )}
        <div className="template-list">
          {userRoutines.length > 0 && (
            <>
              <div className="template-section-label">My Routines</div>
              {userRoutines.map(r => {
                const isActive = templateSwipeState?.id === r.id
                const dx = isActive ? templateSwipeState.dx : 0
                const revealing = dx < -20
                return (
                  <div key={r.id} className="template-swipe-wrapper"
                    onTouchStart={e => handleTemplateTouchStart(r.id, e)}
                    onTouchMove={e => handleTemplateTouchMove(r.id, e)}
                    onTouchEnd={() => handleTemplateTouchEnd(r.id, () => deleteRoutine(r.id))}
                    onTouchCancel={() => { templateSwipeRef.current = null; setTemplateSwipeState(null) }}
                  >
                    {revealing && (
                      <div className="set-row-delete-bg" style={{ width: Math.abs(dx) }}>
                        <svg style={{ width: Math.min(20, Math.abs(dx) * 0.25), height: Math.min(20, Math.abs(dx) * 0.25) }} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                          <path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                        </svg>
                      </div>
                    )}
                    <div className="template-card" style={{ transform: `translateX(${dx}px)`, transition: isActive ? 'none' : 'transform 0.2s ease' }}>
                      <button className="template-icon-btn template-icon-btn-danger" onClick={() => deleteRoutine(r.id)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                          <path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                        </svg>
                      </button>
                      <div className="template-info">
                        <div className="template-name">{r.name}</div>
                        {r.description && <div className="template-meta">{r.description}</div>}
                        <div className="template-exercises">{(r.exercises || []).map(e => e.name).join(' · ')}</div>
                      </div>
                      <div className="template-actions">
                        <button className="template-icon-btn" onClick={() => openRoutineBuilder(r)}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        <button className="start-btn" onClick={() => startFromTemplate(r)}>Start</button>
                      </div>
                    </div>
                  </div>
                )
              })}
              <div className="template-section-label" style={{ marginTop: 4 }}>Suggested Routines</div>
            </>
          )}
          {TEMPLATES.filter(t => !hiddenTemplates.includes(t.id)).map(t => {
            const isActive = templateSwipeState?.id === t.id
            const dx = isActive ? templateSwipeState.dx : 0
            const revealing = dx < -20
            return (
              <div key={t.id} className="template-swipe-wrapper"
                onTouchStart={e => handleTemplateTouchStart(t.id, e)}
                onTouchMove={e => handleTemplateTouchMove(t.id, e)}
                onTouchEnd={() => handleTemplateTouchEnd(t.id, () => hideTemplate(t.id))}
                onTouchCancel={() => { templateSwipeRef.current = null; setTemplateSwipeState(null) }}
              >
                {revealing && (
                  <div className="set-row-delete-bg" style={{ width: Math.abs(dx) }}>
                    <svg style={{ width: Math.min(20, Math.abs(dx) * 0.25), height: Math.min(20, Math.abs(dx) * 0.25) }} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                      <path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                    </svg>
                  </div>
                )}
                <div className="template-card" style={{ transform: `translateX(${dx}px)`, transition: isActive ? 'none' : 'transform 0.2s ease' }}>
                  <button className="template-icon-btn template-icon-btn-danger" onClick={() => hideTemplate(t.id)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                      <path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                    </svg>
                  </button>
                  <div className="template-info">
                    <div className="template-name">{t.name}</div>
                    <div className="template-meta">{t.description}</div>
                    <div className="template-exercises">
                      {t.exercises.map(e => e.name).join(' · ')}
                    </div>
                  </div>
                  <div className="template-actions">
                    <button className="template-icon-btn" onClick={() => openRoutineBuilder({ name: t.name, description: t.description, exercises: t.exercises.map(e => ({ name: e.name, sets: e.sets })) })}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                    <button className="start-btn" onClick={() => startFromTemplate(t)}>Start</button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
      <div className="section">
        <h2 className="section-title">New Workout</h2>
        <div className="new-workout-btns">
          <button className="empty-workout-btn" onClick={() => {
            if (savedWorkoutDraft) {
              setConfirmAction('restart')
            } else {
              performStartWorkout()
            }
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Empty Workout
          </button>
          <button className="empty-workout-btn" onClick={() => openRoutineBuilder()}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
              <polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
            </svg>
            Create Routine
          </button>
        </div>
      </div>
    </div>
    {confirmDialog}
    </>
  )
}
