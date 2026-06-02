import { Fragment, useState, useEffect, useLayoutEffect, useRef, useEffectEvent, lazy, Suspense, useMemo, useCallback } from 'react'
import { push as pushBack, remove as removeBack } from '../lib/backStack'
import * as Sentry from '@sentry/react'
import { useFocusTrap } from '../lib/useFocusTrap'
import { createPortal } from 'react-dom'
import { AlertTriangle, Check, RefreshCw, Search } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { createCustomExercise, fetchExercises } from '../data/exercises'
import { fetchExerciseRankStates, mapExerciseRankStates } from '../data/rankStates'
import { calculateSetEstimatedOrm } from '../lib/orm'
import { TEMPLATES } from '../data/templates'
import { invalidateCache } from '../lib/cache'
import { friendlyError } from '../lib/friendlyError'
import { getAnchors, TIERS, expandAnchors, getTierIdx, getProgress, tierColor } from '../lib/strengthStandards'
import { ACHIEVEMENTS } from '../data/achievements'
import LoadingSpinner from './LoadingSpinner'
import { showWorkoutCompleteAd } from '../lib/admob'
import { isPremiumSync, refreshPremiumStatus } from '../lib/purchases'
import Paywall from './Paywall'
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
import { finishWorkoutSessionAtomic } from '../lib/workoutCompletion'
import { computeNewStreakStartDate } from '../lib/streakUtils'
import { normalizeSearchValue, matchesSearchQuery, scoreExerciseMatch } from '../lib/exerciseSearch'
import {
  MAX_REPS,
  fromKg,
  getProfileBodyweightKg,
  getSetVolumeInUnit,
  getSetVolumeKg,
  getSetTrainingVolumeInUnit,
  getSetTrainingVolumeKg,
  getWeightInputMax,
  getWeightInputMin,
  isRepsWithinInputRange,
  isWeightWithinInputRange,
  toKg,
} from '../lib/liftMath'
import ProgressionSuggestion from './ProgressionSuggestion'
import PlateCalculator from './PlateCalculator'
import { fetchRecentSessionsWithStatus, buildCurrentSetSuggestion, resolveCompletedSetProgressionEvent, buildExerciseSnapWeight } from '../lib/progressiveOverload'
import { getCustomIncrements, setCustomIncrementKg, getCustomStartingWeights, setCustomStartingWeightKg } from '../lib/incrementSettings'
import { PLATE_EQUIPMENT, PLATE_CALCULATOR_EQUIPMENT } from '../lib/plateUtils'
import {
  getBattleModeLabel,
  loadBattleRecap,
  loadOpponentEvents,
  publishWorkoutRoomEvent,
  recordBattleResultAtomic,
} from '../lib/battles'
import { buildRemoteWorkouts } from '../lib/battleProjection'
import { CUSTOM_EQUIPMENT_OPTIONS, SUPPORTED_MUSCLES } from '../lib/exerciseOptions'
import { clampContinuousTierScore, resolveTierFromScore, updateRollingScore } from '../lib/rollingRanks'
import { estimateCaloriesBurned } from '../lib/calorieMath'
import { fetchProfileWithWorkoutCount } from '../lib/workoutCount'
import { useCurrentUserId } from '../context/UserContext'
import { VALIDATION_LIMITS, validateLength, validateNumber } from '../lib/inputValidation'
import { sanitizeHiddenTemplateIds } from '../lib/localDraftSanitizers'
import {
  defaultSet,
  defaultCardioSet,
  buildPreviousSetValuesByWorkingIndex,
  getDropSetGroupIndexForParent,
  getWorkingSetIndexAt,
  normalizeWorkoutExercises,
  markExerciseSetCompleted,
  clearExerciseSetCompletion,
  buildSupersetDisplayGroups,
  clearSupersetGroupForExercise,
  pairExercisesAsSuperset,
  removeExerciseAndRepairSupersets,
} from '../lib/workoutSets'
import {
  WORKOUT_DRAFT_VERSION,
  readStoredWorkoutDraft,
  writeStoredWorkoutDraft,
  clearStoredWorkoutDraft,
} from '../lib/workoutDraft'
import { createRestTimer, getRemainingRestSeconds, useRestTimer } from '../lib/useRestTimer'
import { useSetSwipe, useTemplateSwipe } from '../lib/useSwipe'
import {
  DEFAULT_TRAINING_PLAN_FORM,
  TRAINING_PLAN_EQUIPMENT,
  TRAINING_PLAN_EXPERIENCE,
  TRAINING_PLAN_FOCUS_AREAS,
  TRAINING_PLAN_GOALS,
  TRAINING_PLAN_BLOCK_GOALS,
  TRAINING_PLAN_DELOAD_POLICIES,
  TRAINING_PLAN_PERIODIZATION,
  TRAINING_PLAN_SPLITS,
  TRAINING_PLAN_WEEKDAYS,
  generateTrainingPlan,
  getPlanExerciseReplacementWarning,
  getPrioritizedReplacementExercises,
  getTrainingPlanGoalLabel,
  normalizeTrainingPlan,
  normalizeTrainingPlanForm,
  replaceTrainingPlanExercise,
  validateTrainingPlanForm,
} from '../lib/trainingPlanGenerator'
import { applyPlanAdaptation, buildPlanAdaptation, supersedeSameDayPending, dismissSupersededSameDayAdaptations, resolveAdaptiveCoachMode } from '../lib/trainingPlanAdaptation'
import {
  applyScheduledDeloadToPlanDay,
  applyScheduledDeloadToSuggestion,
  getActivePlanWeek,
  isScheduledDeloadWeek,
} from '../lib/planDeload'
import '../styles/Workout.css'

const ExerciseDetail = lazy(() => import('./exercise/ExerciseDetail'))

const formatTrainingPlanDuration = (weeks) =>
  Number(weeks) >= VALIDATION_LIMITS.trainingPlanDurationWeeksMax ? 'Ongoing' : `${weeks} weeks`
const formatTrainingPlanDurationShort = (weeks) =>
  Number(weeks) >= VALIDATION_LIMITS.trainingPlanDurationWeeksMax ? 'Ongoing' : `${weeks}w`
const MAX_SAVED_TRAINING_PLANS = 5
const MAX_SAVED_ROUTINES = 15
const TRAINING_PLAN_LIMIT_MESSAGE = `You can save up to ${MAX_SAVED_TRAINING_PLANS} training plans. Delete an old plan to save this one.`
const ROUTINE_LIMIT_MESSAGE = `You can save up to ${MAX_SAVED_ROUTINES} routines. Delete an old routine to save this one.`
const TRAINING_PLAN_LIMIT_ERROR = 'Saved training plan limit reached'
const ROUTINE_LIMIT_ERROR = 'Saved routine limit reached'

function getSavedItemLimitMessage(error, fallback) {
  const message = String(error?.message || '')
  if (message.includes(TRAINING_PLAN_LIMIT_ERROR)) return TRAINING_PLAN_LIMIT_MESSAGE
  if (message.includes(ROUTINE_LIMIT_ERROR)) return ROUTINE_LIMIT_MESSAGE
  return friendlyError(error, fallback)
}

function getLoggedSetEstimatedOrmKg({ weight, reps, unit, equipment, bodyweightKg }) {
  const estimatedOrm = calculateSetEstimatedOrm({ weight, reps, unit, equipment, bodyweightKg })
  return Number.isFinite(estimatedOrm) ? toKg(estimatedOrm, unit) : null
}

function getBodyweightRepsForAddedOrm(targetAddedOrmKg, bodyweightKg) {
  if (!Number.isFinite(targetAddedOrmKg)) return null
  let bestReps = null
  let bestGap = Infinity

  for (let reps = 1; reps <= 30; reps++) {
    const addedOrm = getLoggedSetEstimatedOrmKg({
      weight: 0,
      reps,
      unit: 'kg',
      equipment: 'Bodyweight',
      bodyweightKg,
    })
    if (!Number.isFinite(addedOrm)) continue
    const gap = Math.abs(addedOrm - targetAddedOrmKg)
    if (gap < bestGap) {
      bestGap = gap
      bestReps = reps
    }
    if (addedOrm >= targetAddedOrmKg) return reps
  }

  return bestReps
}

function buildEquivalentBodyweightRepsSuggestion(repsSuggestion, loadSuggestion, bodyweightKg) {
  if (!repsSuggestion || !loadSuggestion) return repsSuggestion
  const targetAddedOrmKg = getLoggedSetEstimatedOrmKg({
    weight: loadSuggestion.suggestedWeightKg,
    reps: loadSuggestion.suggestedReps,
    unit: 'kg',
    equipment: 'Bodyweight',
    bodyweightKg,
  })
  const equivalentReps = getBodyweightRepsForAddedOrm(targetAddedOrmKg, bodyweightKg)
  if (!Number.isFinite(equivalentReps)) return repsSuggestion
  const previousReps = Number(repsSuggestion.suggestedReps) || 0
  const suggestedReps = Math.min(30, equivalentReps)

  return {
    ...repsSuggestion,
    action: suggestedReps > previousReps ? 'increase_reps' : repsSuggestion.action,
    suggestedWeightKg: 0,
    suggestedReps,
    unadjustedSuggestedWeightKg: 0,
    unadjustedSuggestedReps: suggestedReps,
    planMode: suggestedReps > previousReps ? 'increase_reps' : repsSuggestion.planMode,
    reasoning: `${repsSuggestion.reasoning} This reps-only option matches the load option's estimated effort as closely as possible, capped at 30 reps.`,
    isBodyweightOnly: true,
  }
}

function formatPlannedExerciseTarget(exercise) {
  if (exercise?.category === 'Cardio') {
    const minutes = Math.max(1, Math.round((Number(exercise.durationSeconds) || 0) / 60))
    return `${minutes} min`
  }

  return `${Number(exercise?.sets) || 1} × ${exercise?.repRange || exercise?.reps || 'reps'}`
}

function formatPlannedRest(restSeconds) {
  const seconds = Number(restSeconds)
  if (!Number.isFinite(seconds) || seconds <= 0) return ''
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')} rest`
}

function formatPlanMetaLabel(value) {
  return String(value || '').replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function formatBattleHighlightLoad(kg, unit = 'kg') {
  const value = fromKg(Number(kg) || 0, unit)
  return `${Math.round(value * 10) / 10} ${unit}`
}

function formatBattleHighlightDuration(seconds) {
  const total = Math.max(0, Math.round(Number(seconds) || 0))
  const minutes = Math.floor(total / 60)
  const remainder = total % 60
  return minutes > 0 ? `${minutes}m ${remainder}s` : `${remainder}s`
}

function formatTrainingDayLabel(dayId) {
  return TRAINING_PLAN_WEEKDAYS.find(day => day.id === dayId)?.label || dayId
}

function isMissingPlanPersistence(error) {
  const message = `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`.toLowerCase()
  return (
    error?.code === 'PGRST204'
    || error?.code === '42P01'
    || message.includes('user_training_plan_adaptations')
    || message.includes('source_plan_id')
    || message.includes('source_plan_day_id')
    || message.includes('source_plan_week')
  )
}

function sanitizePlanWorkoutMetadata(value, maxLength = 80) {
  return String(value ?? '').slice(0, maxLength)
}

function getPlanTargetLabel(exercise) {
  if (!exercise?.planSource) return ''
  if (exercise.planDeloadWeek) return `Deload target: ${exercise.planRepRange || exercise.planTargetReps || 'easy'} reps · 3-5 RIR`
  if (exercise.planRepRange) return `Plan target: ${exercise.planRepRange} reps`
  if (exercise.planTargetReps) return `Plan target: ${exercise.planTargetReps} reps`
  return ''
}


const PLAN_BUILDER_HELP = {
  goal: [
    'What it means: The main outcome the week is built around.',
    'Strength: Favors heavier main lifts, lower reps, and longer rest.',
    'Hypertrophy: Favors more muscle volume.',
    'Cardio: Prioritizes conditioning.',
    'Hybrid: Blends lifting and conditioning.',
    'General Fitness: Keeps the week balanced.',
    'How to answer: pick the thing you most want this plan to improve first.',
  ],
  experience: [
    'What it means: How much weekly work and complexity the plan assumes you can recover from.',
    'Beginner: Uses simpler, lower-volume weeks.',
    'Intermediate: The default for consistent lifters.',
    'Advanced: Adds more volume and accessory work.',
    'How to answer: Choose the level you can recover from, not the level you want to be.',
  ],
  daysPerWeek: [
    'What it means: How many training sessions the plan spreads across each week.',
    'Fewer days means fuller sessions.',
    'More days lets the plan distribute volume and focus more precisely.',
    'How to answer: Choose the number you can hit most weeks.',
  ],
  sessionLength: [
    'What it means: the time budget for each workout.',
    'Short sessions use fewer exercises and tighter volume. Longer sessions allow more accessories or conditioning only when useful.',
    'How to answer: pick your realistic door-to-door training time.',
  ],
  duration: [
    'What it means: How long you expect to run this plan before reassessing.',
    'Short blocks are good for experimentation.',
    'Eight to twelve weeks is a solid default.',
    'Ongoing keeps the plan available without a fixed end.',
    'How to answer: Choose the next natural review point.',
  ],
  equipment: [
    'What it means: What equipment the plan generator is allowed to use.',
    'The plan will avoid unselected equipment. EZ Bar enables curl-bar movements, and Cardio Machines enables machine-based cardio options.',
    'How to answer: Select only equipment you reliably have access to.',
  ],
  focusAreas: [
    'What it means: Muscles that should get extra attention.',
    'Focus areas increase the weekly target for those muscles, but the plan still protects overall balance.',
    'How to answer: Pick weak points or priorities, not every muscle.',
  ],
  schedule: [
    'What it means: Whether you have a strict schedule or simply a number of days you can workout.',
    'Flexible days only controls weekly frequency. Exact weekdays pins sessions to selected days.',
    'How to answer: Choose exact only if your training days are predictable.',
  ],
  trainingDays: [
    'What it means: The days of the week the plan should schedule workouts on.',
    'These labels appear on plan days. The plan still uses the same weekly structure.',
    'How to answer: Pick the days you can train with the least friction.',
  ],
  split: [
    'What it means: How training stress is organized across the week.',
    'Auto: Scores multiple split types and chooses the best fit.',
    'Full Body: Frequent and simple, with less muscle isolation.',
    'Upper / Lower: Blanced, higher frequency with decent isolation.',
    'Push / Pull / Leg: Separates major movement patterns. Allows for much higher isolation',
    'Strength + Accessories: Prioritizes main lifts, with accessory exercises working to build up your main ones',
    'Hybrid: Reserves the most room for conditioning.',
    'How to answer: Use Auto unless you strongly prefer a specific structure.',
  ],
  progression: [
    'What it means: How the plan expects exercise targets to move over time.',
    'Double Progression: You add reps first. Once you can hit the top of the rep range, you increase weight and build reps back up.',
    'Linear: You try to add weight in a more direct step-by-step way when the workout is completed successfully.',
    'Undulating: The plan rotates stress instead of making every workout feel the same, usually by changing reps, load, or intensity across sessions.',
    'Maintenance: The plan keeps the work mostly steady, useful when you want to hold strength or muscle without pushing hard.',
    'Deload Aware: The plan progresses normally but stays more conservative when fatigue or repeated difficulty shows up.',
    'How to answer: Choose Double Progression if you want the safest default for steady progress.',
  ],
  deload: [
    'What it means: When the plan expects easier training.',
    'Adaptive: Waits for coach signals from completed workouts.',
    'Every 4 weeks: Plans easier training often, useful for harder blocks or people who fatigue quickly.',
    'Every 6 weeks: Uses a moderate fixed rhythm for most normal training blocks.',
    'Every 8 weeks: Deloads less often, useful if your volume is manageable and recovery is strong.',
    'Off: Removes planned deload timing.',
    'How to answer: Choose Adaptive unless you already follow a fixed deload schedule.',
  ],
  blockGoal: [
    'What it means: The emphasis inside this training block.',
    'Accumulation: Builds work capacity and repeatable volume.',
    'Strength: Shifts the block toward heavier main work.',
    'Hypertrophy: Emphasizes muscle-building volume.',
    'Conditioning: Favors aerobic and work-capacity improvements.',
    'General Fitness: Keeps the block rounded.',
    'How to answer: Choose the flavor you want for this block, even if your main goal is broader.',
  ],
  adaptiveCoach: [
    'What it means: Whether completed plan workouts can create review suggestions.',
    'On: Shows coach review cards after plan workouts when the plan may need adjustment.',
    'Off: Keeps the saved plan more static.',
    'How to answer: Leave it on if you want the plan to evolve with your training.',
  ],
}

function PlanInfoLabel({ label, helpKey, onOpen }) {
  const items = PLAN_BUILDER_HELP[helpKey] || []
  return (
    <div className="plan-info-label">
      <span className="template-section-label">{label}</span>
      <button
        type="button"
        className="plan-info-btn"
        aria-label={`${label} info`}
        onClick={() => onOpen({ title: label, items })}
      >
        i
      </button>
    </div>
  )
}

const BATTLE_METRIC_HELP = {
  strength_volume_bw: 'Effective Volume / BW compares total strength training work normalized by bodyweight, so heavier lifting gets credit without ignoring lifter size.',
  top_set_strength_bw: 'Top Set Strength / BW compares your strongest completed strength set normalized by bodyweight.',
  shared_or_matched_strength_bw: 'Shared/Matched Top Set / BW compares top strength on the same lift, or a close name match, when both lifters log one.',
  strength_density: 'Strength Density compares bodyweight-normalized strength work per minute.',
  cardio_met_minutes: 'Cardio MET-Minutes estimates conditioning work from cardio intensity and time.',
  cardio_duration: 'Cardio Duration compares total completed cardio time.',
  cardio_density: 'Cardio Density compares cardio intensity per minute.',
  overall_density: 'Overall Work Density compares combined strength and cardio work per minute.',
  completion_breadth: 'Completion Breadth gives a small bonus for logging more completed sets and exercises.',
}

function getBattleScoreInfoItems(projection) {
  const metrics = projection?.metrics || []
  const items = [
    'The live score is weighted out of 100. Each metric gives points based on your value compared with your opponent.',
    'Unavailable metrics are ignored for now, and their weight is redistributed across the metrics that both lifters have data for.',
    'Very close metric values count as a tie for that metric, even if the displayed numbers are not exactly identical.',
  ]

  for (const metric of metrics) {
    const weight = Number(metric.effectiveWeight ?? metric.weight)
    const weightText = Number.isFinite(weight) && weight > 0 ? ` (${Math.round(weight)} pts right now)` : ''
    const rawText = metric.available
      ? ` Raw values: you ${formatBattleMetricValue(metric, metric.yourValue)}, them ${formatBattleMetricValue(metric, metric.opponentValue)}.`
      : ' Raw values: waiting for both lifters to log enough data.'
    const help = BATTLE_METRIC_HELP[metric.id] || metric.unavailableText || 'This metric compares both lifters on the labeled battle category.'
    items.push(`${metric.label}${weightText}: ${help}${rawText}`)
  }

  return items
}

function formatBattleMetricValue(metric, value) {
  if (value === null || value === undefined) return '—'
  const suffix = metric.display?.includes('min') && !metric.display?.includes('/')
    ? ''
    : metric.display?.includes('MET')
      ? ''
      : metric.id === 'completion_breadth'
        ? ''
        : 'x'
  return `${Number(value).toFixed(2)}${suffix}`
}

function formatBattleMetricPoints(value) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? `${Math.round(numeric)} pts` : '—'
}

function getPlanDetailSplitInfo(label, rationale) {
  const normalized = String(label || '').toLowerCase()
  let summary = 'This controls how the week is organized across training days.'
  if (normalized.includes('push') || normalized.includes('pull') || normalized.includes('leg')) {
    summary = 'Push Pull Legs separates pressing muscles, pulling muscles, and lower-body work into different days.'
  } else if (normalized.includes('upper') || normalized.includes('lower')) {
    summary = 'Upper / Lower alternates upper-body and lower-body sessions for a balanced weekly rhythm.'
  } else if (normalized.includes('full')) {
    summary = 'Full Body spreads major movement patterns across most sessions instead of isolating one region per day.'
  } else if (normalized.includes('strength')) {
    summary = 'Strength + Accessories prioritizes main lifts first, then uses smaller work to support them.'
  } else if (normalized.includes('hybrid')) {
    summary = 'Hybrid reserves room for both lifting and conditioning inside the week.'
  }
  return [summary, rationale || 'The generator picked this structure from your frequency, goals, and settings.']
}

function getPlanDetailProgressionInfo(label) {
  const normalized = String(label || '').toLowerCase()
  if (normalized.includes('linear')) {
    return ['Linear progression tries to add load in direct steps when workouts are completed successfully.']
  }
  if (normalized.includes('undulating')) {
    return ['Undulating progression rotates stress across sessions instead of making every workout feel the same.']
  }
  if (normalized.includes('maintenance')) {
    return ['Maintenance keeps targets mostly steady so you can hold strength or muscle without pushing hard.']
  }
  if (normalized.includes('deload')) {
    return ['Deload-aware progression moves normally, but stays more conservative when fatigue signals show up.']
  }
  return ['Double progression adds reps first, then increases weight once you can hit the top of the rep range.']
}

function getPlanDetailDeloadInfo(label) {
  const normalized = String(label || '').toLowerCase()
  if (normalized.includes('off')) return ['Deloads are not scheduled for this plan.']
  if (normalized.includes('every')) return ['This plan schedules easier training at the interval shown on the pill.']
  return ['Adaptive deloading waits for coach signals from completed workouts instead of forcing a fixed easier week.']
}

const QUALITY_FLAG_LABELS = {
  missing_core: 'Core work is low relative to overall volume.',
  quad_hamstring_imbalance: 'Quad volume significantly outweighs hamstrings and glutes.',
  excessive_pressing_vs_pulling: 'Too much pushing relative to pulling movements.',
  pulling_dominates_pressing: 'Pull volume heavily outweighs pressing movements.',
  excessive_direct_shoulder_arm_overlap: 'High direct arm and shoulder volume relative to torso work.',
}

function readableFlag(flag) {
  if (QUALITY_FLAG_LABELS[flag]) return QUALITY_FLAG_LABELS[flag]
  if (flag.startsWith('undertrained_')) {
    const area = flag.replace('undertrained_', '').replaceAll('_', ' ')
    return `${area.charAt(0).toUpperCase() + area.slice(1)} is undertrained relative to your focus goal.`
  }
  if (flag.startsWith('over_time_')) return `Session ${flag.replace('over_time_', '').toUpperCase()} runs over the target length.`
  return flag.replaceAll('_', ' ')
}

const SCORE_REDUCING_FLAGS = new Set([
  'quad_hamstring_imbalance',
  'excessive_pressing_vs_pulling',
  'pulling_dominates_pressing',
  'excessive_direct_shoulder_arm_overlap',
])

function getPlanDetailQualityInfo(score, flags = [], preferences = {}) {
  const safeScore = Math.round(Number(score))
  const q = preferences.quality || {}
  const items = [`${safeScore}/100 overall balance score across muscle volume, movement coverage, and session length.`]
  if (Number.isFinite(q.volumeScore)) items.push(`Muscle Coverage: ${Math.round(q.volumeScore)}/100 — how well weekly sets meet targets per muscle group.`)
  if (Number.isFinite(q.patternScore)) items.push(`Pattern Coverage: ${Math.round(q.patternScore)}/100 — how well movement patterns are hit each week.`)
  if (Number.isFinite(q.timeScore)) items.push(`Time Adherence: ${Math.round(q.timeScore)}/100 — how closely sessions fit the target length.`)
  const scoringFlags = flags.filter(f => SCORE_REDUCING_FLAGS.has(f))
  const infoFlags = flags.filter(f => !SCORE_REDUCING_FLAGS.has(f))
  if (scoringFlags.length) {
    items.push(`${scoringFlags.length} issue${scoringFlags.length === 1 ? '' : 's'} reduced your score (−${scoringFlags.length * 2} pts):`)
    scoringFlags.forEach(flag => items.push(`• ${readableFlag(flag)}`))
  }
  if (infoFlags.length) {
    items.push(`${infoFlags.length} note${infoFlags.length === 1 ? '' : 's'} (no score impact):`)
    infoFlags.forEach(flag => items.push(`• ${readableFlag(flag)}`))
  }
  return items
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

function groupSets(sets) {
  const groups = []
  const seenGroups = new Set()
  for (let i = 0; i < sets.length; i++) {
    const s = sets[i]
    if (s.setType === 'dropset') continue
    if (s.setGroupIndex != null && seenGroups.has(s.setGroupIndex)) continue
    const dropSetIdxs = s.setGroupIndex != null
      ? sets.map((ds, j) => ({ ds, j }))
          .filter(({ ds }) => ds.setGroupIndex === s.setGroupIndex && ds.setType === 'dropset')
          .map(({ j }) => j)
      : []
    if (s.setGroupIndex != null) seenGroups.add(s.setGroupIndex)
    groups.push({ parentSetIdx: i, dropSetIdxs })
  }
  return groups
}

function getInsertedSetType(set) {
  if (set?.is_warmup || set?.set_type === 'warmup' || set?.setType === 'warmup') return 'warmup'
  return set?.set_type ?? set?.setType ?? 'normal'
}

function isInsertedWorkingSet(set) {
  if (set?.duration_seconds > 0) return true
  const setType = getInsertedSetType(set)
  return setType !== 'warmup' && setType !== 'dropset'
}

function formatEffortSetSummary(workingSets, dropSets) {
  const workingText = `${workingSets} working set${workingSets === 1 ? '' : 's'}`
  if (!dropSets) return workingText
  return `${workingText} + ${dropSets} drop${dropSets === 1 ? '' : 's'}`
}

function SortableExerciseBlock({ id, children, className = '', disabled = false, followTransform = null }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled })
  const style = {
    transform: followTransform
      ? `translate3d(${followTransform.x}px, ${followTransform.y}px, 0)`
      : CSS.Translate.toString(transform),
    transition: followTransform ? 'none' : transition,
    opacity: isDragging || followTransform ? 0.4 : 1,
  }

  return (
    <div ref={setNodeRef} className={`sortable-exercise-shell${className ? ` ${className}` : ''}`} style={style}>
      {children({
        listeners: disabled ? {} : listeners,
        attributes: disabled ? {} : attributes,
        isDragging,
        isDragDisabled: disabled,
      })}
    </div>
  )
}

function moveWorkoutExerciseForDrag(exercises, activeId, overId) {
  const oldIdx = exercises.findIndex(exercise => exercise.id === activeId)
  const newIdx = exercises.findIndex(exercise => exercise.id === overId)
  if (oldIdx === -1 || newIdx === -1 || oldIdx === newIdx) return exercises

  const activeExercise = exercises[oldIdx]
  const overExercise = exercises[newIdx]
  const activeGroupId = activeExercise?.supersetGroupId ?? null
  const overGroupId = overExercise?.supersetGroupId ?? null
  const activeGroupMembers = activeGroupId
    ? exercises.filter(exercise => exercise.supersetGroupId === activeGroupId)
    : []
  const activeIsTopSupersetMember = activeGroupMembers.length === 2 && activeGroupMembers[0]?.id === activeId
  const activeIsBottomSupersetMember = activeGroupMembers.length === 2 && activeGroupMembers[1]?.id === activeId

  if (activeIsBottomSupersetMember) return exercises
  if (!activeIsTopSupersetMember && !overGroupId) return arrayMove(exercises, oldIdx, newIdx)

  const movingIds = new Set(activeIsTopSupersetMember
    ? activeGroupMembers.map(exercise => exercise.id)
    : [activeId])
  if (movingIds.has(overId)) return exercises

  const movingExercises = exercises.filter(exercise => movingIds.has(exercise.id))
  const remainingExercises = exercises.filter(exercise => !movingIds.has(exercise.id))
  const movingDown = oldIdx < newIdx

  let insertIndex = remainingExercises.findIndex(exercise => exercise.id === overId)
  if (insertIndex === -1) return exercises

  const overGroupMembers = overGroupId
    ? remainingExercises
        .map((exercise, index) => ({ exercise, index }))
        .filter(({ exercise }) => exercise.supersetGroupId === overGroupId)
    : []

  if (overGroupMembers.length === 2) {
    const groupIndexes = overGroupMembers.map(({ index }) => index)
    insertIndex = movingDown ? Math.max(...groupIndexes) + 1 : Math.min(...groupIndexes)
  } else if (movingDown) {
    insertIndex += 1
  }

  return [
    ...remainingExercises.slice(0, insertIndex),
    ...movingExercises,
    ...remainingExercises.slice(insertIndex),
  ]
}


export default function Workout({
  onStatusChange,
  onFinish,
  battleRoom,
  onBattleRoomClosed,
  startEmptyWorkoutTick = 0,
  resumeWorkoutTick = 0,
  isVisible = false,
  streakStartDate = null,
  streakLastWorkoutAt = null,
  onRequestLogBodyweight,
  weightRefreshTick = 0,
  profileRefreshTick = 0,
  workoutHistoryRefreshTick = 0,
  isPremium = false,
  trainingLoadAdvisory = null,
}) {
  const userId = useCurrentUserId()
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
  const [deleteConfirmExId, setDeleteConfirmExId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
  const [confirmAction, setConfirmAction] = useState(null) // null | 'cancel' | 'finish' | 'restart' | 'incomplete' | 'delete-plan' | 'delete-routine' | 'hide-template'
  const [confirmBusy, setConfirmBusy] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null) // null | { type, id, name }
  const [deleteConfirmError, setDeleteConfirmError] = useState('')
  const [finishSaveError, setFinishSaveError] = useState('')
  const confirmDialogRef = useRef(null)
  const [bodyweightWarning, setBodyweightWarning] = useState(null) // null | { run: () => any }
  const bodyweightWarningDialogRef = useRef(null)
  const [defaultRest, setDefaultRest] = useState(90)
  const { restTimer, setRestTimer } = useRestTimer()
  const [editingRest, setEditingRest] = useState(null)
  const [startedDropGroups, setStartedDropGroups] = useState(new Set())
  const [editingCardioDuration, setEditingCardioDuration] = useState(null) // { exId, idx }
  const sensors = useSensors(
    useSensor(TouchSensor, { activationConstraint: { delay: 100, tolerance: 6 } }),
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  useEffect(() => {
    if (!searchQuery) {
      setDebouncedSearchQuery('')
      return undefined
    }

    const timer = setTimeout(() => setDebouncedSearchQuery(searchQuery), 150)
    return () => clearTimeout(timer)
  }, [searchQuery])
  const [userBodyweightKg, setUserBodyweightKg] = useState(null)
  const [userGender, setUserGender] = useState('male')
  const [prevSetsMap, setPrevSetsMap] = useState({})
  const [recentSessionsMap, setRecentSessionsMap] = useState({})
  const [historyStatusMap, setHistoryStatusMap] = useState({})
  const [plateCalc, setPlateCalc] = useState(null) // { exId, setIndex } | null
  const [defaultUnit, setDefaultUnit] = useState('lbs')
  const workoutStartRef = useRef(null) // absolute timestamp when workout started
  const startTemplateRef = useRef(null)
  const pendingPlanStartRef = useRef(null) // { plan, day, routine, unlockProgression }
  const {
    swipeState,
    handleTouchStart: handleSetTouchStart,
    handleTouchMove: handleSetTouchMove,
    handleTouchEnd: handleSetTouchEnd,
    handleTouchCancel: handleSetTouchCancel,
  } = useSetSwipe({ onDelete: handleSwipeSetDelete })
  const {
    templateSwipeState,
    handleTouchStart: handleTemplateTouchStart,
    handleTouchMove: handleTemplateTouchMove,
    handleTouchEnd: handleTemplateTouchEnd,
    handleTouchCancel: handleTemplateTouchCancel,
  } = useTemplateSwipe()
  const [exerciseNotes, setExerciseNotes] = useState({}) // { [exId]: string }
  const [notesOpen, setNotesOpen] = useState({}) // { [exId]: bool }
  const [battleEvents, setBattleEvents] = useState([])
  const [battleProjection, setBattleProjection] = useState(null)
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
  const [dragHintKey, setDragHintKey] = useState(null)
  const battleModeActive = Boolean(battleRoom?.id) && completedBattleRoomRef.current !== battleRoom.id
  const getBattleWorkoutStartedAt = useCallback((fallback = Date.now()) => {
    const startedAt = Date.parse(battleRoom?.created_at || '')
    return Number.isFinite(startedAt) ? startedAt : fallback
  }, [battleRoom?.created_at])
  const surfacedRemoteFinishEventIdsRef = useRef(new Set())
  const prefetchedHistoryRef = useRef({}) // { [exerciseId]: { sid, sessions, status } }
  const prefetchInFlightRef = useRef({})  // { [exerciseId]: Promise }
  const historyRequestedRef = useRef(new Set()) // Set<"sessionId:exerciseId"> — guards lazy load
  const activeHistorySessionRef = useRef(null)
  activeHistorySessionRef.current = sessionId ?? null

  // Routine builder state
  const [userRoutines, setUserRoutines] = useState([])
  const [hiddenTemplates, setHiddenTemplates] = useState(() => {
    try { return sanitizeHiddenTemplateIds(JSON.parse(localStorage.getItem('hiddenTemplates') || '[]'), TEMPLATES.map(t => t.id)) } catch { return [] }
  })
  const [showRoutineBuilder, setShowRoutineBuilder] = useState(false)
  const [routineName, setRoutineName] = useState('')
  const [routineDesc, setRoutineDesc] = useState('')
  const [routineExercises, setRoutineExercises] = useState([]) // [{ name, sets }]
  const [routineError, setRoutineError] = useState('')
  const [editingRoutineId, setEditingRoutineId] = useState(null)
  const [savingRoutine, setSavingRoutine] = useState(false)
  const [pickerContext, setPickerContext] = useState('workout') // 'workout' | 'routine'
  const [userTrainingPlans, setUserTrainingPlans] = useState([])
  const [planProgressMap, setPlanProgressMap] = useState({})
  const [planAdGate, setPlanAdGate] = useState(null)
  const [planAdGateCountdown, setPlanAdGateCountdown] = useState(null)
  const [planAdGateLoading, setPlanAdGateLoading] = useState(false)
  const [showPlanPaywall, setShowPlanPaywall] = useState(false)
  const [planAdaptations, setPlanAdaptations] = useState([])
  const [applyingAdaptationId, setApplyingAdaptationId] = useState(null)
  const [viewingTrainingPlanId, setViewingTrainingPlanId] = useState(null)
  const [showPlanBuilder, setShowPlanBuilder] = useState(false)
  const [planInfoModal, setPlanInfoModal] = useState(null)
  const [planBuilderStep, setPlanBuilderStep] = useState(0)
  const [planForm, setPlanForm] = useState(DEFAULT_TRAINING_PLAN_FORM)
  const [generatedPlan, setGeneratedPlan] = useState(null)
  const [editingPlanId, setEditingPlanId] = useState(null)
  const [planError, setPlanError] = useState('')
  const [savingPlan, setSavingPlan] = useState(false)
  const [savingPlanPreferenceId, setSavingPlanPreferenceId] = useState(null)
  const [planReplacement, setPlanReplacement] = useState(null) // { planId, dayId, exerciseIndex }
  const [planReplacementSearch, setPlanReplacementSearch] = useState('')
  const [selectedPlanReplacement, setSelectedPlanReplacement] = useState(null) // { exercise, source, reason, warning }
  const [savingPlanReplacement, setSavingPlanReplacement] = useState(false)
  const [planReplacementWarning, setPlanReplacementWarning] = useState(null)
  const [suggestionFlashKey, setSuggestionFlashKey] = useState(null)
  const [appliedSuggestionMap, setAppliedSuggestionMap] = useState({})
  const [progressionUnlocked, setProgressionUnlocked] = useState(() => {
    if (isPremiumSync()) return true
    try { return localStorage.getItem('liftlog:progression-unlocked') === '1' } catch { return false }
  })
  const [progressionAdGate, setProgressionAdGate] = useState(false)
  const [progressionAdGateLoading, setProgressionAdGateLoading] = useState(false)
  const [showProgressionPaywall, setShowProgressionPaywall] = useState(false)
  const [planStartLoading, setPlanStartLoading] = useState(false)
  const [startingPlanDayKey, setStartingPlanDayKey] = useState(null)
  const [customIncrements, setCustomIncrements] = useState(() => getCustomIncrements())
  const [startingWeights, setStartingWeights] = useState(() => getCustomStartingWeights())
  const [openSetType, setOpenSetType] = useState(null) // { key, exId, setIdx }
  const [openSupersetMenu, setOpenSupersetMenu] = useState(null) // { exId }
  const [workoutDrag, setWorkoutDrag] = useState(null) // { activeId, groupId, delta }
  const recordCurrentBattleResultLatest = useEffectEvent(() => recordCurrentBattleResultIfReady())

  useEffect(() => {
    if (!openSetType) return
    const close = (e) => { if (!e.target.closest('.set-type-wrap') && !e.target.closest('.set-type-dropdown')) setOpenSetType(null) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [openSetType])
  useEffect(() => {
    if (!openSupersetMenu) return
    const close = (e) => {
      if (!e.target.closest('.superset-action-wrap') && !e.target.closest('.superset-menu')) {
        setOpenSupersetMenu(null)
      }
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [openSupersetMenu])

  const clearAppliedSuggestion = useCallback((exerciseId = null) => {
    if (!exerciseId) {
      setAppliedSuggestionMap({})
      return
    }
    setAppliedSuggestionMap(prev => {
      if (!(exerciseId in prev)) return prev
      const next = { ...prev }
      delete next[exerciseId]
      return next
    })
  }, [])
  const viewingTrainingPlan = useMemo(
    () => userTrainingPlans.find(plan => plan.id === viewingTrainingPlanId) || null,
    [userTrainingPlans, viewingTrainingPlanId]
  )

  useLayoutEffect(() => {
    if (!userId) {
      setSavedWorkoutDraft(null)
      setExpiredWorkoutDraftSessionId(null)
      return
    }

    const soloDraftState = readStoredWorkoutDraft(userId)
    setSavedWorkoutDraft(soloDraftState.draft)
    setExpiredWorkoutDraftSessionId(soloDraftState.expiredSessionId)
  }, [userId])

  const loadPlanAdaptations = useCallback(async (uid) => {
    if (!uid) return
    const { data, error } = await supabase
      .from('user_training_plan_adaptations')
      .select('id, plan_id, plan_day_id, summary, body, created_at, status, adjustments')
      .eq('user_id', uid)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (error) {
      if (!isMissingPlanPersistence(error)) setPlanError(friendlyError(error, 'Could not load plan coaching.'))
      return
    }

    setPlanAdaptations(data || [])
  }, [])

  useEffect(() => {
    if (!userId) return undefined

    let cancelled = false
    const init = async () => {
      setLoading(true)
      try {
        const [exercises, { data: prof }, { data: routines }, plansResponse, { data: restPrefs }] = await Promise.all([
          fetchExercises(userId),
          supabase.from('profiles').select('default_rest_seconds, unit_preference, bodyweight, gender').eq('id', userId).single(),
          supabase.from('user_routines').select('id, name, description, exercises, created_at').eq('user_id', userId).order('created_at', { ascending: false }),
          supabase.from('user_training_plans').select('id, name, goal, days, duration_weeks, days_per_week, session_minutes, equipment, created_at').eq('user_id', userId).order('created_at', { ascending: false }),
          supabase.from('user_exercise_preferences').select('exercise_id, rest_seconds').eq('user_id', userId),
        ])
        if (cancelled) return
        const prefMap = new Map((restPrefs || []).map(p => [p.exercise_id, p.rest_seconds]))
        const libraryWithPrefs = (exercises || []).map(ex =>
          prefMap.has(ex.id) ? { ...ex, default_rest_seconds: prefMap.get(ex.id) } : ex
        )
        setExerciseLibrary(libraryWithPrefs)
        setDefaultRest(prof?.default_rest_seconds ?? 90)
        setDefaultUnit(prof?.unit_preference || 'lbs')
        setUserBodyweightKg(getProfileBodyweightKg(prof))
        setUserGender(prof?.gender || 'male')
        setUserRoutines(routines || [])
        if (plansResponse.error) {
          const message = plansResponse.error.message?.toLowerCase?.() || ''
          if (!message.includes('user_training_plans')) throw plansResponse.error
          setUserTrainingPlans([])
        } else {
          const normalizedPlans = (plansResponse.data || []).map(normalizeTrainingPlan).filter(Boolean)
          setUserTrainingPlans(normalizedPlans)
          loadPlanProgress(userId, normalizedPlans)
        }
        loadPlanAdaptations(userId)
        const soloDraftState = readStoredWorkoutDraft(userId)
        setSavedWorkoutDraft(soloDraftState.draft)
        setExpiredWorkoutDraftSessionId(soloDraftState.expiredSessionId)
      } catch (err) {
        if (!cancelled) {
          setBattleSyncError(friendlyError(err, 'Could not load your workout setup.'))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    init()
    return () => {
      cancelled = true
    }
  }, [loadPlanAdaptations, userId])

  useEffect(() => {
    if (!battleNotice) return undefined
    const timer = setTimeout(() => setBattleNotice(''), 2200)
    return () => clearTimeout(timer)
  }, [battleNotice])

  useEffect(() => {
    if (!userId || weightRefreshTick === 0) return
    let cancelled = false
    ;(async () => {
      const { data: prof } = await supabase
        .from('profiles')
        .select('bodyweight, unit_preference')
        .eq('id', userId)
        .single()
      if (cancelled) return
      setUserBodyweightKg(getProfileBodyweightKg(prof))
    })()
    return () => { cancelled = true }
  }, [userId, weightRefreshTick])

  useEffect(() => {
    if (!userId || profileRefreshTick === 0) return
    let cancelled = false
    ;(async () => {
      const { data: prof } = await supabase
        .from('profiles')
        .select('default_rest_seconds, unit_preference, bodyweight, gender')
        .eq('id', userId)
        .single()
      if (cancelled || !prof) return
      setDefaultRest(prof.default_rest_seconds ?? 90)
      setDefaultUnit(prof.unit_preference || 'lbs')
      setUserBodyweightKg(getProfileBodyweightKg(prof))
      setUserGender(prof.gender || 'male')
    })()
    return () => { cancelled = true }
  }, [userId, profileRefreshTick])

  useEffect(() => {
    if (isPremium) setProgressionUnlocked(true)
  }, [isPremium])

  const showPlanPaywallAfterRender = useCallback(() => {
    const scrollWorkoutToTop = () => {
      document.querySelector('.content')?.scrollTo({ top: 0, left: 0, behavior: 'auto' })
      window.scrollTo?.({ top: 0, left: 0, behavior: 'auto' })
    }
    const show = () => {
      scrollWorkoutToTop()
      setShowPlanPaywall(true)
    }
    if (typeof requestAnimationFrame !== 'function') {
      setTimeout(() => {
        scrollWorkoutToTop()
        setTimeout(show, 0)
      }, 0)
      return
    }
    requestAnimationFrame(() => {
      scrollWorkoutToTop()
      requestAnimationFrame(show)
    })
  }, [])

  const triggerPlanAd = useCallback(() => {
    if (!planAdGate) return
    const { plan, day, routine } = planAdGate
    setPlanAdGate(null)
    setPlanAdGateCountdown(null)
    setPlanAdGateLoading(true)
    let interrupted = document.visibilityState === 'hidden'
    const onVisibilityChange = () => { if (document.visibilityState === 'hidden') interrupted = true }
    document.addEventListener('visibilitychange', onVisibilityChange)
    showWorkoutCompleteAd().finally(() => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      setPlanAdGateLoading(false)
      pendingPlanStartRef.current = { plan, day, routine, unlockProgression: !interrupted }
      showPlanPaywallAfterRender()
    })
  }, [planAdGate, showPlanPaywallAfterRender])

  useEffect(() => {
    if (planAdGateCountdown === null) return undefined
    if (planAdGateCountdown <= 0) { triggerPlanAd(); return undefined }
    const timer = setTimeout(() => setPlanAdGateCountdown(prev => prev !== null ? prev - 1 : null), 1000)
    return () => clearTimeout(timer)
  }, [planAdGateCountdown, triggerPlanAd])

  const clearWorkoutDraft = useCallback(() => {
    if (!userId) return
    latestWorkoutDraftRef.current = null
    clearStoredWorkoutDraft(userId)
    setSavedWorkoutDraft(null)
  }, [userId])

  const flushWorkoutDraft = useCallback(() => {
    if (!userId) return
    const draft = latestWorkoutDraftRef.current
    if (!draft) return
    writeStoredWorkoutDraft(userId, { ...draft, savedAt: Date.now() })
  }, [userId])

  const clearBattleWorkoutDraft = useCallback(() => {
    if (!userId || !battleRoom?.id) return
    latestBattleWorkoutDraftRef.current = null
    clearStoredWorkoutDraft(userId, battleRoom.id)
    setSavedBattleWorkoutDraft(null)
  }, [battleRoom?.id, userId])

  const flushBattleWorkoutDraft = useCallback(() => {
    if (!userId || !battleRoom?.id) return
    const draft = latestBattleWorkoutDraftRef.current
    if (!draft) return
    writeStoredWorkoutDraft(userId, { ...draft, savedAt: Date.now() }, battleRoom.id)
  }, [battleRoom?.id, userId])

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
    const isBattle = battleModeActive && !!battleRoom?.id

    if (!userId || !activeWorkout || !sessionId || (battleModeActive && !battleRoom?.id)) {
      latestWorkoutDraftRef.current = null
      latestBattleWorkoutDraftRef.current = null
      return undefined
    }

    const startedAt = isBattle
      ? getBattleWorkoutStartedAt(workoutStartRef.current || Date.now())
      : workoutStartRef.current || Date.now()
    workoutStartRef.current = startedAt

    const draft = {
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
      ...(isBattle ? { roomId: battleRoom.id } : {}),
    }

    if (isBattle) {
      latestBattleWorkoutDraftRef.current = draft
      latestWorkoutDraftRef.current = null
    } else {
      latestWorkoutDraftRef.current = draft
      latestBattleWorkoutDraftRef.current = null
    }

    const timer = setTimeout(() => isBattle ? flushBattleWorkoutDraft() : flushWorkoutDraft(), 160)
    return () => clearTimeout(timer)
  }, [
    activeWorkout,
    battleModeActive,
    battleRoom?.id,
    defaultRest,
    defaultUnit,
    exerciseNotes,
    flushBattleWorkoutDraft,
    flushWorkoutDraft,
    getBattleWorkoutStartedAt,
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
          await recordCurrentBattleResultLatest()
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
    if (!userId) return false

    setBattleStarting(true)
    setBattleSyncError('')

    // For non-battle starts, optimistically transition to the active workout view
    // immediately so the UI feels instant. The DB insert completes in the background.
    // Battle starts are excluded because they show a lobby loader and need the
    // session to exist before announcing workout_started to the opponent.
    const optimistic = !isBattleStart
    if (optimistic) {
      workoutStartRef.current = Date.now()
      setActiveWorkout(true)
    }

    try {
      // userId comes from the shared authenticated-user context.
      // defaultUnit is already in state from the same profile query in init.
      // No need to call getUser() or re-fetch the profile here.
      const { data: sess, error: sessionError } = await supabase
        .from('workout_sessions')
        .insert({ user_id: userId })
        .select('id')
        .single()

      if (sessionError) throw sessionError
      if (!sess) throw new Error('Could not create your workout session.')

      if (!optimistic) {
        workoutStartRef.current = battleModeActive
          ? getBattleWorkoutStartedAt()
          : Date.now()
        setSeconds(Math.max(0, Math.floor((Date.now() - workoutStartRef.current) / 1000)))
        setActiveWorkout(true)
      }

      clearAppliedSuggestion()
      setSessionId(sess.id)
      Sentry.addBreadcrumb({ category: 'workout', message: 'Workout started', data: { sessionId: sess.id }, level: 'info' })
      writeStoredWorkoutDraft(userId, {
        version: WORKOUT_DRAFT_VERSION,
        savedAt: Date.now(),
        sessionId: sess.id,
        startedAt: workoutStartRef.current,
        workoutExercises: [],
        exerciseNotes: {},
        notesOpen: {},
        restTimer: null,
        defaultUnit,
        defaultRest,
      }, battleModeActive ? battleRoom?.id : null)

      if (battleModeActive && isBattleStart) {
        try {
          await publishBattleEvent('workout_started', {})
        } catch (err) {
          setBattleSyncError(friendlyError(err, 'Could not announce your battle workout start.'))
        }
      }

      return true
    } catch (err) {
      if (optimistic) {
        setActiveWorkout(false)
        workoutStartRef.current = null
        setSeconds(0)
      }
      setBattleSyncError(friendlyError(err, 'Could not start your workout.'))
      return false
    } finally {
      setBattleStarting(false)
    }
  }

  const triggerProgressionAd = useCallback(() => {
    setProgressionAdGate(false)
    setProgressionAdGateLoading(true)
    showWorkoutCompleteAd().finally(async () => {
      setProgressionAdGateLoading(false)
      // Check current visibility, not historical: clicking an ad banner also sends the app
      // to background (opening browser/store), so "was ever hidden" wrongly blocks those users.
      // By the time Dismissed fires the user is back in the app and visibilityState is visible.
      if (document.visibilityState === 'hidden') {
        setShowProgressionPaywall(true)
        return
      }
      setProgressionUnlocked(true)
      try { localStorage.setItem('liftlog:progression-unlocked', '1') } catch { /* storage may be unavailable */ }
      performStartWorkout()
    })
  }, [performStartWorkout]) // eslint-disable-line react-hooks/exhaustive-deps

  const skipProgressionGate = useCallback(() => {
    setProgressionAdGate(false)
    performStartWorkout()
  }, [performStartWorkout]) // eslint-disable-line react-hooks/exhaustive-deps

  const bodyweightGateBusyRef = useRef(false)
  const gateOnBodyweight = useCallback((action) => {
    if (userBodyweightKg != null) {
      action()
      return
    }
    if (bodyweightGateBusyRef.current) return
    if (!userId) {
      setBodyweightWarning({ run: action })
      return
    }
    bodyweightGateBusyRef.current = true
    ;(async () => {
      let resolvedBw = null
      try {
        const { data: prof } = await supabase
          .from('profiles')
          .select('bodyweight, unit_preference')
          .eq('id', userId)
          .single()
        resolvedBw = getProfileBodyweightKg(prof)
      } catch {
        // network/RLS failure — fall through to warning modal
      } finally {
        bodyweightGateBusyRef.current = false
      }
      if (resolvedBw != null) {
        setUserBodyweightKg(resolvedBw)
        action()
      } else {
        setBodyweightWarning({ run: action })
      }
    })()
  }, [userBodyweightKg, userId])

  const handleEmptyWorkoutStart = useCallback(() => {
    gateOnBodyweight(() => {
      if (isPremiumSync()) {
        setProgressionUnlocked(true)
        performStartWorkout()
        return
      }
      setProgressionAdGate(true)
    })
  }, [gateOnBodyweight, performStartWorkout])

  async function publishBattleEvent(eventType, payload = {}) {
    if (!battleRoom?.id || !userId) return
    await publishWorkoutRoomEvent(battleRoom.id, userId, eventType, payload)
  }

  async function loadCurrentBattleRecap() {
    if (!battleRoom?.id || !userId) return null
    return loadBattleRecap(battleRoom.id, userId)
  }

  async function recordCurrentBattleResultIfReady(recap = null) {
    const battle = recap || await loadCurrentBattleRecap()
    if (!battle || battle.status === 'waiting') return { battle, finalized: false }
    await recordBattleResultAtomic(battle)
    return { battle, finalized: true }
  }

  const refreshBattleProjection = useCallback(async () => {
    if (!battleRoom?.id || !userId) {
      setBattleProjection(null)
      return null
    }

    try {
      const projection = await loadBattleRecap(battleRoom.id, userId)
      setBattleProjection(projection)
      return projection
    } catch {
      return null
    }
  }, [battleRoom?.id, userId])

  const startBattleWorkout = useEffectEvent(() => {
    performStartWorkout({ isBattleStart: true })
  })

  const loadUserRoutines = async (uid) => {
    const { data, error } = await supabase.from('user_routines').select('id, name, description, exercises, created_at').eq('user_id', uid).order('created_at', { ascending: false })
    if (error) throw error
    if (data) setUserRoutines(data)
    return true
  }

  const loadUserTrainingPlans = async (uid) => {
    const { data, error } = await supabase.from('user_training_plans').select('id, name, goal, days, duration_weeks, days_per_week, session_minutes, equipment, created_at').eq('user_id', uid).order('created_at', { ascending: false })
    if (error) {
      const message = error.message?.toLowerCase?.() || ''
      if (!message.includes('user_training_plans')) setPlanError(friendlyError(error, 'Could not load your plans.'))
      return false
    }
    const normalized = (data || []).map(normalizeTrainingPlan).filter(Boolean)
    setUserTrainingPlans(normalized)
    loadPlanProgress(uid, normalized)
    return true
  }

  const loadPlanProgress = async (uid, plans) => {
    if (!uid || !plans.length) return
    const planIds = plans.map(p => p.id)
    const { data } = await supabase
      .from('workout_sessions')
      .select('source_plan_id, source_plan_day_id, source_plan_week, finished_at')
      .eq('user_id', uid)
      .in('source_plan_id', planIds)
      .not('finished_at', 'is', null)
      .order('finished_at', { ascending: false })
    if (!data) return
    const map = {}
    for (const plan of plans) {
      const sessions = data.filter(s => s.source_plan_id === plan.id)
      const currentWeek = getActivePlanWeek(plan, new Date())
      const lastSession = sessions[0]
      const lastIdx = lastSession ? plan.days.findIndex(d => d.id === lastSession.source_plan_day_id) : -1
      const nextIdx = lastIdx === -1 ? 0 : (lastIdx + 1) % plan.days.length
      map[plan.id] = {
        nextDay: plan.days[nextIdx],
        thisWeekDoneIds: new Set(
          sessions.filter(s => s.source_plan_week === currentWeek).map(s => s.source_plan_day_id)
        ),
      }
    }
    setPlanProgressMap(map)
  }

  const loadRecentExerciseHistory = useCallback(async (exercisesToAnalyze, uid, sid) => {
    const validExercises = exercisesToAnalyze.filter(ex => ex?.id)
    if (!validExercises.length || !uid) return
    const requestSessionId = sid ?? null
    const isCurrentHistoryRequest = () => activeHistorySessionRef.current === requestSessionId
    const validStatuses = new Set(['loaded', 'empty'])

    setHistoryStatusMap(prev => {
      const next = { ...prev }
      for (const ex of validExercises) {
        next[ex.id] = 'loading'
      }
      return next
    })

    // If any exercises were pre-fetched while the user was selecting in the picker,
    // wait for those in-flight requests to settle before deciding what still needs fetching.
    const inFlight = validExercises
      .map(ex => prefetchInFlightRef.current[ex.id])
      .filter(Boolean)
    if (inFlight.length > 0) await Promise.allSettled(inFlight)
    if (!isCurrentHistoryRequest()) return

    // Only fetch exercises whose pre-fetched data was obtained with a different session
    // exclusion (or was never pre-fetched at all).
    const needsFetch = validExercises.filter(ex => {
      const cached = prefetchedHistoryRef.current[ex.id]
      return !cached || cached.sid !== sid || !validStatuses.has(cached.status)
    })

    let fetchedByExercise = {}
    let fetchedStatusByExercise = {}
    if (needsFetch.length > 0) {
      const result = await fetchRecentSessionsWithStatus(uid, needsFetch.map(ex => ex.id), supabase, sid)
      fetchedByExercise = result.sessionsByExercise || {}
      fetchedStatusByExercise = result.statusByExercise || {}
    }
    if (!isCurrentHistoryRequest()) return

    const prevSetUpdates = {}
    const recentSessionUpdates = {}
    const statusUpdates = {}
    for (const ex of validExercises) {
      const cached = prefetchedHistoryRef.current[ex.id]
      const usingCache = cached?.sid === sid && validStatuses.has(cached.status)
      const status = usingCache
        ? cached.status
        : (fetchedStatusByExercise[ex.id] || 'error')
      statusUpdates[ex.id] = status

      if (status === 'error') continue

      const exerciseSessions = usingCache
        ? cached.sessions
        : (fetchedByExercise[ex.id] || [])
      recentSessionUpdates[ex.id] = exerciseSessions
      prevSetUpdates[ex.id] = buildPreviousSetValuesByWorkingIndex(exerciseSessions)
    }

    if (Object.keys(prevSetUpdates).length > 0) {
      setPrevSetsMap(prev => ({ ...prev, ...prevSetUpdates }))
    }
    if (Object.keys(recentSessionUpdates).length > 0) {
      setRecentSessionsMap(prev => ({ ...prev, ...recentSessionUpdates }))
    }
    setHistoryStatusMap(prev => ({ ...prev, ...statusUpdates }))
  }, [])

  const retryExerciseHistory = useCallback((exercise) => {
    if (!exercise?.id || !userId || !sessionId) return
    delete prefetchedHistoryRef.current[exercise.id]
    delete prefetchInFlightRef.current[exercise.id]
    historyRequestedRef.current.delete(`${sessionId}:${exercise.id}`)
    loadRecentExerciseHistory([exercise], userId, sessionId)
  }, [loadRecentExerciseHistory, sessionId, userId])

  const renderHistoryRetryIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12a9 9 0 0 1-15.5 6.3L3 16" />
      <path d="M3 16v5h5" />
      <path d="M3 12A9 9 0 0 1 18.5 5.7L21 8" />
      <path d="M21 8V3h-5" />
    </svg>
  )

  const clearProgressionHistoryForExercises = useCallback((exercisesToAnalyze = []) => {
    const exerciseIds = new Set(exercisesToAnalyze.map(ex => ex?.id).filter(Boolean))
    historyRequestedRef.current.clear()

    if (!exerciseIds.size) {
      setPrevSetsMap({})
      setRecentSessionsMap({})
      setHistoryStatusMap({})
      return
    }

    for (const id of exerciseIds) {
      delete prefetchedHistoryRef.current[id]
    }

    setPrevSetsMap(prev => {
      let changed = false
      const next = { ...prev }
      for (const id of exerciseIds) {
        if (id in next) {
          delete next[id]
          changed = true
        }
      }
      return changed ? next : prev
    })
    setRecentSessionsMap(prev => {
      let changed = false
      const next = { ...prev }
      for (const id of exerciseIds) {
        if (id in next) {
          delete next[id]
          changed = true
        }
      }
      return changed ? next : prev
    })
    setHistoryStatusMap(prev => {
      let changed = false
      const next = { ...prev }
      for (const id of exerciseIds) {
        if (id in next) {
          delete next[id]
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [])

  const refreshWorkoutHistoryCaches = useEffectEvent(() => {
    clearProgressionHistoryForExercises(workoutExercises)
    if (activeWorkout && userId && sessionId && workoutExercises.length > 0) {
      loadRecentExerciseHistory(workoutExercises, userId, sessionId)
    }
    if (userId && userTrainingPlans.length > 0) {
      loadPlanProgress(userId, userTrainingPlans)
    }
    if (userId) {
      loadPlanAdaptations(userId)
    }
  })

  useEffect(() => {
    if (workoutHistoryRefreshTick === 0) return
    refreshWorkoutHistoryCaches()
  }, [workoutHistoryRefreshTick])

  const progressionMap = useMemo(() => {
    const nextMap = {}

    workoutExercises.forEach((exercise, exerciseIndex) => {
      if (exercise.category === 'Cardio') return

      const priorExercises = workoutExercises
        .slice(0, exerciseIndex)
        .reverse()
        .map(ex => ({
          doneSets: ex.sets
            .filter(s => s.done)
            .map(s => ({ weight: Number(s.weight) || 0, reps: Number(s.reps) || 0, setType: s.setType ?? 'normal' })),
          primaryMuscles: ex.primary_muscles || [],
          secondaryMuscles: ex.secondary_muscles || [],
        }))

      const suggestionInput = {
        sessions: recentSessionsMap[exercise.id] || [],
        currentSets: exercise.sets,
        equipment: exercise.equipment,
        unitPreference: exercise.unit || defaultUnit,
        planTargetReps: exercise.planTargetReps,
        planRepRange: exercise.planRepRange,
        exerciseName: exercise.name,
        userBodyweightKg,
        userGender,
        priorExercises,
        currentPrimaryMuscles: exercise.primary_muscles || [],
        currentSecondaryMuscles: exercise.secondary_muscles || [],
        customIncrementKg: customIncrements[exercise.id] ?? null,
        customStartingWeightKg: startingWeights[exercise.id] ?? null,
        planPeriodizationStyle: exercise.planPeriodizationStyle,
        planIntensityTag: exercise.planIntensityTag,
        planProgressionBias: exercise.planProgressionBias,
        bilateral: exercise.bilateral ?? (exercise.equipment === 'Dumbbell'),
      }

      const exerciseSnapWeight = buildExerciseSnapWeight(
        exercise.equipment,
        exercise.unit || defaultUnit,
        customIncrements[exercise.id] ?? null,
        startingWeights[exercise.id] ?? null,
        exercise.bilateral ?? (exercise.equipment === 'Dumbbell')
      )
      const rawSuggestion = buildCurrentSetSuggestion(suggestionInput)
      let suggestion = applyScheduledDeloadToSuggestion(rawSuggestion, exercise, exerciseSnapWeight)

      if (suggestion && exercise.equipment === 'Bodyweight' && !exercise.planDeloadWeek) {
        const repsSuggestion = buildCurrentSetSuggestion({
          ...suggestionInput,
          bodyweightProgressionMode: 'reps',
        })
        const loadSuggestion = buildCurrentSetSuggestion({
          ...suggestionInput,
          bodyweightProgressionMode: 'load',
        })

        if (repsSuggestion && loadSuggestion) {
          const equivalentRepsSuggestion = buildEquivalentBodyweightRepsSuggestion(
            repsSuggestion,
            loadSuggestion,
            userBodyweightKg,
          )
          suggestion = {
            ...suggestion,
            bodyweightAlternates: {
              reps: equivalentRepsSuggestion,
              load: loadSuggestion,
            },
          }
        }
      }

      if (suggestion) {
        nextMap[exercise.id] = suggestion
      }
    })

    return nextMap
  }, [defaultUnit, recentSessionsMap, workoutExercises, customIncrements, startingWeights, userBodyweightKg, userGender])

  // Pre-fill blank first sets from previous session when prevSetsMap loads
  useEffect(() => {
    if (!Object.keys(prevSetsMap).length) return
    setWorkoutExercises(prev => prev.map(ex => {
      const prevSet = prevSetsMap[ex.id]?.[0]
      if (!prevSet) return ex
      if (ex.planSource === 'training_plan') return ex
      const first = ex.sets[0]
      if (first.weight !== '' || first.reps !== '') return ex // user already entered data
      const weight = prevSet.unit === ex.unit
        ? prevSet.weight
        : prevSet.unit === 'lbs'
          ? Math.round(prevSet.weight * 0.453592 * 10) / 10
          : Math.round(prevSet.weight * 2.20462 * 10) / 10
      return {
        ...ex,
        sets: ex.sets.map((s, i) => i === 0
          ? { ...s, weight: String(weight), reps: String(prevSet.reps), ...(prevSet.setType === 'warmup' ? { setType: 'warmup' } : {}) }
          : s),
      }
    }))
  }, [prevSetsMap])


  // Trigger from quick-action sheet: start an empty workout if none is active
  useEffect(() => {
    if (startEmptyWorkoutTick === 0) return
    if (!activeWorkout && !sessionId) handleEmptyWorkoutStart()
  }, [startEmptyWorkoutTick]) // eslint-disable-line react-hooks/exhaustive-deps

  // Workout timer — uses absolute start time so backgrounding doesn't desync
  useEffect(() => {
    if (!activeWorkout) return
    document.querySelector('.content')?.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    window.scrollTo?.({ top: 0, left: 0, behavior: 'auto' })
  }, [activeWorkout])

  useEffect(() => {
    if (!activeWorkout) { setSeconds(0); workoutStartRef.current = null; return }
    if (!workoutStartRef.current) {
      workoutStartRef.current = battleModeActive ? getBattleWorkoutStartedAt() : Date.now()
    }
    const interval = setInterval(() => {
      setSeconds(Math.floor((Date.now() - workoutStartRef.current) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [activeWorkout, battleModeActive, getBattleWorkoutStartedAt])

  useEffect(() => {
    if (!activeWorkout || !userId || !sessionId) return
    const unfetched = []
    for (const ex of workoutExercises) {
      if (!ex?.id) continue
      const key = `${sessionId}:${ex.id}`
      if (historyRequestedRef.current.has(key)) continue
      historyRequestedRef.current.add(key)
      unfetched.push(ex)
    }
    if (unfetched.length > 0) loadRecentExerciseHistory(unfetched, userId, sessionId)
  }, [workoutExercises, sessionId, userId, activeWorkout, loadRecentExerciseHistory])

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
        refreshBattleProjection()
      } catch (err) {
        if (mounted) setBattleSyncError(friendlyError(err, 'Could not sync your battle feed.'))
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
          refreshBattleProjection()
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
            refreshBattleProjection()
            onBattleRoomClosed?.(payload.new.status)
          }
        }
      )
      .subscribe()

    return () => {
      mounted = false
      supabase.removeChannel(channel)
    }
  }, [battleRoom, onBattleRoomClosed, refreshBattleProjection, userId])

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
      setBattleProjection(null)
    }
  }, [battleRoom?.id])

  const resumeSavedBattleWorkout = useCallback(async () => {
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
        .select('id, finished_at')
        .eq('id', savedBattleWorkoutDraft.sessionId)
        .eq('user_id', userId)
        .maybeSingle()

      if (error || !sessionRow) {
        clearBattleWorkoutDraft()
        setBattleSyncError('Your shared workout could not be resumed.')
        return
      }
      if (sessionRow.finished_at) {
        clearBattleWorkoutDraft()
        setBattleSyncError('That workout was already saved. Your local resume copy was cleared.')
        return
      }

      const restoredStartedAt = getBattleWorkoutStartedAt(savedBattleWorkoutDraft.startedAt || Date.now())
      const restoredExercises = Array.isArray(savedBattleWorkoutDraft.workoutExercises)
        ? normalizeWorkoutExercises(savedBattleWorkoutDraft.workoutExercises)
        : []
      const restoredRestTimer = savedBattleWorkoutDraft.restTimer && getRemainingRestSeconds(savedBattleWorkoutDraft.restTimer) > 0
        ? savedBattleWorkoutDraft.restTimer
        : null

      clearProgressionHistoryForExercises(restoredExercises)
      clearAppliedSuggestion()
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

    } finally {
      setBattleDraftBusy(false)
    }
  }, [
    activeWorkout,
    battleDraftBusy,
    battleDraftReady,
    battleModeActive,
    battleRoom?.id,
    clearAppliedSuggestion,
    clearBattleWorkoutDraft,
    clearProgressionHistoryForExercises,
    defaultRest,
    defaultUnit,
    getBattleWorkoutStartedAt,
    loading,
    savedBattleWorkoutDraft,
    setRestTimer,
    sessionId,
    userId,
  ])

  const resumeSavedWorkout = useCallback(async () => {
    if (!savedWorkoutDraft || !userId || savedWorkoutDraftBusy) return

    setSavedWorkoutDraftBusy(true)
    try {
      const { data: sessionRow, error } = await supabase
        .from('workout_sessions')
        .select('id, finished_at')
        .eq('id', savedWorkoutDraft.sessionId)
        .eq('user_id', userId)
        .maybeSingle()

      if (error || !sessionRow) {
        clearWorkoutDraft()
        setBattleSyncError('Your saved workout could not be resumed.')
        return
      }
      if (sessionRow.finished_at) {
        clearWorkoutDraft()
        setBattleSyncError('That workout was already saved. Your local resume copy was cleared.')
        return
      }

      const restoredStartedAt = savedWorkoutDraft.startedAt || Date.now()
      const restoredExercises = Array.isArray(savedWorkoutDraft.workoutExercises)
        ? normalizeWorkoutExercises(savedWorkoutDraft.workoutExercises)
        : []
      const restoredRestTimer = savedWorkoutDraft.restTimer && getRemainingRestSeconds(savedWorkoutDraft.restTimer) > 0
        ? savedWorkoutDraft.restTimer
        : null

      clearProgressionHistoryForExercises(restoredExercises)
      clearAppliedSuggestion()
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

    } finally {
      setSavedWorkoutDraftBusy(false)
    }
  }, [
    clearAppliedSuggestion,
    clearProgressionHistoryForExercises,
    clearWorkoutDraft,
    defaultRest,
    defaultUnit,
    savedWorkoutDraft,
    savedWorkoutDraftBusy,
    setRestTimer,
    userId,
  ])

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
    resumeSavedWorkout,
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

  const showDragHint = (key) => setDragHintKey(key)

  useEffect(() => {
    if (!dragHintKey) return
    const dismiss = () => setDragHintKey(null)
    document.addEventListener('pointerdown', dismiss, { capture: true })
    return () => document.removeEventListener('pointerdown', dismiss, { capture: true })
  }, [dragHintKey])

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
        const { finalized } = await recordCurrentBattleResultIfReady()
        if (finalized) onBattleRoomClosed?.('cancelled')
        else onBattleRoomClosed?.('left')
      } catch (err) {
        setBattleSyncError(friendlyError(err, 'Could not update your battle room.'))
      }
    }
    setActiveWorkout(false)
    setProgressionUnlocked(isPremiumSync())
    try { localStorage.removeItem('liftlog:progression-unlocked') } catch { /* storage may be unavailable */ }
    setWorkoutExercises([])
    clearAppliedSuggestion()
    setSessionId(null)
    setBattleStarting(false)
    battleStartedRoomRef.current = null
    completedBattleRoomRef.current = battleRoom?.id || null
    setBattleEvents([])
    setPrevSetsMap({})
    setRecentSessionsMap({})
    setHistoryStatusMap({})
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
      setBattleSyncError(friendlyError(error, 'Could not start a fresh workout.'))
      return
    }

    clearWorkoutDraft()
    await performStartWorkout()
  }

  const closeConfirm = () => {
    if (!confirmBusy) {
      setConfirmAction(null)
      setDeleteTarget(null)
      setDeleteConfirmError('')
      setFinishSaveError('')
    }
  }
  useFocusTrap(confirmDialogRef, { active: !!confirmAction, onEscape: closeConfirm })
  useFocusTrap(bodyweightWarningDialogRef, {
    active: !!bodyweightWarning,
    onEscape: () => setBodyweightWarning(null),
  })

  const getFinishableSetMeta = useCallback((exercise, set, index) => {
    if (exercise.category === 'Cardio') {
      const duration = Number(set.duration) || 0
      const valid = Number.isFinite(duration) && duration > 0
      return {
        exerciseId: exercise.id,
        setIndex: index,
        duration,
        shouldInclude: valid,
        incomplete: valid && !set.done,
        completedAt: set.completedAt || null,
        restBeforeSeconds: null,
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
      completedAt: set.completedAt || null,
      restBeforeSeconds: Number.isFinite(set.restBeforeSeconds) ? set.restBeforeSeconds : null,
    }
  }, [userBodyweightKg])

  const hasIncompleteFinishableSets = useCallback(() => (
    workoutExercises.some(exercise => (
      exercise.sets.some((set, index) => getFinishableSetMeta(exercise, set, index).incomplete)
    ))
  ), [getFinishableSetMeta, workoutExercises])

  const buildWorkoutExercisesWithIncompleteSetsDone = useCallback((sourceExercises = workoutExercises) => (
    sourceExercises.map((exercise, exerciseIndex) => {
      let nextExercise = exercise
      const completionBaseMs = Date.now() + (exerciseIndex * 25)

      nextExercise.sets.forEach((set, index) => {
        const meta = getFinishableSetMeta(nextExercise, set, index)
        if (!meta.incomplete) return
        nextExercise = markExerciseSetCompleted(nextExercise, index, {
          completedAtMs: completionBaseMs + index,
          deriveRest: false,
        })
      })

      return nextExercise
    })
  ), [getFinishableSetMeta, workoutExercises])

  const promptFinishWorkout = useCallback(() => {
    setFinishSaveError('')
    setConfirmAction(hasIncompleteFinishableSets() ? 'incomplete' : 'finish')
  }, [hasIncompleteFinishableSets])

  const runConfirmedAction = async () => {
    if (!confirmAction || confirmBusy || isFinishingRef.current) return
    const action = confirmAction
    isFinishingRef.current = true
    setConfirmBusy(true)
    setDeleteConfirmError('')
    setFinishSaveError('')
    try {
      if (action === 'cancel') await confirmCancel()
      if (action === 'incomplete') {
        const completedExercises = buildWorkoutExercisesWithIncompleteSetsDone()
        setWorkoutExercises(completedExercises)
        await finishWorkout(completedExercises)
      }
      if (action === 'finish') {
        Sentry.addBreadcrumb({ category: 'workout', message: 'Workout finished', level: 'info' })
        await finishWorkout()
      }
      if (action === 'restart') await restartWorkoutFromSavedDraft()
      if (action === 'delete-plan') await deleteTrainingPlan(deleteTarget?.id)
      if (action === 'delete-routine') await deleteRoutine(deleteTarget?.id)
      if (action === 'hide-template') hideTemplate(deleteTarget?.id)
      setConfirmAction(null)
      setDeleteTarget(null)
    } catch (err) {
      console.error('runConfirmedAction failed:', err)
      if (action === 'finish' || action === 'incomplete') {
        setFinishSaveError('Could not save workout. Check your connection and try again.')
      } else if (action === 'delete-plan') {
        setDeleteConfirmError(friendlyError(err, 'Could not delete this plan.'))
      } else if (action === 'delete-routine') {
        setDeleteConfirmError(friendlyError(err, 'Could not delete this routine.'))
      }
    } finally {
      setConfirmBusy(false)
      isFinishingRef.current = false
    }
  }

  async function finishWorkout(exercisesOverride = workoutExercises) {
    const setsToInsert = []
    exercisesOverride.forEach(ex => {
      ex.sets.forEach((s, i) => {
        const meta = getFinishableSetMeta(ex, s, i)
        if (!meta.shouldInclude) return
        if (ex.category === 'Cardio') {
          setsToInsert.push({
            user_id: userId,
            session_id: sessionId,
            exercise_id: ex.id,
            set_number: i + 1,
            reps: 0,
            weight: 0,
            duration_seconds: meta.duration,
            completed_at: meta.completedAt,
            rest_before_seconds: null,
          })
        } else {
          setsToInsert.push({
            user_id: userId,
            session_id: sessionId,
            exercise_id: ex.id,
            set_number: i + 1,
            reps: meta.reps,
            weight: meta.weight,
            unit: ex.unit,
            equipment: ex.equipment,
            estimated_1rm: calculateSetEstimatedOrm({
              weight: meta.weight,
              reps: meta.reps,
              unit: ex.unit,
              equipment: ex.equipment,
              bodyweightKg: userBodyweightKg,
            }),
            estimated_fresh_1rm: s.estimatedFresh1rm ?? null,
            completed_at: meta.completedAt,
            rest_before_seconds: meta.restBeforeSeconds,
            progression_event: s.progressionEvent ?? null,
            is_warmup: s.setType === 'warmup',
            set_type: s.setType ?? 'normal',
            set_group_index: s.setGroupIndex ?? null,
          })
        }
      })
    })

    const exerciseIds = exercisesOverride.map(e => e.id)
    const [{ data: prevBests }, { data: prof }, rankStatesResult, resolvedAnchors] = await Promise.all([
      supabase.from('exercise_prs').select('exercise_id, best_1rm_kg').eq('user_id', userId).in('exercise_id', exerciseIds),
      fetchProfileWithWorkoutCount(userId, ['gender', 'bodyweight', 'unit_preference', 'lifetime_volume_kg']),
      fetchExerciseRankStates(userId, exerciseIds),
      getAnchors(),
    ])

    const prevOrmKg = {}
    for (const pr of prevBests || []) {
      if (pr.best_1rm_kg) prevOrmKg[pr.exercise_id] = pr.best_1rm_kg
    }

    const newOrmKg = { ...prevOrmKg }
    setsToInsert.forEach(s => {
      if (s.set_type === 'dropset') return
      const estimatedOrm = Number(s.estimated_1rm)
      if (Number.isFinite(estimatedOrm)) {
        const kg = s.unit === 'lbs' ? estimatedOrm * 0.453592 : estimatedOrm
        newOrmKg[s.exercise_id] = Math.max(newOrmKg[s.exercise_id] || 0, kg)
      }
    })

    const sessionBestOrmKg = {}
    setsToInsert.forEach(s => {
      if (s.is_warmup) return
      if (s.set_type === 'dropset') return
      const estimatedOrm = Number(s.estimated_1rm)
      if (!Number.isFinite(estimatedOrm)) return
      const kg = s.unit === 'lbs' ? estimatedOrm * 0.453592 : estimatedOrm
      sessionBestOrmKg[s.exercise_id] = Math.max(sessionBestOrmKg[s.exercise_id] || 0, kg)
    })

    const bwKg = getProfileBodyweightKg(prof)
    const hasRankBodyweight = Number.isFinite(bwKg) && bwKg > 0
    const genderKey = prof?.gender?.toLowerCase() === 'female' ? 'female' : 'male'
    const rankStatesByExerciseId = mapExerciseRankStates(rankStatesResult.rows)
    const rankUps = []
    if (hasRankBodyweight) {
      for (const ex of exercisesOverride) {
        const anchors = resolvedAnchors[genderKey]?.[ex.name]
        if (!anchors) continue
        const thresholds = expandAnchors(anchors)
        const hadNewOrm = Object.prototype.hasOwnProperty.call(newOrmKg, ex.id)
        if (!hadNewOrm) continue

        const bestOrm = newOrmKg[ex.id]
        const newRatio = getRankRatio(ex, bestOrm, bwKg)
        const newIdx = getTierIdx(newRatio, thresholds)

        const previousState = rankStatesByExerciseId.get(ex.id) || null
        const previousPeakScore = Number.isFinite(previousState?.peak_score)
          ? Number(previousState.peak_score)
          : null
        const oldPeakIdx = previousPeakScore !== null
          ? resolveTierFromScore(previousPeakScore).tierIdx
          : null

        if (oldPeakIdx === null || newIdx > oldPeakIdx) {
          const toIsMax = newIdx === TIERS.length - 1
          rankUps.push({
            exercise: ex.name,
            from: oldPeakIdx === null ? 'Unranked' : TIERS[oldPeakIdx],
            to: TIERS[newIdx],
            color: tierColor(TIERS[newIdx]),
            toProgress: getProgress(newRatio, thresholds, newIdx),
            toNextTier: toIsMax ? null : TIERS[newIdx + 1],
            toIsMax,
          })
        }
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
    const thisSessionTrainingVolumeKg = setsToInsert.reduce((sum, s) => {
      return sum + getSetTrainingVolumeKg({
        weight: s.weight,
        reps: s.reps,
        unit: s.unit,
        equipment: s.equipment,
        bodyweightKg: bwKg,
        set_type: s.set_type,
        is_warmup: s.is_warmup,
      })
    }, 0)
    const newTotalVolumeKg = prevTotalVolumeKg + thisSessionTrainingVolumeKg
    const thisSessionLoadVolumeKg = setsToInsert.reduce((sum, s) => {
      return sum + getSetVolumeKg({
        weight: s.weight,
        reps: s.reps,
        unit: s.unit,
        equipment: s.equipment,
        bodyweightKg: bwKg,
      })
    }, 0)
    const prevSessionCount_ = Math.max(0, Number(prof?.workout_count) || 0)
    const newSessionCount = prevSessionCount_ + 1

    for (const a of ACHIEVEMENTS) {
      if (a.matchNames) {
        const nameSet = new Set(a.matchNames)
        const prevBest = Object.entries(prevOrmByName).filter(([n]) => nameSet.has(n)).reduce((m, [, v]) => Math.max(m, v), 0)
        const newBest  = Object.entries(newOrmByName).filter(([n]) => nameSet.has(n)).reduce((m, [, v]) => Math.max(m, v), 0)
        if (prevBest < a.kgTarget && newBest >= a.kgTarget) newAchievements.push(a)
      } else if (a.match) {
        const prevBest = Object.entries(prevOrmByName).filter(([n]) => n.includes(a.match)).reduce((m, [, v]) => Math.max(m, v), 0)
        const newBest  = Object.entries(newOrmByName).filter(([n]) => n.includes(a.match)).reduce((m, [, v]) => Math.max(m, v), 0)
        if (prevBest < a.kgTarget && newBest >= a.kgTarget) newAchievements.push(a)
      } else if (a.sessions !== undefined) {
        if (prevSessionCount_ < a.sessions && newSessionCount >= a.sessions) newAchievements.push(a)
      } else if (a.totalVolumeKg !== undefined) {
        if (prevTotalVolumeKg < a.totalVolumeKg && newTotalVolumeKg >= a.totalVolumeKg) newAchievements.push(a)
      }
    }

    const calExercises = exercisesOverride
      .map(ex => {
        const includedSets = ex.sets
          .map((s, i) => {
            const meta = getFinishableSetMeta(ex, s, i)
            if (!meta.shouldInclude) return null
            return ex.category === 'Cardio' ? { durationSeconds: meta.duration } : {}
          })
          .filter(Boolean)
        if (includedSets.length === 0) return null
        return {
          name: ex.name,
          isCardio: ex.category === 'Cardio',
          primary_muscles: ex.primary_muscles || [],
          secondary_muscles: ex.secondary_muscles || [],
          sets: includedSets,
        }
      })
      .filter(Boolean)
    const caloriesBurned = estimateCaloriesBurned(calExercises, seconds, bwKg)
    const sourcePlanExercise = exercisesOverride.find(ex => ex.planSource === 'training_plan' && ex.planId && ex.planDayId)
    const sourcePlan = sourcePlanExercise
      ? {
        planId: sourcePlanExercise.planId,
        dayId: sourcePlanExercise.planDayId,
        week: Number(sourcePlanExercise.planWeek) || 1,
        deloadWeek: Boolean(sourcePlanExercise.planDeloadWeek),
      }
      : null
    const completedPlan = sourcePlan
      ? userTrainingPlans.find(plan => plan.id === sourcePlan.planId)
      : null
    const completedPlanDay = completedPlan
      ? completedPlan.days.find(day => day.id === sourcePlan.dayId)
      : null
    const completedPlanDayForAdaptation = completedPlanDay && sourcePlan?.deloadWeek
      ? applyScheduledDeloadToPlanDay(completedPlanDay, sourcePlan.week)
      : completedPlanDay
    let planCoaching = null
    let coachAutoApplied = false
    let exerciseProgress = []

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
          user_id: userId,
          exercise_id: ex.id,
          best_1rm_kg: newOrmKg[ex.id],
          updated_at: new Date().toISOString(),
        }))

      const nowIso = new Date().toISOString()
      const activeRankUpdates = hasRankBodyweight ? exercisesOverride
        .map(ex => {
          const sessionOrmKg = sessionBestOrmKg[ex.id]
          if (!Number.isFinite(sessionOrmKg)) return null

          const anchors = resolvedAnchors[genderKey]?.[ex.name]
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

          const bestOrmAchievableScore = Number.isFinite(newOrmKg[ex.id])
            ? getContinuousExerciseScore(ex, newOrmKg[ex.id], bwKg, thresholds)
            : 0

          const resolved = resolveTierFromScore(nextScore)
          const previousResolved = resolveTierFromScore(priorScore)
          const scoreDelta = nextScore - priorScore
          const direction = Math.abs(scoreDelta) < 1e-6
            ? 'same'
            : scoreDelta > 0
              ? 'up'
              : 'down'

          return {
            upsert: {
              exerciseId: ex.id,
              currentScore: nextScore,
              peakScore: Math.max(previousPeakScore, nextScore, bestOrmAchievableScore),
              lastRankedAt: nowIso,
              updatedAt: nowIso,
            },
            progress: {
              exerciseId: ex.id,
              exercise: ex.name,
              tier: resolved.tier,
              tierIdx: resolved.tierIdx,
              nextTier: resolved.nextTier,
              progress: resolved.progress,
              color: resolved.color,
              isMax: resolved.isMax,
              previousTier: previousResolved.tier,
              previousTierIdx: previousResolved.tierIdx,
              previousProgress: previousResolved.progress,
              previousColor: previousResolved.color,
              direction,
              tierChanged: resolved.tierIdx !== previousResolved.tierIdx,
            },
          }
        })
        .filter(Boolean) : []
      const activeRankStateUpserts = activeRankUpdates.map(u => u.upsert)
      exerciseProgress = activeRankUpdates.map(u => u.progress)

      const newStreakStartDate = computeNewStreakStartDate(streakStartDate, streakLastWorkoutAt, nowIso)

      await finishWorkoutSessionAtomic(supabase, {
        sessionId,
        finishedAt: nowIso,
        exerciseNotes,
        caloriesBurned,
        sourcePlan,
        sessionTrainingVolumeKg: thisSessionTrainingVolumeKg,
        sets: setsToInsert,
        prs: prUpserts,
        rankStates: activeRankStateUpserts,
        streakStartDate: newStreakStartDate,
        streakLastWorkoutAt: nowIso,
      })

      if (completedPlan && completedPlanDayForAdaptation) {
        // List-loaded plans don't carry preferences, so resolve them to read the coach
        // settings. Generation (and auto-apply below) only run when the coach is enabled.
        const planWithPrefs = await ensurePlanPreferences(completedPlan)
        const { generate, autoApply } = resolveAdaptiveCoachMode(planWithPrefs.preferences?.adaptiveCoach)
        const adaptation = generate ? buildPlanAdaptation({
          plan: planWithPrefs,
          day: completedPlanDayForAdaptation,
          exercises: exercisesOverride,
          durationSeconds: seconds,
          sessionId,
          planWeek: sourcePlan.week,
        }) : null
        if (adaptation) {
          planCoaching = adaptation
          const { data: insertedAdaptation, error: adaptationError } = await supabase
            .from('user_training_plan_adaptations')
            .insert({
              user_id: userId,
              plan_id: adaptation.planId,
              session_id: adaptation.sessionId,
              plan_day_id: adaptation.planDayId,
              plan_week: adaptation.planWeek,
              status: adaptation.status,
              summary: adaptation.summary,
              body: adaptation.body,
              metrics: adaptation.metrics,
              adjustments: adaptation.adjustments,
            })
            .select()
            .single()
          if (!adaptationError) {
            planCoaching = insertedAdaptation
            setPlanAdaptations(prev => supersedeSameDayPending(prev, insertedAdaptation))
            // Newest suggestion wins: dismiss any older still-pending suggestion for the
            // same plan day so Coach Review never stacks stale/contradictory cards.
            // Best-effort — if this cleanup fails we keep the older row (degrades to the
            // prior accumulate behavior; no data loss).
            await dismissSupersededSameDayAdaptations(supabase, {
              userId,
              planId: insertedAdaptation.plan_id,
              planDayId: insertedAdaptation.plan_day_id,
              exceptId: insertedAdaptation.id,
            })
            // Auto-apply mode: apply the suggestion to the plan immediately and mark it
            // applied, so the summary shows the applied screen and no pending card lingers.
            if (autoApply) {
              const nextPlan = normalizeTrainingPlan(applyPlanAdaptation(planWithPrefs, insertedAdaptation))
              const { error: applyError } = await supabase
                .from('user_training_plans')
                .update({ preferences: nextPlan.preferences, days: nextPlan.days })
                .eq('id', planWithPrefs.id)
                .eq('user_id', userId)
              if (!applyError) {
                setUserTrainingPlans(prev => prev.map(p => p.id === planWithPrefs.id ? nextPlan : p))
                await updateAdaptationStatus(insertedAdaptation, 'applied')
                coachAutoApplied = true
              }
            }
          } else if (!isMissingPlanPersistence(adaptationError)) {
            setPlanError(friendlyError(adaptationError, 'Could not save plan coaching.'))
          }
        }
      }
    }

    const now = new Date()
    const calKey = `cal_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    invalidateCache('home', 'ranks', 'profile', 'achievements', calKey)

    const unit = prof?.unit_preference || defaultUnit
    const totalVolume = Math.round(setsToInsert.reduce((sum, s) => (
      sum + getSetTrainingVolumeInUnit({
        weight: s.weight,
        reps: s.reps,
        unit: s.unit,
        equipment: s.equipment,
        bodyweightKg: bwKg,
        set_type: s.set_type,
        is_warmup: s.is_warmup,
      }, unit)
    ), 0))
    const totalVolumeKg = thisSessionTrainingVolumeKg
    const totalLoadVolume = Math.round(setsToInsert.reduce((sum, s) => (
      sum + getSetVolumeInUnit({
        weight: s.weight,
        reps: s.reps,
        unit: s.unit,
        equipment: s.equipment,
        bodyweightKg: bwKg,
      }, unit)
    ), 0))
    const totalLoadVolumeKg = thisSessionLoadVolumeKg
    const totalWorkingSets = setsToInsert.filter(isInsertedWorkingSet).length
    const totalDropSets = setsToInsert.filter(s => getInsertedSetType(s) === 'dropset').length
    const totalWarmupSets = setsToInsert.filter(s => getInsertedSetType(s) === 'warmup').length
    const prHighlights = exercisesOverride
      .map(ex => {
        const nextOrm = newOrmKg[ex.id]
        if (!Number.isFinite(nextOrm)) return null
        const prevOrm = prevOrmKg[ex.id] || 0
        if (nextOrm <= prevOrm) return null
        return {
          type: 'pr',
          title: `${ex.name} PR`,
          body: prevOrm > 0
            ? `${formatBattleHighlightLoad(prevOrm, unit)} to ${formatBattleHighlightLoad(nextOrm, unit)} estimated 1RM`
            : `${formatBattleHighlightLoad(nextOrm, unit)} estimated 1RM`,
        }
      })
      .filter(Boolean)
    const battleHighlights = [
      ...prHighlights,
      ...rankUps.map(rank => ({
        type: 'rank_up',
        title: `${rank.exercise} rank up`,
        body: `${rank.from} to ${rank.to}`,
      })),
      ...newAchievements.map(achievement => ({
        type: 'achievement',
        title: achievement.title,
        body: achievement.desc,
      })),
      {
        type: 'effort',
        title: 'Workout effort',
        body: `${formatEffortSetSummary(totalWorkingSets, totalDropSets)}, ${exercisesOverride.length} exercises, ${formatBattleHighlightDuration(seconds)}, ${Math.round(totalVolume)} ${unit} effective volume`,
      },
    ].slice(0, 8)
    const summary = {
      durationSeconds: seconds,
      caloriesBurned,
      totalSets: totalWorkingSets,
      totalWorkingSets,
      totalDropSets,
      totalWarmupSets,
      totalVolume,
      totalLoadVolume,
      unit,
      exercises: exercisesOverride
        .map(ex => {
          if (ex.category === 'Cardio') {
            const sets = ex.sets
              .map((set, index) => {
                const meta = getFinishableSetMeta(ex, set, index)
                return meta.shouldInclude ? { durationSeconds: meta.duration } : null
              })
              .filter(Boolean)
            return sets.length > 0 ? { name: ex.name, sets, isCardio: true } : null
          }
          return {
            name: ex.name,
            sets: ex.sets
              .map((set, index) => {
                const meta = getFinishableSetMeta(ex, set, index)
                return meta.shouldInclude ? { weight: meta.weight, reps: meta.reps, unit: ex.unit, setType: set.setType ?? 'normal' } : null
              })
              .filter(Boolean),
          }
        })
        .filter(ex => ex && ex.sets.length > 0),
      rankUps,
      exerciseProgress,
      bodyweightMissing: !hasRankBodyweight,
      newAchievements,
      planCoaching,
    }

    if (battleModeActive && userId) {
      try {
        await publishBattleEvent('workout_finished', {
          durationSeconds: seconds,
          totalSets: totalWorkingSets,
          totalWorkingSets,
          totalDropSets,
          totalWarmupSets,
          totalExercises: exercisesOverride.length,
          totalVolume,
          totalVolumeKg,
          totalLoadVolume,
          totalLoadVolumeKg,
          unit,
          highlights: battleHighlights,
        })
        summary.battle = await loadCurrentBattleRecap()
        const { finalized } = await recordCurrentBattleResultIfReady(summary.battle)
        if (finalized) {
          completedBattleRoomRef.current = null
          onBattleRoomClosed?.(summary.battle?.status === 'cancelled' ? 'cancelled' : 'finished')
        } else {
          completedBattleRoomRef.current = battleRoom.id
          onBattleRoomClosed?.('waiting')
        }
      } catch (err) {
        setBattleSyncError(friendlyError(err, 'Could not finish the battle room cleanly.'))
        return
      }
    }

    setActiveWorkout(false)
    setProgressionUnlocked(isPremiumSync())
    try { localStorage.removeItem('liftlog:progression-unlocked') } catch { /* storage may be unavailable */ }
    setWorkoutExercises([])
    clearAppliedSuggestion()
    setSessionId(null)
    setBattleStarting(false)
    battleStartedRoomRef.current = battleRoom?.id && completedBattleRoomRef.current === battleRoom.id
      ? battleRoom.id
      : null
    setPrevSetsMap({})
    setRecentSessionsMap({})
    setHistoryStatusMap({})
    cancelRestNotification(); setRestTimer(null)
    setExerciseNotes({})
    setNotesOpen({})
    if (battleModeActive) clearBattleWorkoutDraft()
    else clearWorkoutDraft()
    loadPlanProgress(userId, userTrainingPlans)
    // Surface the coaching suggestion on the summary. If auto-apply already applied it,
    // flag it so the summary shows the applied screen; otherwise let the summary apply it
    // directly (which clears it from planAdaptations so it won't linger in Coach Review).
    if (planCoaching?.id && planCoaching?.plan_id) {
      if (coachAutoApplied) {
        summary.coachAutoApplied = true
      } else {
        summary.applyCoaching = () => applyPendingPlanAdaptation(planCoaching)
      }
    }
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
            ref={confirmDialogRef}
            tabIndex={-1}
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
                    : confirmAction === 'delete-plan'
                      ? 'Delete Plan?'
                      : confirmAction === 'delete-routine'
                        ? 'Delete Routine?'
                        : confirmAction === 'hide-template'
                          ? 'Hide Routine?'
                        : 'Cancel Workout?'}
            </div>
            <div className="confirm-body">
              {confirmAction === 'finish'
                ? 'Your workout will be saved.'
                : confirmAction === 'incomplete'
                  ? 'You have incomplete sets with recorded repetitions. Would you like to mark all completed sets before finishing this workout?'
                : confirmAction === 'restart'
                  ? 'All progress in the current saved workout will be lost.'
                  : confirmAction === 'delete-plan'
                    ? `This will permanently delete "${deleteTarget?.name || 'this plan'}". Completed workouts already in your history will stay saved.`
                  : confirmAction === 'delete-routine'
                    ? `This will permanently delete "${deleteTarget?.name || 'this routine'}". Completed workouts already in your history will stay saved.`
                  : confirmAction === 'hide-template'
                    ? `This will hide "${deleteTarget?.name || 'this routine'}" from Suggested Routines.`
                  : 'All progress will be lost.'}
            </div>
            {finishSaveError && <div className="battle-panel-error">{finishSaveError}</div>}
            {deleteConfirmError && <div className="battle-panel-error">{deleteConfirmError}</div>}
            <div className="confirm-actions">
              <button
                type="button"
                className="confirm-keep"
                onClick={closeConfirm}
                disabled={confirmBusy}
              >
                {confirmAction === 'incomplete'
                  ? 'Back'
                  : confirmAction === 'delete-plan' || confirmAction === 'delete-routine' || confirmAction === 'hide-template'
                    ? 'Cancel'
                    : 'Keep Going'}
              </button>
              <button
                type="button"
                className={confirmAction === 'cancel' || confirmAction === 'restart' || confirmAction === 'delete-plan' || confirmAction === 'delete-routine' || confirmAction === 'hide-template' ? 'confirm-discard' : 'confirm-submit'}
                onClick={runConfirmedAction}
                disabled={confirmBusy}
              >
                {confirmBusy
                  ? <LoadingSpinner size="xs" color="currentColor" />
                  : confirmAction === 'finish'
                    ? 'Finish'
                    : confirmAction === 'restart'
                      ? 'Start Fresh'
                      : confirmAction === 'incomplete'
                        ? 'Check and Finish'
                        : confirmAction === 'delete-plan'
                          ? 'Delete Plan'
                          : confirmAction === 'delete-routine'
                            ? 'Delete Routine'
                            : confirmAction === 'hide-template'
                              ? 'Hide Routine'
                              : 'Discard'}
              </button>
            </div>
          </div>
        </div>,
        document.querySelector('.app') || document.body
      )
    : null

  const bodyweightWarningDialog = bodyweightWarning && typeof document !== 'undefined'
    ? createPortal(
        <div
          className="confirm-overlay"
          data-tab-swipe-ignore="true"
          role="presentation"
          onClick={() => setBodyweightWarning(null)}
          onTouchStart={e => e.stopPropagation()}
          onTouchEnd={e => e.stopPropagation()}
        >
          <div
            className="confirm-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="bw-warning-title"
            ref={bodyweightWarningDialogRef}
            tabIndex={-1}
            onClick={e => e.stopPropagation()}
            onTouchStart={e => e.stopPropagation()}
            onTouchEnd={e => e.stopPropagation()}
          >
            <div id="bw-warning-title" className="confirm-title">Log your bodyweight?</div>
            <div className="confirm-body">
              You won&apos;t earn ranks until you log your bodyweight. Strength tiers are calculated relative to bodyweight.
            </div>
            <div className="confirm-actions">
              <button
                type="button"
                className="confirm-keep"
                onClick={() => {
                  const pending = bodyweightWarning
                  setBodyweightWarning(null)
                  pending?.run?.()
                }}
              >
                Continue
              </button>
              <button
                type="button"
                className="confirm-submit"
                onClick={() => {
                  setBodyweightWarning(null)
                  onRequestLogBodyweight?.()
                }}
              >
                Log bodyweight
              </button>
            </div>
          </div>
        </div>,
        document.querySelector('.app') || document.body
      )
    : null

  const planAdGatePortal = (planAdGate || planAdGateLoading) && typeof document !== 'undefined'
    ? createPortal(
        <div className="rest-done-overlay ad-gate-overlay">
          <div className="rest-done-modal ad-gate-modal">
            {planAdGateLoading && (
              <div className="ad-gate-spinner-overlay">
                <LoadingSpinner size="md" />
              </div>
            )}
            <div style={{ visibility: planAdGateLoading ? 'hidden' : 'visible', display: 'contents' }}>
              <div className="ad-gate-timer">
                <svg width="80" height="80" viewBox="0 0 80 80">
                  <circle className="ad-gate-timer-bg" cx="40" cy="40" r="34" />
                  <circle
                    className="ad-gate-timer-ring"
                    cx="40" cy="40" r="34"
                    strokeDasharray="213.6"
                    strokeDashoffset="0"
                  />
                </svg>
                <span className="ad-gate-timer-num">{planAdGateCountdown}</span>
              </div>
              <div className="rest-done-title">No Premium</div>
              <div className="rest-done-body ad-gate-body">
                {planAdGate?.routine
                  ? "You don't have a premium subscription. Please watch a short ad to start your routine."
                  : "You don't have a premium subscription. Please watch a short ad to start your session."}
              </div>
              <button className="rest-done-btn ad-gate-btn" onClick={triggerPlanAd}>
                Watch Ad Now
              </button>
              <button className="scan-ad-cancel-btn" onClick={() => { setPlanAdGate(null); setPlanAdGateCountdown(null) }}>
                Cancel
              </button>
            </div>
          </div>
        </div>,
        document.querySelector('.app') || document.body
      )
    : null

  const planPaywall = showPlanPaywall ? (
    <Paywall
      onClose={async () => {
        setShowPlanPaywall(false)
        const pending = pendingPlanStartRef.current
        pendingPlanStartRef.current = null
        if (pending) {
          setPlanStartLoading(true)
          const { plan, day, routine, unlockProgression } = pending
          const started = routine
            ? await startTemplateRef.current?.(routine)
            : await startFromPlanDay(plan, day)
          setPlanStartLoading(false)
          if (started && unlockProgression) setProgressionUnlocked(true)
          if (started && plan) setViewingTrainingPlanId(null)
        }
      }}
      onPurchaseSuccess={() => { refreshPremiumStatus() }}
    />
  ) : null

  const planStartLoadingPortal = planStartLoading && typeof document !== 'undefined'
    ? createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <LoadingSpinner size="lg" />
        </div>,
        document.body
      )
    : null

  const progressionAdGatePortal = (progressionAdGate || progressionAdGateLoading) && typeof document !== 'undefined'
    ? createPortal(
        <div className="rest-done-overlay ad-gate-overlay">
          <div className="rest-done-modal progression-ad-modal">
            {progressionAdGateLoading && (
              <div className="ad-gate-spinner-overlay">
                <LoadingSpinner size="md" />
              </div>
            )}
            <div style={{ visibility: progressionAdGateLoading ? 'hidden' : 'visible', display: 'contents' }}>
              <div className="progression-ad-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              </div>
              <div className="rest-done-title progression-ad-title">Progression Engine</div>
              <div className="progression-ad-subtitle">Your next weights, calculated.</div>
              <div className="rest-done-body progression-ad-body">
                Reads your training history and delivers exact weight &times; rep targets for every exercise — microload, ramp, or hold, adapted to how you actually performed. One tap to apply.
              </div>
              <button className="rest-done-btn ad-gate-btn" onClick={triggerProgressionAd}>
                Unlock for this session
              </button>
              <button className="scan-ad-cancel-btn" onClick={skipProgressionGate}>
                Train without it
              </button>
            </div>
          </div>
        </div>,
        document.querySelector('.app') || document.body
      )
    : null

  const progressionPaywall = showProgressionPaywall ? (
    <Paywall
      onClose={() => setShowProgressionPaywall(false)}
      onPurchaseSuccess={() => { setShowProgressionPaywall(false); refreshPremiumStatus() }}
    />
  ) : null

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
    setRoutineError('')
  }

  const closeRoutineBuilder = () => {
    setShowRoutineBuilder(false)
    setRoutineName('')
    setRoutineDesc('')
    setRoutineExercises([])
    setEditingRoutineId(null)
    setRoutineError('')
  }

  const saveRoutine = async () => {
    if (savingRoutine) return
    if (!editingRoutineId && userRoutines.length >= MAX_SAVED_ROUTINES) {
      setRoutineError(ROUTINE_LIMIT_MESSAGE)
      return
    }
    const nameError = validateLength(routineName, {
      label: 'Routine name',
      min: 1,
      max: VALIDATION_LIMITS.routineNameMaxLength,
      required: true,
    })
    const descError = validateLength(routineDesc, {
      label: 'Routine description',
      max: VALIDATION_LIMITS.routineDescriptionMaxLength,
    })
    if (nameError || descError) {
      setRoutineError(nameError || descError)
      return
    }
    if (routineExercises.length === 0) {
      setRoutineError('Add at least one exercise.')
      return
    }
    setSavingRoutine(true)
    try {
      const payload = { name: routineName.trim(), description: routineDesc.trim(), exercises: routineExercises }
      const { error } = editingRoutineId
        ? await supabase.from('user_routines').update(payload).eq('id', editingRoutineId)
        : await supabase.from('user_routines').insert({ ...payload, user_id: userId })
      if (error) throw error
      await loadUserRoutines(userId)
      closeRoutineBuilder()
    } catch (error) {
      setRoutineError(getSavedItemLimitMessage(error, 'Could not save this routine. Check your connection and try again.'))
    } finally {
      setSavingRoutine(false)
    }
  }

  const hideTemplate = (id) => {
    const updated = sanitizeHiddenTemplateIds([...hiddenTemplates, id], TEMPLATES.map(t => t.id))
    setHiddenTemplates(updated)
    localStorage.setItem('hiddenTemplates', JSON.stringify(updated))
  }

  const requestHideTemplate = (template) => {
    if (!template?.id) return
    setDeleteConfirmError('')
    setDeleteTarget({ type: 'template', id: template.id, name: template.name || 'this routine' })
    setConfirmAction('hide-template')
  }

  const requestDeleteRoutine = (routine) => {
    if (!routine?.id) return
    setRoutineError('')
    setDeleteConfirmError('')
    setDeleteTarget({ type: 'routine', id: routine.id, name: routine.name || 'this routine' })
    setConfirmAction('delete-routine')
  }

  const deleteRoutine = async (id) => {
    if (!id) throw new Error('Missing routine id')
    const { error } = await supabase.from('user_routines').delete().eq('id', id)
    if (error) throw error
    setUserRoutines(prev => prev.filter(r => r.id !== id))
  }

  const updatePlanForm = (patch) => {
    setPlanError('')
    setGeneratedPlan(null)
    setPlanForm(current => normalizeTrainingPlanForm({ ...current, ...patch }))
  }

  const ensurePlanPreferences = async (plan) => {
    if (!plan?.id || plan.preferencesFetched) return plan
    const { data } = await supabase
      .from('user_training_plans')
      .select('preferences')
      .eq('id', plan.id)
      .single()
    const resolved = { ...plan, preferences: data?.preferences ?? {}, preferencesFetched: true }
    setUserTrainingPlans(prev =>
      prev.map(p => p.id === plan.id ? { ...p, preferences: resolved.preferences, preferencesFetched: true } : p)
    )
    return resolved
  }

  const openPlanBuilder = async (plan = null) => {
    if (plan) {
      const resolvedPlan = await ensurePlanPreferences(plan)
      const normalized = normalizeTrainingPlan(resolvedPlan)
      const preferences = normalized.preferences || {}
      const schedule = preferences.schedule || {}
      const periodization = preferences.periodization || {}
      const adaptiveCoach = preferences.adaptiveCoach || {}
      setPlanForm(normalizeTrainingPlanForm({
        name: normalized.name,
        goal: normalized.goal,
        secondaryGoal: preferences.secondaryGoal || '',
        experience: normalized.experience,
        daysPerWeek: normalized.days_per_week,
        sessionMinutes: normalized.session_minutes,
        durationWeeks: normalized.duration_weeks,
        equipment: normalized.equipment,
        focusAreas: preferences.focusAreas || [],
        avoid: Array.isArray(preferences.avoid) ? preferences.avoid.join(', ') : '',
        scheduleMode: schedule.mode || 'flexible',
        trainingDays: schedule.trainingDays || [],
        splitPreference: schedule.splitPreference || 'auto',
        periodizationStyle: periodization.style || 'double_progression',
        deloadPolicy: periodization.deloadPolicy || 'adaptive',
        blockGoal: periodization.blockGoal || 'accumulation',
        adaptiveCoach: adaptiveCoach.enabled !== false,
        adaptiveCoachAutoApply: adaptiveCoach.autoApply !== false,
      }))
      setGeneratedPlan(normalized)
      setEditingPlanId(normalized.id)
      setPlanBuilderStep(3)
    } else {
      setPlanForm(DEFAULT_TRAINING_PLAN_FORM)
      setGeneratedPlan(null)
      setEditingPlanId(null)
      setPlanBuilderStep(0)
    }
    setPlanError('')
    setViewingTrainingPlanId(null)
    setShowPlanBuilder(true)
  }

  const closePlanBuilder = () => {
    setShowPlanBuilder(false)
    setPlanBuilderStep(0)
    setPlanForm(DEFAULT_TRAINING_PLAN_FORM)
    setGeneratedPlan(null)
    setEditingPlanId(null)
    setPlanError('')
    setSavingPlan(false)
    setPlanInfoModal(null)
  }

  const generatePlanPreview = () => {
    const normalized = normalizeTrainingPlanForm(planForm)
    const validationError = validateTrainingPlanForm(normalized)
    if (validationError) {
      setPlanError(validationError)
      return null
    }
    try {
      const plan = generateTrainingPlan(normalized, exerciseLibrary)
      setGeneratedPlan(plan)
      setPlanForm(normalized)
      setPlanError('')
      setPlanBuilderStep(3)
      return plan
    } catch (error) {
      setPlanError(friendlyError(error, 'Could not generate a plan from those inputs.'))
      return null
    }
  }

  const saveTrainingPlan = async () => {
    if (!userId || savingPlan) return
    if (!editingPlanId && userTrainingPlans.length >= MAX_SAVED_TRAINING_PLANS) {
      setPlanError(TRAINING_PLAN_LIMIT_MESSAGE)
      return
    }
    const plan = generatedPlan || generatePlanPreview()
    if (!plan) return
    setSavingPlan(true)
    setPlanError('')
    const payload = {
      user_id: userId,
      name: plan.name,
      goal: plan.goal,
      experience: plan.experience,
      days_per_week: plan.days_per_week,
      session_minutes: plan.session_minutes,
      duration_weeks: plan.duration_weeks,
      equipment: plan.equipment,
      preferences: plan.preferences,
      days: plan.days,
    }
    try {
      const request = editingPlanId
        ? supabase.from('user_training_plans').update(payload).eq('id', editingPlanId).eq('user_id', userId)
        : supabase.from('user_training_plans').insert(payload)
      const { error } = await request
      if (error) throw error
      const plansLoaded = await loadUserTrainingPlans(userId)
      if (!plansLoaded) return
      closePlanBuilder()
    } catch (error) {
      setPlanError(getSavedItemLimitMessage(error, 'Could not save your plan.'))
    } finally {
      setSavingPlan(false)
    }
  }

  const requestDeleteTrainingPlan = (plan) => {
    if (!plan?.id) return
    setPlanError('')
    setDeleteConfirmError('')
    setDeleteTarget({ type: 'plan', id: plan.id, name: plan.name || 'this plan' })
    setConfirmAction('delete-plan')
  }

  const deleteTrainingPlan = async (id) => {
    if (!id || !userId) throw new Error('Missing plan id')
    const { error } = await supabase.from('user_training_plans').delete().eq('id', id).eq('user_id', userId)
    if (error) throw error
    setUserTrainingPlans(prev => prev.filter(plan => plan.id !== id))
    if (viewingTrainingPlanId === id) setViewingTrainingPlanId(null)
  }

  const openPlanDetails = (plan) => {
    if (!plan?.id) return
    setPlanError('')
    setViewingTrainingPlanId(plan.id)
    ensurePlanPreferences(plan)
  }

  const closePlanDetails = () => {
    setPlanError('')
    setViewingTrainingPlanId(null)
  }

  const closePlanReplacement = useCallback(() => {
    setPlanReplacement(null)
    setPlanReplacementSearch('')
    setSelectedPlanReplacement(null)
    setSavingPlanReplacement(false)
    setPlanReplacementWarning(null)
  }, [])

  const openPlanReplacement = (plan, day, exerciseIndex, { context = 'saved' } = {}) => {
    if (!plan || !day?.id) return
    setPlanError('')
    setPlanReplacement({
      planId: plan.id || '__generated_plan__',
      dayId: day.id,
      exerciseIndex,
      context,
    })
    setPlanReplacementSearch('')
    setSelectedPlanReplacement(null)
    setPlanReplacementWarning(null)
  }

  const savePlanReplacement = async (candidate = selectedPlanReplacement, { force = false } = {}) => {
    if (!candidate?.exercise || !planReplacement || !userId || savingPlanReplacement) return
    const plan = planReplacement.context === 'generated'
      ? generatedPlan
      : userTrainingPlans.find(item => item.id === planReplacement.planId)
    const day = plan?.days?.find(item => String(item.id) === String(planReplacement.dayId))
    const originalExercise = day?.exercises?.[planReplacement.exerciseIndex]
    if (!plan || !day || !originalExercise) return

    const warning = getPlanExerciseReplacementWarning(originalExercise, candidate.exercise, plan, day)
    if (warning && !force) {
      setPlanReplacementWarning({ candidate, warning })
      return
    }

    setSavingPlanReplacement(true)
    setPlanError('')
    try {
      const replacementMode = warning
        ? 'override'
        : candidate.source === 'suggested'
          ? 'suggested'
          : 'manual'
      const nextPlan = replaceTrainingPlanExercise(plan, day.id, planReplacement.exerciseIndex, candidate.exercise, { replacementMode })
      if (planReplacement.context === 'generated') {
        setGeneratedPlan(nextPlan)
        closePlanReplacement()
        return
      }
      const { error } = await supabase
        .from('user_training_plans')
        .update({
          days: nextPlan.days,
          preferences: nextPlan.preferences,
        })
        .eq('id', plan.id)
        .eq('user_id', userId)
      if (error) throw error
      setUserTrainingPlans(prev => prev.map(item => item.id === plan.id ? nextPlan : item))
      closePlanReplacement()
    } catch (error) {
      setPlanError(friendlyError(error, 'Could not replace this exercise. Check your connection and try again.'))
    } finally {
      setSavingPlanReplacement(false)
      setPlanReplacementWarning(null)
    }
  }

  const getStartingPlanDayKey = (plan, day) => `${plan?.id || '__plan__'}:${day?.id || '__day__'}`

  const handleStartFromPlanDay = (plan, day) => {
    const startKey = getStartingPlanDayKey(plan, day)
    if (startingPlanDayKey === startKey) return
    gateOnBodyweight(async () => {
      if (isPremiumSync()) {
        setStartingPlanDayKey(startKey)
        try {
          const started = await startFromPlanDay(plan, day)
          if (started) setViewingTrainingPlanId(null)
        } finally {
          setStartingPlanDayKey(null)
        }
      } else {
        setPlanAdGate({ plan, day })
        setPlanAdGateCountdown(10)
      }
    })
  }

  const handleStartNextSession = (plan) => {
    const nextDay = planProgressMap[plan.id]?.nextDay ?? plan.days[0]
    if (!nextDay) return
    handleStartFromPlanDay(plan, nextDay)
  }

  const updateAdaptationStatus = async (adaptation, status) => {
    if (!adaptation?.id || !userId) return
    const { error } = await supabase
      .from('user_training_plan_adaptations')
      .update({ status, resolved_at: new Date().toISOString() })
      .eq('id', adaptation.id)
      .eq('user_id', userId)
    if (error) {
      if (!isMissingPlanPersistence(error)) setPlanError(friendlyError(error, 'Could not update this coaching suggestion.'))
      return
    }
    setPlanAdaptations(prev => prev.filter(item => item.id !== adaptation.id))
  }

  const dismissPlanAdaptation = (adaptation) => updateAdaptationStatus(adaptation, 'dismissed')

  const applyPendingPlanAdaptation = async (adaptation) => {
    if (!adaptation?.plan_id || !userId) return false
    const planFromState = userTrainingPlans.find(item => item.id === adaptation.plan_id)
    if (!planFromState) return false
    setApplyingAdaptationId(adaptation.id ?? adaptation.plan_id)
    try {
      const plan = await ensurePlanPreferences(planFromState)
      const nextPlan = normalizeTrainingPlan(applyPlanAdaptation(plan, adaptation))
      const { error } = await supabase
        .from('user_training_plans')
        .update({
          preferences: nextPlan.preferences,
          days: nextPlan.days,
        })
        .eq('id', plan.id)
        .eq('user_id', userId)
      if (error) {
        setPlanError(friendlyError(error, 'Could not apply this coaching suggestion.'))
        return false
      }
      setUserTrainingPlans(prev => prev.map(item => item.id === plan.id ? nextPlan : item))
      await updateAdaptationStatus(adaptation, 'applied')
      return true
    } finally {
      setApplyingAdaptationId(null)
    }
  }

  const setPlanAutoApply = async (plan, autoApply) => {
    if (!plan?.id || !userId || savingPlanPreferenceId === plan.id) return false
    setSavingPlanPreferenceId(plan.id)
    setPlanError('')
    try {
      const planWithPrefs = await ensurePlanPreferences(plan)
      const preferences = planWithPrefs.preferences || {}
      const adaptiveCoach = preferences.adaptiveCoach || {}
      const nextPlan = normalizeTrainingPlan({
        ...planWithPrefs,
        preferences: {
          ...preferences,
          adaptiveCoach: {
            ...adaptiveCoach,
            autoApply: Boolean(autoApply),
          },
        },
      })
      const { error } = await supabase
        .from('user_training_plans')
        .update({ preferences: nextPlan.preferences })
        .eq('id', planWithPrefs.id)
        .eq('user_id', userId)
      if (error) {
        setPlanError(friendlyError(error, 'Could not update plan coaching.'))
        return false
      }
      setUserTrainingPlans(prev => prev.map(item => item.id === planWithPrefs.id ? nextPlan : item))
      return true
    } catch (error) {
      setPlanError(friendlyError(error, 'Could not update plan coaching.'))
      return false
    } finally {
      setSavingPlanPreferenceId(null)
    }
  }

  const createWorkoutSession = async (metadata = {}) => {
    const payload = { user_id: userId, ...metadata }
    const result = await supabase.from('workout_sessions').insert(payload).select('id').single()
    if (!result.error || !isMissingPlanPersistence(result.error)) return result
    return supabase.from('workout_sessions').insert({ user_id: userId }).select('id').single()
  }

  const toggleSelect = (id) => {
    const isAdding = !selected.includes(id)
    if (isAdding && pickerContext !== 'routine' && userId) {
      if (!(id in prefetchedHistoryRef.current) && !(id in prefetchInFlightRef.current)) {
        const promise = fetchRecentSessionsWithStatus(userId, [id], supabase, sessionId)
          .then(result => {
            const status = result.statusByExercise?.[id]
            if (status === 'loaded' || status === 'empty') {
              prefetchedHistoryRef.current[id] = {
                sid: sessionId,
                sessions: result.sessionsByExercise?.[id] || [],
                status,
              }
            }
          })
          .catch(() => {})
          .finally(() => { delete prefetchInFlightRef.current[id] })
        prefetchInFlightRef.current[id] = promise
      }
    }
    setSelected(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }

  const fmtRest = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  const supersetDisplay = useMemo(() => buildSupersetDisplayGroups(workoutExercises), [workoutExercises])
  const fmtDur = (total) => {
    const minutes = Math.floor(total / 60)
    const secondsPart = total % 60
    return `${minutes}:${String(secondsPart).padStart(2, '0')}`
  }
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
    if (battleModeActive && userId && toAdd.length > 0) {
      publishBattleEvent('exercise_added', {
        exerciseIds: toAdd.map(ex => ex.id),
        exerciseNames: toAdd.map(ex => ex.name),
        exerciseCategories: toAdd.map(ex => ex.category),
      }).then(() => {
        refreshBattleProjection()
      }).catch(err => {
        setBattleSyncError(friendlyError(err, 'Could not sync your added exercises.'))
      })
    }
  }

  function closePicker() {
    setPickerExiting(true)
    setTimeout(() => {
      setShowExercises(false)
      setPickerExiting(false)
      setSelected([])
      setSearchQuery('')
    }, 280)
  }

  const startFromTemplate = async (template) => {
    if (!userId || !template?.exercises?.length) return false
    setBattleSyncError('')
    if (loading || exerciseLibrary.length === 0) {
      setBattleSyncError('Workout setup is still loading.')
      return false
    }

    const matchedExercises = template.exercises
      .map(t => {
        const normalizedTemplateName = normalizeSearchValue(t.name)
        const found = exerciseLibrary.find(e => normalizeSearchValue(e.name) === normalizedTemplateName)
          || exerciseLibrary.find(e => matchesSearchQuery(t.name, e.name, e.category, e.equipment, (e.primary_muscles || []).join(' '), (e.secondary_muscles || []).join(' ')))
        if (!found) return null
        return { exercise: found, templateExercise: t }
      })
      .filter(Boolean)

    if (matchedExercises.length === 0) {
      setBattleSyncError('Could not find the exercises for this routine.')
      return false
    }

    const [{ data, error }, { data: prof }] = await Promise.all([
      supabase.from('workout_sessions').insert({ user_id: userId }).select('id').single(),
      supabase.from('profiles').select('unit_preference').eq('id', userId).single(),
    ])
    if (error || !data?.id) {
      setBattleSyncError(friendlyError(error, 'Could not start this routine.'))
      return false
    }

    setSessionId(data.id)
    const unit = prof?.unit_preference || 'lbs'
    workoutStartRef.current = battleModeActive ? getBattleWorkoutStartedAt() : Date.now()
    setSeconds(Math.max(0, Math.floor((Date.now() - workoutStartRef.current) / 1000)))
    setDefaultUnit(unit)

    const exercises = matchedExercises
      .map(({ exercise, templateExercise }) => {
        return {
          ...exercise,
          unit,
          restSeconds: exercise.default_rest_seconds ?? defaultRest,
          sets: Array.from({ length: templateExercise.sets }, () => defaultSet()),
        }
      })

    writeStoredWorkoutDraft(userId, {
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

    clearAppliedSuggestion()
    setWorkoutExercises(exercises)
    setActiveWorkout(true)
    return true
  }

  startTemplateRef.current = startFromTemplate

  const handleStartSavedRoutine = (routine) => {
    gateOnBodyweight(async () => {
      if (isPremiumSync()) {
        await startFromTemplate(routine)
        return
      }
      setPlanAdGate({ routine })
      setPlanAdGateCountdown(10)
    })
  }

  const startFromPlanDay = async (plan, day) => {
    if (!userId || !day?.exercises?.length) return false
    setPlanError('')
    setBattleSyncError('')
    const activePlanWeek = getActivePlanWeek(plan, new Date(), day.week)
    const isDeloadWeek = isScheduledDeloadWeek(plan, activePlanWeek)
    const workoutDay = isDeloadWeek
      ? applyScheduledDeloadToPlanDay(day, activePlanWeek)
      : { ...day, week: activePlanWeek }

    const [{ data, error }, { data: prof }] = await Promise.all([
      createWorkoutSession({
        source_plan_id: plan.id,
        source_plan_day_id: workoutDay.id,
        source_plan_week: activePlanWeek,
      }),
      supabase.from('profiles').select('unit_preference').eq('id', userId).single(),
    ])

    if (error) {
      setPlanError(friendlyError(error, 'Could not start this plan day.'))
      return false
    }

    const unit = prof?.unit_preference || defaultUnit || 'lbs'
    const findExercise = (planned) => {
      if (planned.exerciseId) {
        const byId = exerciseLibrary.find(ex => String(ex.id) === String(planned.exerciseId))
        if (byId) return byId
      }
      const plannedName = normalizeSearchValue(planned.name)
      return exerciseLibrary.find(ex => normalizeSearchValue(ex.name) === plannedName)
        || exerciseLibrary
          .filter(ex => matchesSearchQuery(planned.name, ex.name, ex.category, ex.equipment, (ex.primary_muscles || []).join(' '), (ex.secondary_muscles || []).join(' ')))
          .sort((a, b) => scoreExerciseMatch(planned.name, b) - scoreExerciseMatch(planned.name, a))[0]
    }

    const exercises = workoutDay.exercises
      .map(planned => {
        const found = findExercise(planned)
        if (!found) return null
        const isCardio = found.category === 'Cardio' || planned.category === 'Cardio'
        const planMetadata = {
          planSource: 'training_plan',
          planId: sanitizePlanWorkoutMetadata(plan?.id, 80),
          planName: sanitizePlanWorkoutMetadata(plan?.name, VALIDATION_LIMITS.trainingPlanNameMaxLength),
          planDayId: sanitizePlanWorkoutMetadata(workoutDay?.id, 40),
          planDayName: sanitizePlanWorkoutMetadata(workoutDay?.name, 80),
          planWeek: activePlanWeek,
          planGoal: sanitizePlanWorkoutMetadata(plan?.goal, 40),
          planTargetReps: planned.reps ? Math.max(1, Math.min(MAX_REPS, Number(planned.reps) || 0)) : null,
          planRepRange: sanitizePlanWorkoutMetadata(planned.repRange, 20),
          planPeriodizationStyle: sanitizePlanWorkoutMetadata(
            planned.periodizationStyle || planned.progression?.style || plan?.preferences?.periodization?.style || '',
            40
          ),
          planIntensityTag: sanitizePlanWorkoutMetadata(planned.intensityTag || planned.progression?.intensityTag || '', 40),
          planProgressionBias: sanitizePlanWorkoutMetadata(planned.progressionBias || planned.progression?.progressionBias || '', 40),
          planDeloadWeek: isDeloadWeek,
          planDeloadReason: isDeloadWeek ? 'scheduled' : null,
        }
        if (isCardio) {
          const setCount = Math.max(1, Math.min(Number(planned.sets) || 1, VALIDATION_LIMITS.trainingPlanMaxExercisesPerDay))
          return {
            ...found,
            ...planMetadata,
            category: 'Cardio',
            unit,
            restSeconds: planned.restSeconds ?? found.default_rest_seconds ?? defaultRest,
            sets: Array.from({ length: setCount }, () => ({
              ...defaultCardioSet(),
              duration: Math.min(Number(planned.durationSeconds) || 0, VALIDATION_LIMITS.cardioDurationMaxSeconds),
            })),
          }
        }

        const setCount = Math.max(1, Math.min(Number(planned.sets) || 3, VALIDATION_LIMITS.trainingPlanMaxExercisesPerDay))
        return {
          ...found,
          ...planMetadata,
          unit,
          restSeconds: planned.restSeconds ?? found.default_rest_seconds ?? defaultRest,
          sets: Array.from({ length: setCount }, () => defaultSet()),
        }
      })
      .filter(Boolean)

    if (!exercises.length) {
      await supabase.from('workout_sessions').delete().eq('id', data.id).eq('user_id', userId)
      setPlanError('None of the exercises in this plan day matched your exercise library.')
      return false
    }

    workoutStartRef.current = battleModeActive ? getBattleWorkoutStartedAt() : Date.now()
    setSeconds(Math.max(0, Math.floor((Date.now() - workoutStartRef.current) / 1000)))
    setDefaultUnit(unit)
    setSessionId(data.id)
    clearAppliedSuggestion()
    setWorkoutExercises(exercises)
    setExerciseNotes({})
    setNotesOpen({})
    setRestTimer(null)
    writeStoredWorkoutDraft(userId, {
      version: WORKOUT_DRAFT_VERSION,
      savedAt: Date.now(),
      sessionId: data.id,
      startedAt: workoutStartRef.current,
      workoutExercises: exercises,
      exerciseNotes: {},
      notesOpen: {},
      restTimer: null,
      defaultUnit: unit,
      defaultRest,
      sourcePlanId: plan?.id || null,
      sourcePlanDayId: workoutDay.id || null,
      sourcePlanWeek: activePlanWeek,
      sourcePlanDeloadWeek: isDeloadWeek,
    }, battleModeActive ? battleRoom?.id : null)
    setActiveWorkout(true)
    return true
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
        setBattleSyncError(friendlyError(error, 'Could not discard your saved workout.'))
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
    if (!debouncedSearchQuery.trim()) return exerciseLibrary

    return exerciseLibrary
      .filter(e =>
        matchesSearchQuery(
          debouncedSearchQuery,
          e.name,
          e.category,
          e.equipment,
          (e.primary_muscles || []).join(' '),
          (e.secondary_muscles || []).join(' ')
        )
      )
      .sort((a, b) => {
        const diff = scoreExerciseMatch(debouncedSearchQuery, b) - scoreExerciseMatch(debouncedSearchQuery, a)
        return diff !== 0 ? diff : a.name.length - b.name.length
      })
  }, [exerciseLibrary, debouncedSearchQuery])

  const addSet = (exId) => {
    setWorkoutExercises(prev => prev.map(ex => {
      if (ex.id !== exId) return ex
      if (ex.category === 'Cardio') {
        const last = ex.sets[ex.sets.length - 1]
        return { ...ex, sets: [...ex.sets, { ...defaultCardioSet(), duration: last?.duration ?? 0 }] }
      }
      const lastWorking = [...ex.sets].reverse().find(s => s.setType !== 'dropset')
      const setType = ex.supersetGroupId ? 'superset' : 'normal'
      return { ...ex, sets: [...ex.sets, { ...defaultSet(), setType, weight: lastWorking?.weight ?? '', reps: lastWorking?.reps ?? '' }] }
    }))
  }

  const pairSupersetWithExercise = (exId, targetExId) => {
    setWorkoutExercises(prev => pairExercisesAsSuperset(prev, exId, targetExId))
  }

  const clearSupersetForExercise = (exId) => {
    setWorkoutExercises(prev => clearSupersetGroupForExercise(prev, exId))
  }

  const toggleSupersetMenu = (exId) => {
    setOpenSetType(null)
    setOpenSupersetMenu(open => open?.exId === exId ? null : { exId })
  }

  const addDropSet = (exId, parentSetIdx) => {
    const currentExercise = workoutExercises.find(ex => ex.id === exId)
    const currentParent = currentExercise?.sets?.[parentSetIdx]
    const currentGroupIndex = getDropSetGroupIndexForParent(currentExercise?.sets, parentSetIdx)
    if (!currentParent || currentParent.setType === 'dropset' || currentGroupIndex == null) return
    const shouldCancelRest = Boolean(currentParent.done)

    setWorkoutExercises(prev => prev.map(ex => {
      if (ex.id !== exId) return ex
      const parentSet = ex.sets[parentSetIdx]
      if (!parentSet || parentSet.setType === 'dropset') return ex

      const groupIndex = getDropSetGroupIndexForParent(ex.sets, parentSetIdx)
      if (groupIndex == null) return ex

      const setsWithParent = ex.sets.map((s, i) =>
        i === parentSetIdx && s.setGroupIndex == null ? { ...s, setGroupIndex: groupIndex } : s
      )

      const parentWeight = Number.parseFloat(parentSet.weight)
      let dropWeight = ''
      if (Number.isFinite(parentWeight) && parentWeight > 0) {
        const rawKg = toKg(parentWeight, ex.unit) * 0.75
        const snapWeight = buildExerciseSnapWeight(
          ex.equipment, ex.unit,
          customIncrements[ex.id] ?? null,
          startingWeights[ex.id] ?? null,
          ex.bilateral ?? (ex.equipment === 'Dumbbell')
        )
        const snappedKg = snapWeight(rawKg)
        dropWeight = String(parseFloat(fromKg(snappedKg, ex.unit).toFixed(3)))
      }

      const dropSet = {
        ...defaultSet(),
        setType: 'dropset',
        setGroupIndex: groupIndex,
        weight: dropWeight,
        reps: parentSet.reps ?? '',
      }

      let insertIdx = parentSetIdx + 1
      while (
        insertIdx < setsWithParent.length &&
        setsWithParent[insertIdx].setGroupIndex === groupIndex &&
        setsWithParent[insertIdx].setType === 'dropset'
      ) insertIdx++

      return {
        ...ex,
        sets: [...setsWithParent.slice(0, insertIdx), dropSet, ...setsWithParent.slice(insertIdx)],
      }
    }))

    setStartedDropGroups(prev => {
      const next = new Set(prev)
      next.delete(`${exId}-${currentGroupIndex}`)
      return next
    })

    if (shouldCancelRest) {
      cancelRestNotification()
      setRestTimer(null)
    }
  }

  const completeDropGroup = (exId, groupIndex) => {
    const ex = workoutExercises.find(e => e.id === exId)
    if (!ex) return
    setRestTimer(createRestTimer(ex.restSeconds, ex.name))
    scheduleRestEndNotification(ex.restSeconds, ex.name)
    setStartedDropGroups(prev => new Set([...prev, `${exId}-${groupIndex}`]))
  }

  const removeSet = (exId) => {
    const ex = workoutExercises.find(item => item.id === exId)
    if (!ex) return

    const workingIndices = ex.sets.map((s, i) => s.setType !== 'dropset' ? i : -1).filter(i => i !== -1)
    if (workingIndices.length <= 1) return

    const lastWorkingIdx = workingIndices[workingIndices.length - 1]
    const removedSet = ex.sets[lastWorkingIdx]
    const groupToRemove = removedSet?.setGroupIndex

    const removedSetNumber = lastWorkingIdx + 1
    setWorkoutExercises(prev => prev.map(item => {
      if (item.id !== exId) return item
      const newSets = item.sets.filter((s, i) => {
        if (i === lastWorkingIdx) return false
        if (groupToRemove != null && s.setGroupIndex === groupToRemove && s.setType === 'dropset') return false
        return true
      })
      return newSets.length === 0 ? item : { ...item, sets: newSets }
    }))

    if (battleModeActive && userId) {
      publishBattleEvent('set_removed', {
        exerciseId: ex.id,
        exerciseName: ex.name,
        category: ex.category,
        equipment: ex.equipment,
        setNumber: removedSetNumber,
        unit: ex.unit,
        setType: removedSet?.setType ?? 'normal',
        setGroupIndex: groupToRemove ?? null,
        removeGroup: groupToRemove != null,
      }).then(() => {
        refreshBattleProjection()
      }).catch(err => {
        setBattleSyncError(friendlyError(err, 'Could not sync your removed set.'))
      })
    }
  }

  const applyProgressionSuggestion = (exId, weight, reps, appliedSuggestion) => {
    if (appliedSuggestion) {
      setAppliedSuggestionMap(prev => ({ ...prev, [exId]: appliedSuggestion }))
    }
    setWorkoutExercises(prev => prev.map(ex => {
      if (ex.id !== exId) return ex
      const activeSetIndex = ex.sets.findIndex(set => !set.done && set.setType !== 'dropset' && set.setType !== 'warmup')
      if (activeSetIndex === -1) return ex
      setSuggestionFlashKey(`${exId}-${activeSetIndex}`)
      setTimeout(() => setSuggestionFlashKey(null), 700)
      return {
        ...ex,
        sets: ex.sets.map((set, index) => {
          if (index !== activeSetIndex) return set
          return {
            ...set,
            ...(weight !== null ? { weight: String(weight) } : {}),
            ...(reps !== null ? { reps: String(reps) } : {}),
          }
        }),
      }
    }))
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

    // Determine timer and battle payload upfront from current state — avoids side-effects
    // inside the state updater (which React may call multiple times) and stale-closure reads.
    let completedSetPayload = null
    let restTimerToStart = null

    if (field === 'done' && value === true) {
      const ex = workoutExercises.find(e => e.id === exId)
      if (!ex) return

      if (ex.category === 'Cardio') {
        const duration = Number(ex.sets[setIdx]?.duration) || 0
        if (duration > 0) {
          completedSetPayload = { ex, setIdx, duration, isCardio: true }
          restTimerToStart = { seconds: ex.restSeconds, name: ex.name }
        }
      } else {
        const completedSet = ex.sets[setIdx]
        const weight = Number.parseFloat(completedSet?.weight)
        const reps = Number.parseInt(completedSet?.reps, 10)
        if (
          isWeightWithinInputRange(weight, { equipment: ex.equipment, unit: ex.unit, bodyweightKg: userBodyweightKg }) &&
          isRepsWithinInputRange(reps)
        ) {
          completedSetPayload = {
            ex,
            setIdx,
            weight,
            reps,
            setType: completedSet?.setType ?? 'normal',
            setGroupIndex: completedSet?.setGroupIndex ?? null,
          }
          const isDropSet = completedSet?.setType === 'dropset'
          const groupIndex = completedSet?.setGroupIndex
          const hasDropsInGroup = !isDropSet && groupIndex != null &&
            ex.sets.some(s => s.setGroupIndex === groupIndex && s.setType === 'dropset')
          if (!isDropSet && !hasDropsInGroup) {
            restTimerToStart = { seconds: ex.restSeconds, name: ex.name }
          }
        }
      }
    }

    if (completedSetPayload) {
      Sentry.addBreadcrumb({ category: 'workout', message: 'Set completed', data: { exerciseId: exId, setIdx }, level: 'info' })
    }

	    const activeProgressionSuggestion = (() => {
	      if (field !== 'done' || value !== true) return null
	      const applied = appliedSuggestionMap[exId]
	      if (applied?.activeSetIndex === setIdx) return applied
	      const mapped = progressionMap[exId]
	      if (mapped?.activeSetIndex === setIdx) return mapped
	      return null
	    })()

	    setWorkoutExercises(prev => prev.map(ex => {
	      if (ex.id !== exId) return ex

      if (field === 'done') {
        if (value === true) {
          if (ex.category === 'Cardio') {
            const duration = Number(ex.sets[setIdx]?.duration) || 0
            if (duration <= 0) return ex
            return markExerciseSetCompleted(ex, setIdx, { completedAtMs: Date.now(), deriveRest: false })
          }
          const completedSet = ex.sets[setIdx]
          const weight = Number.parseFloat(completedSet?.weight)
          const reps = Number.parseInt(completedSet?.reps, 10)
          if (
            !isWeightWithinInputRange(weight, { equipment: ex.equipment, unit: ex.unit, bodyweightKg: userBodyweightKg }) ||
            !isRepsWithinInputRange(reps)
	          ) return ex
	          const updated = markExerciseSetCompleted(ex, setIdx, { completedAtMs: Date.now(), deriveRest: true })
	          const completedE1rmKg = activeProgressionSuggestion?.isBodyweightOnly
	            ? null
	            : getLoggedSetEstimatedOrmKg({
	                weight,
	                reps,
	                unit: ex.unit,
	                equipment: ex.equipment,
	                bodyweightKg: userBodyweightKg,
	              })
	          const progressionEvent = resolveCompletedSetProgressionEvent({
	            suggestion: activeProgressionSuggestion,
	            completedReps: reps,
	            completedE1rmKg,
	            scheduledDeload: Boolean(ex.planDeloadWeek),
	          })
            const crossFatiguePct = Number(activeProgressionSuggestion?.crossExerciseFatiguePct) || 0
            const completedE1rm = calculateSetEstimatedOrm({
              weight,
              reps,
              unit: ex.unit,
              equipment: ex.equipment,
              bodyweightKg: userBodyweightKg,
            })
            const estimatedFresh1rm = (
              progressionEvent === 'fatigue_adjusted' &&
              !activeProgressionSuggestion?.isBodyweightOnly &&
              crossFatiguePct > 0 &&
              crossFatiguePct < 1 &&
              Number.isFinite(completedE1rm) &&
              completedE1rm > 0
            ) ? completedE1rm / (1 - crossFatiguePct) : null
	          if (progressionEvent) return {
	            ...updated,
	            sets: updated.sets.map((s, i) => i === setIdx ? { ...s, progressionEvent, estimatedFresh1rm } : s),
	          }
	          return updated
	        }
        return clearExerciseSetCompletion(ex, setIdx)
      }

	      return {
        ...ex,
        sets: ex.sets.map((set, index) => {
          if (index !== setIdx) return set
          const updated = { ...set, [field]: nextValue }
          if ((field === 'weight' || field === 'reps') && set.done && set.progressionEvent) {
            updated.progressionEvent = null
            updated.estimatedFresh1rm = null
          }
          return updated
        })
      }
	    }))

	    if (field === 'done' && value === false) {
	      clearAppliedSuggestion(exId)
	    } else if (completedSetPayload && !completedSetPayload.isCardio) {
	      clearAppliedSuggestion(exId)
	    }

	    if (restTimerToStart) {
      setRestTimer(createRestTimer(restTimerToStart.seconds, restTimerToStart.name))
      scheduleRestEndNotification(restTimerToStart.seconds, restTimerToStart.name)
    }

    const modifiedGroupIndex = workoutExercises.find(e => e.id === exId)?.sets[setIdx]?.setGroupIndex
    if (modifiedGroupIndex != null) {
      setStartedDropGroups(prev => {
        const next = new Set(prev)
        next.delete(`${exId}-${modifiedGroupIndex}`)
        return next
      })
    }

    if (completedSetPayload && battleModeActive && userId) {
      const { ex } = completedSetPayload
      const payload = completedSetPayload.isCardio
        ? {
          exerciseId: ex.id,
          exerciseName: ex.name,
          category: ex.category,
          equipment: ex.equipment,
          setNumber: setIdx + 1,
          durationSeconds: completedSetPayload.duration,
        }
        : {
          exerciseId: ex.id,
          exerciseName: ex.name,
          category: ex.category,
          equipment: ex.equipment,
          setNumber: setIdx + 1,
          weight: completedSetPayload.weight,
          reps: completedSetPayload.reps,
          unit: ex.unit,
          setType: completedSetPayload.setType,
          setGroupIndex: completedSetPayload.setGroupIndex,
        }
      publishBattleEvent('set_completed', payload).then(() => {
        refreshBattleProjection()
      }).catch(err => {
        setBattleSyncError(friendlyError(err, 'Could not sync your completed set.'))
      })
    }
  }

	  const removeExercise = (exId) => {
	    clearAppliedSuggestion(exId)
	    setWorkoutExercises(prev => removeExerciseAndRepairSupersets(prev, exId))
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
    const nameError = validateLength(name, {
      label: 'Exercise name',
      min: VALIDATION_LIMITS.customExerciseNameMinLength,
      max: VALIDATION_LIMITS.customExerciseNameMaxLength,
      required: true,
    })
    const restError = validateNumber(customExerciseForm.default_rest_seconds, {
      label: 'Rest time',
      min: VALIDATION_LIMITS.restSecondsMin,
      max: VALIDATION_LIMITS.restSecondsMax,
      integer: true,
      required: true,
    })
    if (nameError || !category || restError) {
      setCustomExerciseError(nameError || (!category ? 'Name and category are required.' : '') || restError)
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
        default_rest_seconds: Number(customExerciseForm.default_rest_seconds),
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
      }

      resetCustomExerciseForm()
      setShowCustomExerciseForm(false)
      closePicker()
      setSearchQuery('')
    } catch (err) {
      const message = err.code === '23505'
        ? 'You already have an exercise with that name.'
        : friendlyError(err, 'Could not save your custom exercise.')
      setCustomExerciseError(message)
    } finally {
      setSavingCustomExercise(false)
    }
  }

  function handleSwipeSetDelete(exId, idx) {
    const ex = workoutExercises.find(item => item.id === exId)
    if (!ex || ex.sets.length === 1) return

    const targetSet = ex.sets[idx]
    const isParentWithGroup = targetSet?.setType !== 'dropset' && targetSet?.setGroupIndex != null
    const groupToDelete = isParentWithGroup ? targetSet.setGroupIndex : null

    setWorkoutExercises(exs => exs.map(item => {
      if (item.id !== exId || item.sets.length === 1) return item
      const newSets = groupToDelete != null
        ? item.sets.filter((s, j) => j !== idx && s.setGroupIndex !== groupToDelete)
        : item.sets.filter((_, j) => j !== idx)
      return newSets.length === 0 ? item : { ...item, sets: newSets }
    }))
    if (battleModeActive && userId && ex && ex.sets.length > 1) {
      publishBattleEvent('set_removed', {
        exerciseId: ex.id,
        exerciseName: ex.name,
        category: ex.category,
        equipment: ex.equipment,
        setNumber: idx + 1,
        unit: ex.unit,
        setType: targetSet?.setType ?? 'normal',
        setGroupIndex: targetSet?.setGroupIndex ?? null,
        removeGroup: groupToDelete != null,
      }).then(() => {
        refreshBattleProjection()
      }).catch(err => {
        setBattleSyncError(friendlyError(err, 'Could not sync your removed set.'))
      })
    }
  }

  const updateRestTime = async (exId, seconds) => {
    setWorkoutExercises(prev => prev.map(e => e.id === exId ? { ...e, restSeconds: seconds } : e))
    setExerciseLibrary(prev => prev.map(e => e.id === exId ? { ...e, default_rest_seconds: seconds } : e))
    setEditingRest(null)
    await supabase.from('user_exercise_preferences')
      .upsert({ user_id: userId, exercise_id: exId, rest_seconds: seconds }, { onConflict: 'user_id,exercise_id' })
  }

  // Back gesture support for all full-screen states.
  // isVisible keeps handlers from intercepting back on other tabs.
  // Back gesture support for all full-screen states.
  // isVisible keeps handlers from intercepting back on other tabs.
  useEffect(() => {
    if (!isVisible || !detailExerciseId) return
    const id = pushBack(() => setDetailExerciseId(null))
    return () => removeBack(id)
  }, [isVisible, detailExerciseId])
  useEffect(() => {
    if (!isVisible || !showExercises) return
    const id = pushBack(closePicker)
    return () => removeBack(id)
  }, [isVisible, showExercises])
  useEffect(() => {
    if (!isVisible || !showCustomExerciseForm) return
    const id = pushBack(() => { setShowCustomExerciseForm(false); setCustomExerciseError('') })
    return () => removeBack(id)
  }, [isVisible, showCustomExerciseForm])
  useEffect(() => {
    if (!isVisible || !showRoutineBuilder) return
    const id = pushBack(closeRoutineBuilder)
    return () => removeBack(id)
  }, [isVisible, showRoutineBuilder])
  useEffect(() => {
    if (!isVisible || !showPlanBuilder) return
    const id = pushBack(closePlanBuilder)
    return () => removeBack(id)
  }, [isVisible, showPlanBuilder])
  useEffect(() => {
    if (!isVisible || !viewingTrainingPlanId) return
    const id = pushBack(closePlanDetails)
    return () => removeBack(id)
  }, [isVisible, viewingTrainingPlanId])
  useEffect(() => {
    if (!isVisible || !planReplacement) return
    const id = pushBack(closePlanReplacement)
    return () => removeBack(id)
  }, [closePlanReplacement, isVisible, planReplacement])
  useEffect(() => {
    if (!isVisible || !confirmAction) return
    const id = pushBack(() => setConfirmAction(null))
    return () => removeBack(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible, !!confirmAction])
  useEffect(() => {
    if (!isVisible || !planInfoModal) return
    const id = pushBack(() => setPlanInfoModal(null))
    return () => removeBack(id)
  }, [isVisible, planInfoModal])
  useEffect(() => {
    if (!isVisible || !plateCalc) return
    const id = pushBack(() => setPlateCalc(null))
    return () => removeBack(id)
  }, [isVisible, plateCalc])

  const planReplacementPlan = useMemo(
    () => planReplacement?.context === 'generated'
      ? generatedPlan
      : userTrainingPlans.find(plan => plan.id === planReplacement?.planId) || null,
    [generatedPlan, planReplacement?.context, planReplacement?.planId, userTrainingPlans]
  )
  const planReplacementDay = useMemo(
    () => planReplacementPlan?.days?.find(day => String(day.id) === String(planReplacement?.dayId)) || null,
    [planReplacement?.dayId, planReplacementPlan]
  )
  const planReplacementExercise = planReplacementDay?.exercises?.[planReplacement?.exerciseIndex] || null
  const planReplacementSuggestions = useMemo(() => (
    getPrioritizedReplacementExercises({
      plan: planReplacementPlan,
      day: planReplacementDay,
      exercise: planReplacementExercise,
      exerciseLibrary,
      limit: 8,
    }).map(item => ({ ...item, source: 'suggested' }))
  ), [exerciseLibrary, planReplacementDay, planReplacementExercise, planReplacementPlan])
  const planReplacementSearchResults = useMemo(() => (
    getPrioritizedReplacementExercises({
      plan: planReplacementPlan,
      day: planReplacementDay,
      exercise: planReplacementExercise,
      exerciseLibrary,
      query: planReplacementSearch,
      includeOffPlan: true,
      limit: planReplacementSearch.trim() ? 24 : 12,
    }).map(item => ({ ...item, source: 'manual' }))
  ), [exerciseLibrary, planReplacementDay, planReplacementExercise, planReplacementPlan, planReplacementSearch])

  const planInfoModalPortal = planInfoModal && typeof document !== 'undefined'
    ? createPortal(
        <div className="plan-info-overlay" onClick={() => setPlanInfoModal(null)}>
          <div className="plan-info-modal" role="dialog" aria-modal="true" aria-label={`${planInfoModal.title} info`} onClick={event => event.stopPropagation()}>
            <div className="plan-info-modal-title">{planInfoModal.title}</div>
            <div className="plan-info-modal-body">
              {(planInfoModal.items || []).map(item => <p key={item}>{item}</p>)}
            </div>
            <button className="confirm-submit plan-info-modal-ok" onClick={() => setPlanInfoModal(null)}>
              OK
            </button>
          </div>
        </div>,
        document.querySelector('.app') || document.body
      )
    : null

  const planReplacementWarningPortal = planReplacementWarning && typeof document !== 'undefined'
    ? createPortal(
        <div
          className="confirm-overlay"
          role="presentation"
          onClick={() => setPlanReplacementWarning(null)}
        >
          <div
            className="confirm-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="plan-replacement-warning-title"
            onClick={event => event.stopPropagation()}
          >
            <div id="plan-replacement-warning-title" className="confirm-title">{planReplacementWarning.warning.title}</div>
            <div className="confirm-body">{planReplacementWarning.warning.message}</div>
            <div className={`plan-replacement-warning ${planReplacementWarning.warning.level}`}>
              <AlertTriangle size={16} aria-hidden="true" />
              <span>{planReplacementWarning.warning.level === 'strong' ? 'This is a bigger plan change.' : 'This may slightly change the day balance.'}</span>
            </div>
            <div className="confirm-actions">
              <button className="confirm-keep" onClick={() => setPlanReplacementWarning(null)}>Choose Another</button>
              <button
                className="confirm-submit"
                onClick={() => savePlanReplacement(planReplacementWarning.candidate, { force: true })}
                disabled={savingPlanReplacement}
              >
                {savingPlanReplacement ? <LoadingSpinner size="xs" color="currentColor" /> : 'Replace Anyway'}
              </button>
            </div>
          </div>
        </div>,
        document.querySelector('.app') || document.body
      )
    : null

  if (detailExerciseId) {
    return (
      <Suspense fallback={<LoadingSpinner fullPage />}>
        <ExerciseDetail exerciseId={detailExerciseId} onBack={() => window.history.back()} />
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
  const canStartTemplateWorkout = !loading && exerciseLibrary.length > 0

  if (planReplacement && planReplacementPlan && planReplacementDay && planReplacementExercise) {
    const selectedId = selectedPlanReplacement?.exercise?.id
    const renderReplacementRow = (item, index) => {
      const exercise = item.exercise
      const selected = selectedId === exercise.id
      const warning = item.warning || getPlanExerciseReplacementWarning(planReplacementExercise, exercise, planReplacementPlan, planReplacementDay)
      return (
        <button
          key={`${item.source}-${exercise.id || exercise.name}`}
          type="button"
          className={`plan-replacement-row ${selected ? 'selected' : ''} ${warning ? `has-warning ${warning.level}` : ''}`}
          style={{ '--exercise-enter-delay': `${Math.min(index, 10) * 32}ms` }}
          onClick={() => setSelectedPlanReplacement({ ...item, warning })}
        >
          <div className="plan-replacement-row-main">
            <div className="plan-replacement-check" aria-hidden="true">
              {selected ? <Check size={15} /> : null}
            </div>
            <div>
              <div className="plan-replacement-name">{exercise.name}</div>
              <div className="plan-replacement-meta">{[exercise.category, exercise.equipment].filter(Boolean).join(' · ')}</div>
              <div className="plan-replacement-reason">
                {warning && <AlertTriangle size={12} aria-hidden="true" />}
                <span>{item.reason}</span>
              </div>
            </div>
          </div>
          <span className="plan-replacement-source">{item.source === 'suggested' ? 'Suggested' : 'Manual'}</span>
        </button>
      )
    }

    return (
      <div className="picker-page plan-replacement-page">
        <div className="picker-sticky-top">
          <div className="picker-header">
            <button className="back-btn" onClick={closePlanReplacement} aria-label="Back to plan details">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 5l-7 7 7 7"/>
              </svg>
            </button>
            <h2 className="picker-title">Replace {planReplacementExercise.name}</h2>
            <button
              className="add-selected-btn"
              onClick={() => savePlanReplacement()}
              disabled={!selectedPlanReplacement || savingPlanReplacement}
              style={{ opacity: !selectedPlanReplacement ? 0.45 : 1 }}
            >
              {savingPlanReplacement ? <LoadingSpinner size="xs" color="currentColor" /> : 'Replace'}
            </button>
          </div>
          <div className="plan-replacement-search-wrap">
            <Search size={16} aria-hidden="true" />
            <input
              className="picker-search plan-replacement-search"
              type="text"
              placeholder="Search all exercises..."
              value={planReplacementSearch}
              onChange={event => setPlanReplacementSearch(event.target.value)}
              maxLength={VALIDATION_LIMITS.searchMaxLength}
            />
          </div>
          {planError && <div className="battle-panel-error">{planError}</div>}
        </div>
        <div className="picker-list plan-replacement-list">
          <section className="plan-replacement-section" aria-labelledby="replacement-suggested-title">
            <div id="replacement-suggested-title" className="template-section-label">Suggested Replacements</div>
            {planReplacementSuggestions.length
              ? planReplacementSuggestions.map(renderReplacementRow)
              : <div className="plan-replacement-empty">No close replacements found for this plan setup.</div>}
          </section>
          <section className="plan-replacement-section" aria-labelledby="replacement-all-title">
            <div id="replacement-all-title" className="template-section-label">All Exercises</div>
            {planReplacementSearchResults.length
              ? planReplacementSearchResults.map(renderReplacementRow)
              : <div className="plan-replacement-empty">No exercises match that search.</div>}
          </section>
        </div>
        {planReplacementWarningPortal}
      </div>
    )
  }

  if (showCustomExerciseForm) {
    return (
      <div className="picker-page plan-builder-page">
        <div className="picker-sticky-top">
          <div className="picker-header">
            <button className="back-btn" onClick={() => { setShowCustomExerciseForm(false); setCustomExerciseError('') }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 5l-7 7 7 7"/>
              </svg>
            </button>
            <h2 className="picker-title">Custom Exercise</h2>
            <button className="add-selected-btn" onClick={handleSaveCustomExercise} disabled={savingCustomExercise}>
              {savingCustomExercise ? <LoadingSpinner size="xs" color="currentColor" /> : 'Save'}
            </button>
          </div>
        </div>
        <div className="picker-list custom-exercise-form">
          <input
            className="picker-search"
            type="text"
            placeholder="Exercise name"
            value={customExerciseForm.name}
            maxLength={VALIDATION_LIMITS.customExerciseNameMaxLength}
            onChange={e => { setCustomExerciseError(''); setCustomExerciseForm(prev => ({ ...prev, name: e.target.value })) }}
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
                min={VALIDATION_LIMITS.restSecondsMin}
                max={VALIDATION_LIMITS.restSecondsMax}
                step="1"
                inputMode="numeric"
                value={customExerciseForm.default_rest_seconds}
                onChange={e => { setCustomExerciseError(''); setCustomExerciseForm(prev => ({ ...prev, default_rest_seconds: e.target.value })) }}
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
            maxLength={VALIDATION_LIMITS.searchMaxLength}
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

  if (viewingTrainingPlan) {
    const pendingAdaptations = planAdaptations.filter(item => item.plan_id === viewingTrainingPlan.id)
    const schedule = viewingTrainingPlan.preferences?.schedule || {}
    const periodization = viewingTrainingPlan.preferences?.periodization || {}
    const adaptiveCoach = viewingTrainingPlan.preferences?.adaptiveCoach || {}
    const splitLabel = schedule.splitLabel || 'Auto'
    const progressionLabel = periodization.styleLabel || 'Double Progression'
    const deloadLabel = periodization.deloadLabel || 'Adaptive'
    const coachAutoApplyEnabled = adaptiveCoach.enabled === true && adaptiveCoach.autoApply !== false
    const savingPlanPreference = savingPlanPreferenceId === viewingTrainingPlan.id
    const qualityScore = Number(viewingTrainingPlan.preferences?.qualityScore)
    const qualityFlags = viewingTrainingPlan.preferences?.qualityFlags || []
    const equipmentLabel = viewingTrainingPlan.equipment?.length
      ? `${viewingTrainingPlan.equipment.length} equipment`
      : 'Equipment'
    const openPlanDetailInfo = (title, items) => setPlanInfoModal({
      title,
      items: items.filter(Boolean),
    })
    return (
      <>
      <div className="picker-page plan-detail-page">
        <div className="picker-sticky-top">
          <div className="picker-header">
            <button className="back-btn" onClick={closePlanDetails}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 5l-7 7 7 7"/>
              </svg>
            </button>
            <h2 className="picker-title">Plan Details</h2>
            <button className="add-selected-btn" onClick={() => openPlanBuilder(viewingTrainingPlan)}>
              Edit
            </button>
          </div>
          {planError && <div className="battle-panel-error">{planError}</div>}
        </div>

        <div className="picker-list plan-detail-list">
          <div className="plan-detail-hero">
            <div>
              <div className="battle-panel-eyebrow">{getTrainingPlanGoalLabel(viewingTrainingPlan.goal)}</div>
              <div className="plan-detail-title">{viewingTrainingPlan.name}</div>
            </div>
            <div className="plan-detail-stats">
              <button type="button" onClick={() => openPlanDetailInfo('Plan Duration', [
                `This plan is set to run for ${formatTrainingPlanDuration(viewingTrainingPlan.duration_weeks).toLowerCase()}.`,
                'Use this as the natural point to review progress or make changes.',
              ])}>{formatTrainingPlanDuration(viewingTrainingPlan.duration_weeks)}</button>
              <button type="button" onClick={() => openPlanDetailInfo('Days Per Week', [
                `This plan schedules ${viewingTrainingPlan.days_per_week} training day${viewingTrainingPlan.days_per_week === 1 ? '' : 's'} per week.`,
                'The split and volume are built around that weekly frequency.',
              ])}>{viewingTrainingPlan.days_per_week} days/week</button>
              <button type="button" onClick={() => openPlanDetailInfo('Session Length', [
                `Each workout targets about ${viewingTrainingPlan.session_minutes} minutes.`,
                'Exercise count and rest choices are kept close to that time budget.',
              ])}>{viewingTrainingPlan.session_minutes} min</button>
            </div>
            <div className="plan-detail-coach-row">
              <button type="button" onClick={() => openPlanDetailInfo(`${splitLabel} Split`, getPlanDetailSplitInfo(splitLabel, viewingTrainingPlan.preferences?.rationale?.split))}>
                {splitLabel} split
              </button>
              <button type="button" onClick={() => openPlanDetailInfo(progressionLabel, getPlanDetailProgressionInfo(progressionLabel))}>
                {progressionLabel}
              </button>
              <button type="button" onClick={() => openPlanDetailInfo(`${deloadLabel} Deload`, getPlanDetailDeloadInfo(deloadLabel))}>
                {deloadLabel} deload
              </button>
              <button type="button" onClick={() => openPlanDetailInfo('Adaptive Coach', [
                adaptiveCoach.enabled
                  ? 'Adaptive coach is on, so completed plan workouts can create review suggestions.'
                  : 'Adaptive coach is off, so the saved plan stays more static.',
              ])}>
                {adaptiveCoach.enabled ? 'Coach on' : 'Coach off'}
              </button>
              <button
                type="button"
                className={coachAutoApplyEnabled ? 'active' : ''}
                aria-pressed={coachAutoApplyEnabled}
                disabled={!adaptiveCoach.enabled || savingPlanPreference}
                onClick={() => setPlanAutoApply(viewingTrainingPlan, !coachAutoApplyEnabled)}
              >
                {savingPlanPreference
                  ? <LoadingSpinner size="xs" color="currentColor" />
                  : coachAutoApplyEnabled ? 'Auto apply on' : 'Auto apply off'}
              </button>
              {Number.isFinite(qualityScore) && (
                <button type="button" onClick={() => openPlanDetailInfo('Balance Score', getPlanDetailQualityInfo(qualityScore, qualityFlags, viewingTrainingPlan.preferences))}>
                  {Math.round(qualityScore)}/100 balance
                </button>
              )}
              <button type="button" onClick={() => openPlanDetailInfo('Equipment', [
                viewingTrainingPlan.equipment?.length
                  ? `Allowed equipment: ${viewingTrainingPlan.equipment.join(', ')}.`
                  : 'No equipment list was saved with this plan.',
                'Plan exercises are selected from this equipment pool.',
              ])}>
                {equipmentLabel}
              </button>
            </div>
          </div>

          {pendingAdaptations.length > 0 && (
            <div className="plan-detail-adaptations">
              <div className="template-section-label">Coach Review</div>
              {pendingAdaptations.map(adaptation => (
                <div key={adaptation.id || `${adaptation.plan_day_id}-${adaptation.created_at}`} className="plan-adaptation-card">
                  <div>
                    <div className="plan-adaptation-title">{adaptation.summary}</div>
                    <div className="plan-adaptation-body">{adaptation.body}</div>
                  </div>
                  <div className="plan-adaptation-actions">
                    <button
                      className="confirm-discard"
                      disabled={applyingAdaptationId === (adaptation.id ?? adaptation.plan_id)}
                      onClick={() => dismissPlanAdaptation(adaptation)}
                    >
                      Dismiss
                    </button>
                    <button
                      className="confirm-submit plan-adaptation-apply"
                      disabled={applyingAdaptationId === (adaptation.id ?? adaptation.plan_id)}
                      onClick={() => applyPendingPlanAdaptation(adaptation)}
                    >
                      {applyingAdaptationId === (adaptation.id ?? adaptation.plan_id)
                        ? <LoadingSpinner size="xs" color="currentColor" />
                        : 'Apply'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="plan-detail-days">
            {viewingTrainingPlan.days.map(day => {
              const isStartingPlanDay =
                (planAdGate?.plan?.id === viewingTrainingPlan.id &&
                  planAdGate?.day?.id === day.id) ||
                startingPlanDayKey === getStartingPlanDayKey(viewingTrainingPlan, day)
              return (
                <div key={day.id} className="plan-detail-day-card">
                  <div className="plan-detail-day-head">
                    <div>
                      <div className="template-name">{day.name}</div>
                      <div className="template-meta">
                        {[day.scheduledDay ? formatTrainingDayLabel(day.scheduledDay) : null, day.focus].filter(Boolean).join(' · ')}
                      </div>
                      <div className="template-meta plan-detail-day-counts">
                        {[`Week ${day.week || 1}`, `${day.exercises.length} exercises`, `~${day.estimatedMinutes} min`].join(' · ')}
                      </div>
                    </div>
                    <button
                      className="start-btn"
                      onClick={() => handleStartFromPlanDay(viewingTrainingPlan, day)}
                      disabled={isStartingPlanDay || !canStartTemplateWorkout}
                    >
                      {isStartingPlanDay
                        ? <LoadingSpinner size="xs" color="currentColor" />
                        : 'Start'}
                    </button>
                  </div>
                  <div className="plan-detail-exercise-list">
                    {day.exercises.map((ex, exerciseIndex) => {
                      const restLabel = formatPlannedRest(ex.restSeconds)
                      return (
                        <div key={`${day.id}-${ex.exerciseId || ex.name}-${exerciseIndex}`} className="plan-detail-exercise-row">
                          <div className="plan-detail-exercise-main">
                            <strong>{ex.name}</strong>
                            {ex.substitutedFrom?.name && (
                              <span className="plan-substitution-note">Substituted for {ex.substitutedFrom.name}</span>
                            )}
                            <span>{[ex.role, ex.category, ex.equipment].filter(Boolean).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' · ')}</span>
                          </div>
                          <div className="plan-detail-exercise-actions">
                            <div className="plan-detail-exercise-target">
                              <strong>{formatPlannedExerciseTarget(ex)}</strong>
                              {restLabel && <span>{restLabel}</span>}
                              {ex.progression?.style && <span>{formatPlanMetaLabel(ex.progression.style)}</span>}
                              {ex.intensityTag && ex.intensityTag !== 'standard' && <span>{formatPlanMetaLabel(ex.intensityTag)}</span>}
                            </div>
                            <button
                              type="button"
                              className="plan-replace-btn"
                              aria-label={`Replace exercise ${ex.name}`}
                              title="Replace exercise"
                              onClick={() => openPlanReplacement(viewingTrainingPlan, day, exerciseIndex)}
                            >
                              <RefreshCw size={15} aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          <button className="empty-workout-btn plan-detail-delete" onClick={() => requestDeleteTrainingPlan(viewingTrainingPlan)}>
            Delete Plan
          </button>
        </div>
      </div>
      {confirmDialog}
      {planAdGatePortal}
      {planPaywall}
      {planStartLoadingPortal}
      {progressionAdGatePortal}
      {progressionPaywall}
      {planInfoModalPortal}
      {bodyweightWarningDialog}
      </>
    )
  }

  if (showPlanBuilder) {
    const isPreviewStep = planBuilderStep === 3
    const stepTitle = ['Custom Plan', 'Access & Focus', 'Schedule & Progression', generatedPlan?.name || 'Plan Preview'][planBuilderStep] || 'Custom Plan'
    const stepAction = isPreviewStep ? 'Save' : planBuilderStep === 2 ? 'Generate' : 'Next'
    const canSavePlan = Boolean(generatedPlan?.days?.length) && !savingPlan
    const dayOptions = [2, 3, 4, 5, 6, 7]
    const sessionOptions = [20, 30, 40, 45, 50, 60, 75, 90, 105, 120, 150, 180]
    const durationOptions = [1, 2, 3, 4, 6, 8, 10, 12, 16, 20, 24, 32, 40, 'ongoing']
    const goBack = () => {
      if (planBuilderStep === 0) closePlanBuilder()
      else setPlanBuilderStep(prev => Math.max(0, prev - 1))
    }
    const goForward = () => {
      if (isPreviewStep) {
        saveTrainingPlan()
      } else if (planBuilderStep === 2) {
        generatePlanPreview()
      } else {
        const validationError = validateTrainingPlanForm(planForm)
        if (validationError) {
          setPlanError(validationError)
          return
        }
        setPlanError('')
        setPlanBuilderStep(prev => Math.min(3, prev + 1))
      }
    }

    return (
      <div className="picker-page plan-builder-page">
        <div className="picker-sticky-top">
          <div className="picker-header">
            <button className="back-btn" onClick={goBack}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 5l-7 7 7 7"/>
              </svg>
            </button>
            <h2 className="picker-title">{stepTitle}</h2>
            <button
              className="add-selected-btn"
              onClick={goForward}
              disabled={isPreviewStep ? !canSavePlan : false}
              style={{ opacity: isPreviewStep && !canSavePlan ? 0.4 : 1 }}
            >
              {isPreviewStep && savingPlan ? <LoadingSpinner size="xs" color="currentColor" /> : stepAction}
            </button>
          </div>
          <div className="plan-builder-progress">
            {[0, 1, 2, 3].map(step => (
              <div
                key={step}
                className={`plan-builder-progress-dot ${planBuilderStep >= step ? 'active' : ''}`}
              />
            ))}
          </div>
          {planError && <div className="battle-panel-error">{planError}</div>}
        </div>

        <div className="picker-list plan-builder-list">
          {planBuilderStep === 0 && (
            <div className="plan-builder-panel">
              <PlanInfoLabel label="Goal" helpKey="goal" onOpen={setPlanInfoModal} />
              <div className="plan-choice-grid">
                {TRAINING_PLAN_GOALS.map(goal => (
                  <button
                    key={goal.id}
                    className={`plan-choice-card ${planForm.goal === goal.id ? 'active' : ''}`}
                    onClick={() => updatePlanForm({ goal: goal.id })}
                  >
                    <span>{goal.label}</span>
                  </button>
                ))}
              </div>
              <PlanInfoLabel label="Experience" helpKey="experience" onOpen={setPlanInfoModal} />
              <div className="plan-segment-row">
                {TRAINING_PLAN_EXPERIENCE.map(level => (
                  <button
                    key={level.id}
                    className={`plan-segment-btn ${planForm.experience === level.id ? 'active' : ''}`}
                    onClick={() => updatePlanForm({ experience: level.id })}
                  >
                    {level.label}
                  </button>
                ))}
              </div>
              <PlanInfoLabel label="Days per week" helpKey="daysPerWeek" onOpen={setPlanInfoModal} />
              <div className="plan-pill-row">
                {dayOptions.map(value => (
                  <button
                    key={value}
                    className={`plan-pill ${Number(planForm.daysPerWeek) === value ? 'active' : ''}`}
                    onClick={() => updatePlanForm({ daysPerWeek: value })}
                  >
                    {value}
                  </button>
                ))}
              </div>
              <PlanInfoLabel label="Session length" helpKey="sessionLength" onOpen={setPlanInfoModal} />
              <div className="plan-pill-row">
                {sessionOptions.map(value => (
                  <button
                    key={value}
                    className={`plan-pill ${Number(planForm.sessionMinutes) === value ? 'active' : ''}`}
                    onClick={() => updatePlanForm({ sessionMinutes: value })}
                  >
                    {value}m
                  </button>
                ))}
              </div>
              <PlanInfoLabel label="Plan duration" helpKey="duration" onOpen={setPlanInfoModal} />
              <div className="plan-pill-row">
                {durationOptions.map(value => (
                  <button
                    key={value}
                    className={`plan-pill ${(value === 'ongoing' ? Number(planForm.durationWeeks) >= VALIDATION_LIMITS.trainingPlanDurationWeeksMax : Number(planForm.durationWeeks) === value) ? 'active' : ''}`}
                    onClick={() => updatePlanForm({ durationWeeks: value === 'ongoing' ? VALIDATION_LIMITS.trainingPlanDurationWeeksMax : value })}
                  >
                    {value === 'ongoing' ? 'Ongoing' : `${value}w`}
                  </button>
                ))}
              </div>
            </div>
          )}

          {planBuilderStep === 1 && (
            <div className="plan-builder-panel">
              <PlanInfoLabel label="Equipment" helpKey="equipment" onOpen={setPlanInfoModal} />
              <div className="plan-choice-grid">
                {TRAINING_PLAN_EQUIPMENT.map(item => {
                  const active = planForm.equipment.includes(item.id)
                  return (
                    <button
                      key={item.id}
                      className={`plan-choice-card ${active ? 'active' : ''}`}
                      onClick={() => {
                        const next = active
                          ? planForm.equipment.filter(id => id !== item.id)
                          : [...planForm.equipment, item.id]
                        updatePlanForm({ equipment: next })
                      }}
                    >
                      <span>{item.label}</span>
                    </button>
                  )
                })}
              </div>
              <PlanInfoLabel label="Focus Areas" helpKey="focusAreas" onOpen={setPlanInfoModal} />
              <div className="plan-chip-grid">
                {TRAINING_PLAN_FOCUS_AREAS.map(area => {
                  const active = planForm.focusAreas.includes(area)
                  return (
                    <button
                      key={area}
                      className={`plan-chip ${active ? 'active' : ''}`}
                      onClick={() => {
                        const next = active
                          ? planForm.focusAreas.filter(item => item !== area)
                          : [...planForm.focusAreas, area]
                        updatePlanForm({ focusAreas: next })
                      }}
                    >
                      {area}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {planBuilderStep === 2 && (
            <div className="plan-builder-panel">
              <PlanInfoLabel label="Schedule" helpKey="schedule" onOpen={setPlanInfoModal} />
              <div className="plan-segment-row plan-segment-row-two">
                {[
                  { id: 'flexible', label: `${planForm.daysPerWeek} flexible days` },
                  { id: 'exact', label: 'Exact weekdays' },
                ].map(option => (
                  <button
                    key={option.id}
                    className={`plan-segment-btn ${planForm.scheduleMode === option.id ? 'active' : ''}`}
                    onClick={() => updatePlanForm({ scheduleMode: option.id })}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {planForm.scheduleMode === 'exact' && (
                <>
                  <PlanInfoLabel label="Training days" helpKey="trainingDays" onOpen={setPlanInfoModal} />
                  <div className="plan-pill-row">
                    {TRAINING_PLAN_WEEKDAYS.map(day => {
                      const active = planForm.trainingDays.includes(day.id)
                      return (
                        <button
                          key={day.id}
                          className={`plan-pill ${active ? 'active' : ''}`}
                          onClick={() => {
                            const next = active
                              ? planForm.trainingDays.filter(id => id !== day.id)
                              : [...planForm.trainingDays, day.id].slice(0, planForm.daysPerWeek)
                            updatePlanForm({ trainingDays: next })
                          }}
                        >
                          {day.label}
                        </button>
                      )
                    })}
                  </div>
                </>
              )}

              <PlanInfoLabel label="Split" helpKey="split" onOpen={setPlanInfoModal} />
              <div className="plan-choice-grid">
                {TRAINING_PLAN_SPLITS.map(item => (
                  <button
                    key={item.id}
                    className={`plan-choice-card ${planForm.splitPreference === item.id ? 'active' : ''}`}
                    onClick={() => updatePlanForm({ splitPreference: item.id })}
                  >
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>

              <PlanInfoLabel label="Progression" helpKey="progression" onOpen={setPlanInfoModal} />
              <div className="plan-choice-grid">
                {TRAINING_PLAN_PERIODIZATION.map(item => (
                  <button
                    key={item.id}
                    className={`plan-choice-card ${planForm.periodizationStyle === item.id ? 'active' : ''}`}
                    onClick={() => updatePlanForm({ periodizationStyle: item.id })}
                  >
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>

              <PlanInfoLabel label="Deload Policy" helpKey="deload" onOpen={setPlanInfoModal} />
              <div className="plan-pill-row">
                {TRAINING_PLAN_DELOAD_POLICIES.map(item => (
                  <button
                    key={item.id}
                    className={`plan-pill ${planForm.deloadPolicy === item.id ? 'active' : ''}`}
                    onClick={() => updatePlanForm({ deloadPolicy: item.id })}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <PlanInfoLabel label="Block Goal" helpKey="blockGoal" onOpen={setPlanInfoModal} />
              <div className="plan-chip-grid">
                {TRAINING_PLAN_BLOCK_GOALS.map(item => (
                  <button
                    key={item.id}
                    className={`plan-chip ${planForm.blockGoal === item.id ? 'active' : ''}`}
                    onClick={() => updatePlanForm({ blockGoal: item.id })}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <PlanInfoLabel label="Adaptive Coach" helpKey="adaptiveCoach" onOpen={setPlanInfoModal} />
              <button
                className={`plan-toggle-card ${planForm.adaptiveCoach ? 'active' : ''}`}
                onClick={() => updatePlanForm({ adaptiveCoach: !planForm.adaptiveCoach })}
              >
                <span>Adaptive Coach</span>
                <strong>{planForm.adaptiveCoach ? 'On' : 'Off'}</strong>
              </button>
              <button
                type="button"
                className={`plan-toggle-card plan-toggle-card--nested ${planForm.adaptiveCoach && planForm.adaptiveCoachAutoApply ? 'active' : ''}`}
                disabled={!planForm.adaptiveCoach}
                onClick={() => {
                  if (!planForm.adaptiveCoach) return
                  updatePlanForm({ adaptiveCoachAutoApply: !planForm.adaptiveCoachAutoApply })
                }}
              >
                <span>Auto-apply adjustments</span>
                <strong>{planForm.adaptiveCoach && planForm.adaptiveCoachAutoApply ? 'On' : 'Off'}</strong>
              </button>
            </div>
          )}

          {isPreviewStep && generatedPlan && (
            <div className="plan-preview-stack">
              <div className="plan-preview-hero">
                <div>
                  <div className="battle-panel-eyebrow">{getTrainingPlanGoalLabel(generatedPlan.goal)}</div>
                  <div className="plan-preview-title">{generatedPlan.name}</div>
                </div>
                <div className="plan-preview-stats">
                  <span>{formatTrainingPlanDurationShort(generatedPlan.duration_weeks)}</span>
                  <span>{generatedPlan.days_per_week}d/wk</span>
                  <span>{generatedPlan.session_minutes}m</span>
                </div>
                <div className="plan-preview-rationale">
                  <span>{generatedPlan.preferences?.schedule?.splitLabel || 'Auto'} split</span>
                  <span>{generatedPlan.preferences?.periodization?.styleLabel || 'Double Progression'}</span>
                  <span>{generatedPlan.preferences?.periodization?.deloadLabel || 'Adaptive'} deload</span>
                  {Number.isFinite(Number(generatedPlan.preferences?.qualityScore)) && (
                    <span>{Math.round(Number(generatedPlan.preferences.qualityScore))}/100 balance</span>
                  )}
                </div>
              </div>
              {generatedPlan.days.map(day => (
                <div key={day.id} className="plan-day-preview-card">
                  <div className="plan-day-preview-head">
                    <div>
                      <div className="template-name">{day.name}</div>
                      <div className="template-meta">
                        {[day.scheduledDay ? formatTrainingDayLabel(day.scheduledDay) : null, day.focus, `~${day.estimatedMinutes} min`].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                    <span>{day.exercises.length}</span>
                  </div>
                  <div className="plan-day-exercise-list">
                    {day.exercises.map((ex, exerciseIndex) => (
                      <div key={`${day.id}-${ex.exerciseId || ex.name}-${exerciseIndex}`} className="plan-day-exercise-row plan-day-exercise-row-replaceable">
                        <div className="plan-day-exercise-main">
                          <div className="plan-day-exercise-name">{ex.name}</div>
                          {ex.substitutedFrom?.name && (
                            <div className="plan-substitution-note">Substituted for {ex.substitutedFrom.name}</div>
                          )}
                          <div className="plan-day-exercise-meta">{[ex.role, ex.category, ex.equipment].filter(Boolean).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' · ')}</div>
                        </div>
                        <div className="plan-detail-exercise-actions">
                          <div className="plan-detail-exercise-target">
                            <strong>{formatPlannedExerciseTarget(ex)}</strong>
                          </div>
                          <button
                            type="button"
                            className="plan-replace-btn"
                            aria-label={`Replace exercise ${ex.name}`}
                            title="Replace exercise"
                            onClick={() => openPlanReplacement(generatedPlan, day, exerciseIndex, { context: 'generated' })}
                          >
                            <RefreshCw size={15} aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <button className="empty-workout-btn" style={{ marginTop: 12 }} onClick={() => { setGeneratedPlan(null); setPlanBuilderStep(0) }}>
                Regenerate Inputs
              </button>
            </div>
          )}
        </div>
        {planInfoModalPortal}
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
              disabled={!routineName.trim() || routineExercises.length === 0 || savingRoutine}
              style={{ opacity: (!routineName.trim() || routineExercises.length === 0 || savingRoutine) ? 0.4 : 1 }}
            >
              {savingRoutine ? <LoadingSpinner size="xs" color="currentColor" /> : 'Save'}
            </button>
          </div>
          {routineError && <div className="battle-panel-error">{routineError}</div>}
          <input
            className="picker-search"
            type="text"
            placeholder="Routine name..."
            value={routineName}
            maxLength={VALIDATION_LIMITS.routineNameMaxLength}
            onChange={e => { setRoutineError(''); setRoutineName(e.target.value) }}
            autoFocus
          />
          <input
            className="picker-search"
            style={{ marginTop: 8 }}
            type="text"
            placeholder="Description (optional)..."
            value={routineDesc}
            maxLength={VALIDATION_LIMITS.routineDescriptionMaxLength}
            onChange={e => { setRoutineError(''); setRoutineDesc(e.target.value) }}
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
                          <div style={{ position: 'relative', flexShrink: 0 }}>
                            <button className="routine-drag-handle" {...listeners} {...attributes} onClick={() => showDragHint(ex.name)}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="18" x2="16" y2="18"/>
                              </svg>
                            </button>
                            {dragHintKey === ex.name && <div className="drag-hint-bubble">Hold &amp; drag to reorder</div>}
                          </div>
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
                <div className="battle-panel-mode">{getBattleModeLabel(battleRoom.battle_mode)} battle</div>
              </div>
              <div className="battle-panel-head-actions">
                <button className="battle-panel-toggle" onClick={toggleBattleFeed}>
                  {battleFeedHidden ? 'Show feed' : 'Hide feed'}
                </button>
                <div className="battle-panel-status">Live</div>
              </div>
            </div>
            {battleProjection && (
              <div className="battle-projection-card">
                <div className="battle-projection-top">
                  <div>
                    <div className="battle-projection-label-row">
                      <div className="battle-panel-card-label">Projected Score</div>
                      <button
                        type="button"
                        className="battle-score-info-btn"
                        aria-label="Battle score info"
                        onClick={() => setPlanInfoModal({
                          title: 'Battle Score',
                          items: getBattleScoreInfoItems(battleProjection),
                        })}
                      >
                        i
                      </button>
                    </div>
                    <div className="battle-panel-card-body">
                      {battleProjection.status === 'waiting' ? `Live weighted score out of ${battleProjection.scoreTotal || 100}.` : battleProjection.verdict}
                    </div>
                  </div>
                  <div
                    className="battle-projection-score"
                    aria-label={`Projected score ${battleProjection.points?.you ?? 0} to ${battleProjection.points?.opponent ?? 0}`}
                  >
                    <div className="battle-projection-score-side">
                      <small>You</small>
                      <span>{battleProjection.points?.you ?? 0}</span>
                    </div>
                    <div className="battle-projection-score-divider">vs</div>
                    <div className="battle-projection-score-side">
                      <small>Them</small>
                      <span>{battleProjection.points?.opponent ?? 0}</span>
                    </div>
                  </div>
                </div>
                <div className="battle-projection-metrics">
                  {battleProjection.metrics?.map(metric => (
                    <div key={metric.id} className="battle-projection-metric">
                      <span className={metric.winner === 'you' ? 'is-leading' : ''}>
                        {metric.available ? formatBattleMetricPoints(metric.yourScore) : '—'}
                      </span>
                      <strong>{metric.label}</strong>
                      <span className={metric.winner === 'opponent' ? 'is-leading' : ''}>
                        {metric.available ? formatBattleMetricPoints(metric.opponentScore) : '—'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
                  <div className="battle-readonly-badge">Their Sets</div>
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
                                  {ex.category === 'Cardio' ? ex.sets.length : ex.sets.filter(set => set.setType !== 'dropset').length} {ex.category === 'Cardio' ? 'entries' : 'sets'}
                                </div>
                              </div>
                            </div>
                            {ex.category === 'Cardio' ? (
                              <div className="set-row header-row battle-readonly-cardio-row">
                                <span className="col-set">Entry</span>
                                <span className="col-kg">Duration</span>
                                <span className="col-done"></span>
                              </div>
                            ) : (
                              <div className="set-row header-row">
                                <span className="col-set">Set</span>
                                <span className="col-kg">{ex.unit}</span>
                                <span className="col-reps">Reps</span>
                                <span className="col-done"></span>
                              </div>
                            )}
                            {ex.sets.length === 0 ? (
                              <div className="battle-readonly-empty">Exercise added. Waiting for the first logged set.</div>
                            ) : (() => {
                              const renderRemoteSetRow = (set, index) => {
                                const workingSetIndex = getWorkingSetIndexAt(ex.sets, index)
                                const displaySetType = set.setType === 'superset' ? 'normal' : (set.setType ?? 'normal')
                                const setLabel = ex.category === 'Cardio'
                                  ? String(index + 1)
                                  : set.setType === 'dropset'
                                    ? `D${ex.sets.slice(0, index).filter(ds => ds.setGroupIndex === set.setGroupIndex && ds.setType === 'dropset').length + 1}`
                                    : String((workingSetIndex ?? 0) + 1)
                                return (
                                  <div key={`${workout.userId}-${ex.key}-${index}`} className="set-row-wrapper">
                                    <div className={`set-row done battle-readonly-row${ex.category === 'Cardio' ? ' battle-readonly-cardio-row' : ''}`}>
                                      <span className="col-set">{setLabel}</span>
                                      {ex.category === 'Cardio' ? (
                                        <>
                                          <div className="col-kg set-input battle-readonly-input">{fmtDur(Number(set.duration) || 0)}</div>
                                        </>
                                      ) : (
                                        <>
                                          <div className="col-kg set-input battle-readonly-input">{set.weight || 0}</div>
                                          <div className="col-reps set-input battle-readonly-input">{set.reps || 0}</div>
                                        </>
                                      )}
                                      <div className="col-done done-btn checked battle-readonly-done">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                          <polyline points="20 6 9 17 4 12"/>
                                        </svg>
                                      </div>
                                      {ex.category !== 'Cardio' && (
                                        <span className={`set-row-type-label set-row-type-label--${displaySetType}`}>
                                          {{ normal: 'Normal Set', warmup: 'Warmup Set', dropset: 'Drop Set' }[displaySetType] ?? 'Normal Set'}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                )
                              }

                              if (ex.category === 'Cardio') return ex.sets.map(renderRemoteSetRow)

                              return groupSets(ex.sets).map(({ parentSetIdx, dropSetIdxs }) => {
                                const parentSet = ex.sets[parentSetIdx]
                                return (
                                  <div key={`${workout.userId}-${ex.key}-group-${parentSetIdx}`} className={`set-group${dropSetIdxs.length > 0 ? ' set-group--has-drops' : ''}`}>
                                    {renderRemoteSetRow(parentSet, parentSetIdx)}
                                    {dropSetIdxs.map(dropIdx => (
                                      <div key={`${workout.userId}-${ex.key}-drop-${dropIdx}`} className="set-group-drop">
                                        {renderRemoteSetRow(ex.sets[dropIdx], dropIdx)}
                                      </div>
                                    ))}
                                  </div>
                                )
                              })
                            })()}
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
          onDragStart={({ active }) => {
            const activeExercise = workoutExercises.find(exercise => exercise.id === active.id)
            const groupId = activeExercise?.supersetGroupId ?? null
            const groupMembers = groupId
              ? workoutExercises.filter(exercise => exercise.supersetGroupId === groupId)
              : []
            const isTopSupersetMember = groupMembers.length === 2 && groupMembers[0]?.id === active.id
            setWorkoutDrag({
              activeId: active.id,
              groupId: isTopSupersetMember ? groupId : null,
              delta: { x: 0, y: 0 },
            })
          }}
          onDragMove={({ delta }) => {
            setWorkoutDrag(current => current
              ? { ...current, delta: delta || { x: 0, y: 0 } }
              : current)
          }}
          onDragCancel={() => setWorkoutDrag(null)}
          onDragEnd={({ active, over }) => {
            setWorkoutDrag(null)
            if (!over || active.id === over.id) return
            setWorkoutExercises(prev => moveWorkoutExerciseForDrag(prev, active.id, over.id))
          }}
        >
          <SortableContext items={workoutExercises.map(e => e.id)} strategy={verticalListSortingStrategy}>
            {workoutExercises.map(ex => {
              const supersetMeta = supersetDisplay.byExerciseId[ex.id]
              const isInSuperset = Boolean(supersetMeta)
              const supersetPartner = ex.supersetGroupId
                ? workoutExercises.find(item => item.id !== ex.id && item.supersetGroupId === ex.supersetGroupId)
                : null
              const supersetOptions = ex.category !== 'Cardio'
                ? workoutExercises.filter(item => item.id !== ex.id && item.category !== 'Cardio')
                : []
              const showSupersetAction = supersetOptions.length > 0
              const supersetBlockClass = supersetMeta
                ? ` exercise-block--superset${supersetMeta.isAdjacent ? ' exercise-block--superset-adjacent' : ''}${supersetMeta.isFirstMember ? ' exercise-block--superset-first' : ''}${supersetMeta.isLastMember ? ' exercise-block--superset-last' : ''}`
                : ''
              const isBottomSupersetMember = Boolean(supersetMeta?.isLastMember)
              const supersetShellClass = supersetMeta?.isAdjacent
                ? `${supersetMeta.isFirstMember ? 'sortable-exercise-shell--superset-first' : ''}${supersetMeta.isLastMember ? ' sortable-exercise-shell--superset-last' : ''}`.trim()
                : ''
              const followSupersetDrag = workoutDrag?.groupId === supersetMeta?.groupId && supersetMeta?.isLastMember
                ? workoutDrag.delta
                : null
              const sortableShellClass = [
                supersetShellClass,
                followSupersetDrag ? 'sortable-exercise-shell--superset-following' : '',
              ].filter(Boolean).join(' ')
              return (
              <Fragment key={ex.id}>
              <SortableExerciseBlock
                id={ex.id}
                className={sortableShellClass}
                disabled={isBottomSupersetMember}
                followTransform={followSupersetDrag}
              >
                {({ listeners, attributes, isDragDisabled }) => (
          <div className={`exercise-block${supersetBlockClass}`} data-tab-swipe-ignore="true">
            {supersetMeta && <span className="superset-member-pill superset-member-pill--corner">{supersetMeta.memberLabel}</span>}
            {supersetMeta?.isFirstMember && supersetMeta.isAdjacent && (
              <span className="superset-link-indicator" aria-hidden="true">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="5" y="11" width="14" height="9" rx="2" />
                  <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                </svg>
              </span>
            )}
            <button className="remove-exercise-btn" onClick={() => setDeleteConfirmExId(ex.id)}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                <path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
              </svg>
            </button>
            {deleteConfirmExId === ex.id && (
              <div className="exercise-delete-confirm">
                <span className="exercise-delete-confirm-text">Remove exercise?</span>
                <div className="exercise-delete-confirm-actions">
                  <button className="exercise-delete-cancel" onClick={() => setDeleteConfirmExId(null)}>Cancel</button>
                  <button className="exercise-delete-remove" onClick={() => { removeExercise(ex.id); setDeleteConfirmExId(null) }}>Remove</button>
                </div>
              </div>
            )}
            <div className="exercise-block-name">{ex.name}</div>
            <div className="exercise-meta-row">
              <span className="exercise-category-tag">{ex.category}</span>
              {(ex.equipment === 'Dumbbell' || ex.name === 'Cable Lateral Raise') && (
                <span className="db-per-side-pill">per side</span>
              )}
            </div>
            <div className="exercise-block-header">
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <button
                  className={`drag-handle${isDragDisabled ? ' drag-handle--locked' : ''}`}
                  {...listeners}
                  {...attributes}
                  disabled={isDragDisabled}
                  onClick={isDragDisabled ? undefined : () => showDragHint(ex.id)}
                  title={isDragDisabled ? 'Remove superset to reorder this exercise' : 'Hold and drag to reorder'}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="18" x2="16" y2="18"/>
                  </svg>
                </button>
                {!isDragDisabled && dragHintKey === ex.id && <div className="drag-hint-bubble">Hold &amp; drag to reorder</div>}
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
                  <span className="set-count">{ex.sets.filter(s => s.setType !== 'dropset').length} {ex.category === 'Cardio' ? 'entries' : 'sets'}</span>
                  <button className="set-ctrl-btn add" onClick={() => addSet(ex.id)}>+</button>
                </div>
              </div>
            </div>

            <div className="rest-time-row">
              <span className="rest-time-label">Rest</span>
              <button className="rest-time-btn" onClick={() => setEditingRest(editingRest === ex.id ? null : ex.id)}>
                {fmtRest(ex.restSeconds)}
              </button>
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                {editingRest === ex.id && (
                  <button className="rest-done-btn" style={{ marginLeft: 0 }} onClick={() => updateRestTime(ex.id, ex.restSeconds)}>Done</button>
                )}
                {ex.id && (
                  <button className="info-btn info-btn-sm" onClick={e => { e.stopPropagation(); setDetailExerciseId(ex.id) }}>i</button>
                )}
              </div>
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
                maxLength={VALIDATION_LIMITS.exerciseNoteMaxLength}
                rows={3}
              />
            )}

            {ex.category !== 'Cardio' && getPlanTargetLabel(ex) && (
              <div className="plan-target-hint">
                <span>{getPlanTargetLabel(ex)}</span>
                {ex.planDayName && <span>{ex.planDayName}</span>}
              </div>
            )}

            {ex.category !== 'Cardio' && progressionUnlocked && (
              historyStatusMap[ex.id] === 'error'
                ? (
                  <button
                    type="button"
                    className="history-error-row"
                    aria-label={`Retry history for ${ex.name}`}
                    onClick={() => retryExerciseHistory(ex)}
                  >
                    {renderHistoryRetryIcon()}
                    <span>History unavailable</span>
                  </button>
                )
                : (historyStatusMap[ex.id] === 'loading' || !(ex.id in historyStatusMap))
                ? <div className="progression-suggestion-skeleton" aria-hidden="true" />
                : progressionMap[ex.id] && (
                  <ProgressionSuggestion
                    suggestion={progressionMap[ex.id]}
                    unitPreference={ex.unit}
                    onApply={(weight, reps, suggestion) => applyProgressionSuggestion(ex.id, weight, reps, suggestion)}
                    equipment={ex.equipment}
                    exerciseId={ex.id}
                    customIncrementKg={customIncrements[ex.id] ?? null}
                    onIncrementChange={(exerciseId, kg) => {
                      setCustomIncrementKg(exerciseId, kg)
                      setCustomIncrements(prev => {
                        const next = { ...prev }
                        if (kg == null) delete next[exerciseId]
                        else next[exerciseId] = kg
                        return next
                      })
                    }}
                    customStartingWeightKg={startingWeights[ex.id] ?? null}
                    onStartingWeightChange={(exerciseId, kg) => {
                      setCustomStartingWeightKg(exerciseId, kg)
                      setStartingWeights(prev => {
                        const next = { ...prev }
                        if (kg == null) delete next[exerciseId]
                        else next[exerciseId] = kg
                        return next
                      })
                    }}
                    bilateral={ex.bilateral ?? (ex.equipment === 'Dumbbell')}
                  />
                )
            )}

            {ex.category === 'Cardio' ? (
              <div className="set-row cardio-row header-row">
                <span className="col-set">Set</span>
                <span className="col-prev">Previous</span>
                <span className="col-kg">Duration</span>
                <span className="col-done"></span>
              </div>
            ) : (
              <div className="set-row header-row">
                <span className="col-set">Set</span>
                <span className="col-prev">Previous</span>
                <span></span>
                <span className="col-kg">{ex.unit}{(ex.equipment === 'Dumbbell' || ex.name === 'Cable Lateral Raise') && <span className="db-per-hint">per side</span>}</span>
                <span className="col-reps">Reps</span>
                <span className="col-done"></span>
              </div>
            )}

            {(() => {
              const renderSetRow = (s, i) => {
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
                onTouchStart: e => handleSetTouchStart(ex.id, i, e),
                onTouchMove: e => handleSetTouchMove(ex.id, i, e),
                onTouchEnd: () => handleSetTouchEnd(ex.id, i),
                onTouchCancel: handleSetTouchCancel,
              }
              const rowStyle = { transform: `translateX(${dx}px)`, transition: isActive ? 'none' : 'transform 0.2s ease' }

              if (ex.category === 'Cardio') {
                const isPickerOpen = editingCardioDuration?.exId === ex.id && editingCardioDuration?.idx === i
                const durSecs = Number(s.duration) || 0
                const durationValid = durSecs > 0
                const durHrs = Math.floor(durSecs / 3600)
                const durMins = Math.floor((durSecs % 3600) / 60)
                const durSecRem = durSecs % 60
                const fmtDur = (total) => {
                  const h = Math.floor(total / 3600)
                  const m = Math.floor((total % 3600) / 60)
                  const sc = total % 60
                  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sc).padStart(2, '0')}`
                  return `${m}:${String(sc).padStart(2, '0')}`
                }
                const setDur = (total) => updateSet(ex.id, i, 'duration', Math.max(0, Math.min(VALIDATION_LIMITS.cardioDurationMaxSeconds, total)))
                return (
                  <div key={i} className="set-row-wrapper" {...swipeProps}>
                    {deleteBg}
                    <div className={`set-row cardio-row ${s.done ? 'done' : ''}`} style={rowStyle}>
                      <span className="col-set">{i + 1}</span>
                      <span className="col-prev">
                        {(() => {
                          const historyStatus = historyStatusMap[ex.id]
                          if (historyStatus === 'error') {
                            return (
                              <button
                                type="button"
                                className="col-prev-retry"
                                aria-label={`Retry history for ${ex.name}`}
                                onClick={() => retryExerciseHistory(ex)}
                              >
                                {renderHistoryRetryIcon()}
                              </button>
                            )
                          }
                          if (historyStatus === 'loading' || !(ex.id in historyStatusMap)) return <span className="col-prev-skeleton" aria-hidden="true" />
                          const p = prevSetsMap[ex.id]?.[i]
                          if (!p || !p.duration_seconds) return '—'
                          return fmtDur(p.duration_seconds)
                        })()}
                      </span>
                      <button
                        className={`cardio-duration-btn${isPickerOpen ? ' open' : ''}`}
                        disabled={s.done}
                        onClick={() => setEditingCardioDuration(isPickerOpen ? null : { exId: ex.id, idx: i })}
                      >
                        {durationValid ? fmtDur(durSecs) : '0:00'}
                      </button>
                      <button className={`col-done done-btn ${s.done ? 'checked' : ''}`} disabled={!s.done && !durationValid} onClick={() => { updateSet(ex.id, i, 'done', !s.done); setEditingCardioDuration(null) }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      </button>
                    </div>
                    {isPickerOpen && !s.done && (
                      <div className="cardio-duration-panel">
                        <div className="rtp">
                          <div className="rtp-unit">
                            <button className="rtp-btn" onClick={() => setDur((durHrs + 1) * 3600 + durMins * 60 + durSecRem)}>+</button>
                            <span className="rtp-val">{durHrs}</span>
                            <button className="rtp-btn" onClick={() => setDur(Math.max(0, durHrs - 1) * 3600 + durMins * 60 + durSecRem)}>−</button>
                            <span className="rtp-label">hr</span>
                          </div>
                          <span className="rtp-colon">:</span>
                          <div className="rtp-unit">
                            <button className="rtp-btn" onClick={() => {
                              const nm = durMins + 1 >= 60 ? 0 : durMins + 1
                              const nh = durMins + 1 >= 60 ? durHrs + 1 : durHrs
                              setDur(nh * 3600 + nm * 60 + durSecRem)
                            }}>+</button>
                            <span className="rtp-val">{durMins}</span>
                            <button className="rtp-btn" onClick={() => {
                              const nm = durMins - 1 < 0 ? (durHrs > 0 ? 59 : 0) : durMins - 1
                              const nh = durMins - 1 < 0 ? Math.max(0, durHrs - 1) : durHrs
                              setDur(nh * 3600 + nm * 60 + durSecRem)
                            }}>−</button>
                            <span className="rtp-label">min</span>
                          </div>
                          <span className="rtp-colon">:</span>
                          <div className="rtp-unit">
                            <button className="rtp-btn" onClick={() => {
                              const ns = durSecRem + 5 >= 60 ? 0 : durSecRem + 5
                              const nm = durSecRem + 5 >= 60 ? (durMins + 1 >= 60 ? 0 : durMins + 1) : durMins
                              const nh = durSecRem + 5 >= 60 && durMins + 1 >= 60 ? durHrs + 1 : durHrs
                              setDur(nh * 3600 + nm * 60 + ns)
                            }}>+</button>
                            <span className="rtp-val">{String(durSecRem).padStart(2, '0')}</span>
                            <button className="rtp-btn" onClick={() => {
                              const ns = durSecRem - 5 < 0 ? 55 : durSecRem - 5
                              const nm = durSecRem - 5 < 0 ? (durMins - 1 < 0 ? (durHrs > 0 ? 59 : 0) : durMins - 1) : durMins
                              const nh = durSecRem - 5 < 0 && durMins - 1 < 0 ? Math.max(0, durHrs - 1) : durHrs
                              setDur(nh * 3600 + nm * 60 + ns)
                            }}>−</button>
                            <span className="rtp-label">sec</span>
                          </div>
                        </div>
                      </div>
                    )}
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
              const hasPlateCalculator = PLATE_CALCULATOR_EQUIPMENT.has(ex.equipment) || ex.equipment === 'Bodyweight'
              const workingSetIndex = getWorkingSetIndexAt(ex.sets, i)
              const weightWarning = !s.done && s.weight !== '' && Number.isFinite(enteredWeight) && !weightValid
                ? (enteredWeight > maxWeight ? `Max ${maxWeight}` : `Min ${minWeight}`)
                : null
              const repsWarning = !s.done && s.reps !== '' && !Number.isNaN(enteredReps) && !repsValid
                ? (enteredReps > MAX_REPS ? `Max ${MAX_REPS} reps` : null)
                : null
              const displaySetType = s.setType === 'superset' ? 'normal' : (s.setType ?? 'normal')
              return (
              <div key={i} className={`set-row-wrapper${openSetType?.key === `${ex.id}-${i}` ? ' set-row-wrapper--menu-open' : ''}`} {...swipeProps}>
                {deleteBg}
                <div
                  className={`set-row ${s.done ? 'done' : ''} ${hasPlateCalculator ? 'plate-row' : ''} ${suggestionFlashKey === `${ex.id}-${i}` ? 'suggestion-flash' : ''}`}
                  style={rowStyle}
                >
                <span className="col-set">{
                  s.setType === 'dropset'
                    ? `D${ex.sets.slice(0, i).filter(ds => ds.setGroupIndex === s.setGroupIndex && ds.setType === 'dropset').length + 1}`
                    : String((workingSetIndex ?? 0) + 1)
                }</span>
                {(() => {
                  if (s.setType === 'dropset') return <span className="col-prev">—</span>
                  const historyStatus = historyStatusMap[ex.id]
                  if (historyStatus === 'error') {
                    return (
                      <span className="col-prev">
                        <button
                          type="button"
                          className="col-prev-retry"
                          aria-label={`Retry history for ${ex.name}`}
                          onClick={() => retryExerciseHistory(ex)}
                        >
                          {renderHistoryRetryIcon()}
                        </button>
                      </span>
                    )
                  }
                  if (historyStatus === 'loading' || !(ex.id in historyStatusMap)) return <span className="col-prev"><span className="col-prev-skeleton" aria-hidden="true" /></span>
                  const p = workingSetIndex !== null ? prevSetsMap[ex.id]?.[workingSetIndex] : null
                  if (!p) return <span className="col-prev">—</span>
                  const w = p.unit === ex.unit ? p.weight
                    : p.unit === 'lbs' ? Math.round(p.weight * 0.453592 * 10) / 10
                    : Math.round(p.weight * 2.20462 * 10) / 10
                  return (
                    <button
                      className="col-prev col-prev-btn"
                      disabled={s.done}
                      onClick={() => {
                        updateSet(ex.id, i, 'weight', String(w))
                        updateSet(ex.id, i, 'reps', String(p.reps))
                        if (p.setType === 'warmup') updateSet(ex.id, i, 'setType', 'warmup')
                      }}
                    >
                      {w} × {p.reps}
                    </button>
                  )
                })()}
                <div className="set-type-wrap">
                  {s.setType === 'dropset' ? (
                    <button
                      className="set-type-btn drop-delete-btn"
                      onClick={() => handleSwipeSetDelete(ex.id, i)}
                      title="Remove drop set"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                        <path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                      </svg>
                    </button>
                  ) : (
                    <button
                      className={`set-type-btn set-type-btn--${displaySetType}${displaySetType !== 'normal' ? ' active' : ''}`}
                      onClick={() => {
                        const key = `${ex.id}-${i}`
                        setOpenSupersetMenu(null)
                        setOpenSetType(o => o?.key === key ? null : { key, exId: ex.id, setIdx: i })
                      }}
                    >
                      {{ normal: 'N', warmup: 'W' }[displaySetType] ?? 'N'}
                    </button>
                  )}
                  {openSetType?.key === `${ex.id}-${i}` && (
                    <div className="set-type-dropdown">
                      {[
                        { type: 'normal', label: 'Normal Set', letter: 'N' },
                        { type: 'warmup', label: 'Warmup Set', letter: 'W' },
                      ].map(({ type, label, letter }) => {
                        const currentType = displaySetType
                        return (
                          <button
                            key={type}
                            className={`set-type-option${currentType === type ? ' selected' : ''}`}
                            onClick={() => { updateSet(ex.id, i, 'setType', type); setOpenSetType(null) }}
                          >
                            <span className="set-type-option-letter">{letter}</span>
                            {label}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
                <div className="col-kg-wrap">
                  <input
                    className="set-input"
                    type={minWeight < 0 ? 'text' : 'number'}
                    inputMode={minWeight < 0 ? 'text' : 'decimal'}
                    value={s.weight}
                    placeholder="0"
                    min={String(minWeight)}
                    max={String(maxWeight)}
                    disabled={s.done}
                    onChange={e => updateSet(ex.id, i, 'weight', minWeight < 0 ? e.target.value.replace(/[^0-9.-]/g, '') : e.target.value)}
                  />
                  {hasPlateCalculator && !s.done && (
                    <button
                      className="plate-icon-btn"
                      onClick={() => setPlateCalc({ exId: ex.id, setIndex: i })}
                      title="Plate calculator"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="10" width="4" height="4" rx="1"/><rect x="18" y="10" width="4" height="4" rx="1"/>
                        <rect x="6" y="7" width="3" height="10" rx="1"/><rect x="15" y="7" width="3" height="10" rx="1"/>
                        <line x1="9" y1="12" x2="15" y2="12"/>
                      </svg>
                    </button>
                  )}
                </div>
                <input className="col-reps set-input" type="number" inputMode="numeric" value={s.reps} placeholder="10" min="0" max={String(MAX_REPS)} disabled={s.done} onChange={e => updateSet(ex.id, i, 'reps', e.target.value)}/>
                <button className={`col-done done-btn ${s.done ? 'checked' : ''}`} disabled={!s.done && (!weightValid || !repsValid)} onClick={() => updateSet(ex.id, i, 'done', !s.done)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </button>
                <span className={`set-row-type-label set-row-type-label--${displaySetType}`}>
                  {{ normal: 'Normal Set', warmup: 'Warmup Set', dropset: 'Drop Set' }[displaySetType] ?? 'Normal Set'}
                </span>
                </div>
              {(weightWarning || repsWarning) && (
                <div className="set-row-warnings">
                  {weightWarning && <span className="set-row-warning">{weightWarning}</span>}
                  {repsWarning && <span className="set-row-warning">{repsWarning}</span>}
                </div>
              )}
              </div>
              )
              }
              return groupSets(ex.sets).map(({ parentSetIdx, dropSetIdxs }) => {
                const parentSet = ex.sets[parentSetIdx]
                const hasDrops = dropSetIdxs.length > 0
                const allDropsDone = dropSetIdxs.every(idx => ex.sets[idx].done)
                const canComplete = parentSet.done && hasDrops && allDropsDone
                const restStarted = startedDropGroups.has(`${ex.id}-${parentSet.setGroupIndex}`)
                return (
                  <div key={`group-${parentSetIdx}`} className={`set-group${hasDrops ? ' set-group--has-drops' : ''}`}>
                    {renderSetRow(parentSet, parentSetIdx)}
                    {dropSetIdxs.map(dropIdx => (
                      <div key={dropIdx} className="set-group-drop">
                        {renderSetRow(ex.sets[dropIdx], dropIdx)}
                      </div>
                    ))}
                    {ex.category !== 'Cardio' && (
                      <div className="set-group-actions">
                        <button className="add-drop-btn" onClick={() => addDropSet(ex.id, parentSetIdx)}>+ Drop Set</button>
                        {hasDrops && parentSet.done && (
                          <button
                            className={`complete-drop-btn${canComplete && !restStarted ? '' : ' disabled'}`}
                            disabled={!canComplete || restStarted}
                            onClick={() => completeDropGroup(ex.id, parentSet.setGroupIndex)}
                          >Complete Drop Sets</button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })
            })()}
            {showSupersetAction && (
              <div className="superset-action-wrap">
                <button
                  className={`superset-action-btn${isInSuperset ? ' active' : ''}`}
                  onClick={() => toggleSupersetMenu(ex.id)}
                  title={isInSuperset ? 'Change or remove superset' : 'Superset with another exercise'}
                  aria-label={isInSuperset ? 'Change or remove superset' : 'Superset with another exercise'}
                >
                  <span aria-hidden="true" />
                  <span className="superset-action-text">
                    <span className="superset-action-main">Superset with</span>
                    <span className="superset-action-partner">
                      {isInSuperset ? (supersetPartner?.name || 'linked exercise') : 'Choose exercise'}
                    </span>
                  </span>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="m6 9 6 6 6-6"/>
                  </svg>
                </button>
                {openSupersetMenu?.exId === ex.id && (
                  <div className="superset-menu">
                    <div className="superset-menu-title">Superset with</div>
                    {supersetPartner && (
                      <button
                        className="superset-menu-option superset-menu-option--remove"
                        onClick={() => {
                          clearSupersetForExercise(ex.id)
                          setOpenSupersetMenu(null)
                        }}
                      >
                        <span className="superset-menu-option-name">Remove superset</span>
                      </button>
                    )}
                    {supersetPartner && <div className="superset-menu-divider" />}
                    <div className="superset-menu-options">
                      {supersetOptions.map(option => {
                        const selected = option.id === supersetPartner?.id
                        return (
                          <button
                            key={option.id}
                            className={`superset-menu-option${selected ? ' selected' : ''}`}
                            onClick={() => {
                              pairSupersetWithExercise(ex.id, option.id)
                              setOpenSupersetMenu(null)
                            }}
                          >
                            <span className="superset-menu-option-name">{option.name}</span>
                            <span className="superset-menu-option-meta">{option.equipment}</span>
                            {selected && (
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <polyline points="20 6 9 17 4 12"/>
                              </svg>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
                )}
              </SortableExerciseBlock>
              </Fragment>
              )
            })}
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
        document.querySelector('.app') || document.body
      )}
      {confirmDialog}
      {bodyweightWarningDialog}
      {planInfoModalPortal}
      {planAdGatePortal}
      {planPaywall}
      {planStartLoadingPortal}
      {progressionAdGatePortal}
      {progressionPaywall}
      {plateCalc && (() => {
        const pcEx = workoutExercises.find(e => e.id === plateCalc.exId)
        const pcSet = pcEx?.sets[plateCalc.setIndex]
        if (!pcEx || !pcSet) return null
        return (
          <PlateCalculator
            unit={pcEx.unit}
            equipment={pcEx.equipment}
            currentWeight={Number(pcSet.weight) || 0}
            onConfirm={total => {
              updateSet(plateCalc.exId, plateCalc.setIndex, 'weight', String(total))
              setPlateCalc(null)
            }}
            onClose={() => setPlateCalc(null)}
          />
        )
      })()}
      </>
    )
  }

  // Default — pre-workout screen
  if (battleModeActive) {
    return (
      <>
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
      {planPaywall}
      {planStartLoadingPortal}
      {progressionAdGatePortal}
      {progressionPaywall}
      </>
    )
  }

  return (
    <>
    <div className="workout-screen">
      {trainingLoadAdvisory}
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
                {savedWorkoutDraftBusy ? <LoadingSpinner size="xs" color="currentColor" /> : 'Discard'}
              </button>
              <button className="confirm-submit" onClick={resumeSavedWorkout} disabled={savedWorkoutDraftBusy}>
                {savedWorkoutDraftBusy ? <LoadingSpinner size="xs" color="currentColor" /> : 'Resume'}
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
          {planError && <div className="battle-panel-error">{planError}</div>}
          {battleSyncError && <div className="battle-panel-error">{battleSyncError}</div>}
          {userTrainingPlans.length > 0 && (
            <>
              <div className="template-section-label">My Plans</div>
              {userTrainingPlans.map(plan => (
                <div key={plan.id} className="saved-plan-card">
                  <div className="saved-plan-head">
                    <div>
                      <div className="battle-panel-eyebrow">{getTrainingPlanGoalLabel(plan.goal)}</div>
                      <div className="saved-plan-title">{plan.name}</div>
                    </div>
                  </div>
                  <div className="saved-plan-compact-row">
                    <div className="saved-plan-focus">
                      {plan.days.map(day => day.focus || day.name).join(' / ')}
                    </div>
                    <div className="saved-plan-actions">
                      <button className="start-btn" onClick={() => openPlanDetails(plan)}>
                        View Details
                      </button>
                      <button className="template-icon-btn" onClick={() => openPlanBuilder(plan)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                      <button
                        className="template-icon-btn template-icon-btn-danger"
                        aria-label={`Delete ${plan.name}`}
                        onClick={() => requestDeleteTrainingPlan(plan)}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                          <path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                  {(() => {
                    const progress = planProgressMap[plan.id]
                    const doneIds = progress?.thisWeekDoneIds ?? new Set()
                    const nextDay = progress?.nextDay ?? plan.days[0]
                    const isStartingNextSession =
                      (planAdGate?.plan?.id === plan.id &&
                        (!nextDay || planAdGate?.day?.id === nextDay.id)) ||
                      (nextDay && startingPlanDayKey === getStartingPlanDayKey(plan, nextDay))
                    return (
                      <div className="saved-plan-next-row">
                        <div className="saved-plan-week-dots">
                          {plan.days.map(day => (
                            <span
                              key={day.id}
                              className={`saved-plan-dot${doneIds.has(day.id) ? ' done' : ''}`}
                              title={day.focus || day.name}
                            />
                          ))}
                        </div>
                        <button
                          className="saved-plan-next-btn"
                          onClick={() => handleStartNextSession(plan)}
                          disabled={isStartingNextSession || !canStartTemplateWorkout}
                        >
                          {isStartingNextSession
                            ? <LoadingSpinner size="xs" color="currentColor" />
                            : 'Start Next Session'}
                        </button>
                      </div>
                    )
                  })()}
                </div>
              ))}
            </>
          )}
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
                    onTouchEnd={() => handleTemplateTouchEnd(r.id, () => requestDeleteRoutine(r))}
                    onTouchCancel={handleTemplateTouchCancel}
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
                      <button
                        className="template-icon-btn template-icon-btn-danger"
                        aria-label={`Delete ${r.name}`}
                        onClick={() => requestDeleteRoutine(r)}
                      >
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
                        <button
                          className="start-btn"
                          onClick={() => handleStartSavedRoutine(r)}
                          disabled={planAdGate?.routine?.id === r.id || !canStartTemplateWorkout}
                        >
                          {planAdGate?.routine?.id === r.id
                            ? <LoadingSpinner size="xs" color="currentColor" />
                            : 'Start'}
                        </button>
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
                onTouchEnd={() => handleTemplateTouchEnd(t.id, () => requestHideTemplate(t))}
                onTouchCancel={handleTemplateTouchCancel}
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
                  <button
                    className="template-icon-btn template-icon-btn-danger"
                    aria-label={`Hide ${t.name}`}
                    onClick={() => requestHideTemplate(t)}
                  >
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
                    <button className="start-btn" onClick={() => handleStartSavedRoutine(t)} disabled={!canStartTemplateWorkout}>Start</button>
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
              handleEmptyWorkoutStart()
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
          <button className="empty-workout-btn" onClick={() => openPlanBuilder()}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18h6"/>
              <path d="M10 22h4"/>
              <path d="M12 2a7 7 0 0 0-4 12.74V17h8v-2.26A7 7 0 0 0 12 2z"/>
            </svg>
            Custom Plan
          </button>
        </div>
      </div>
    </div>
    {confirmDialog}
    {bodyweightWarningDialog}
    {planAdGatePortal}
    {planPaywall}
    {planStartLoadingPortal}
    {progressionAdGatePortal}
    {progressionPaywall}
    </>
  )
}
