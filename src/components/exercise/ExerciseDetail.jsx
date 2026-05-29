import { useState, useEffect, useCallback, useEffectEvent, useRef } from 'react'
import Model from 'react-body-highlighter'
import { supabase } from '../../lib/supabase'
import { fetchExerciseRankStates } from '../../data/rankStates'
import { useCurrentUserId } from '../../context/UserContext'
import { CHART_PERIOD_OPTIONS, filterByChartPeriod, getChartPeriodLabel } from '../../lib/chartPeriods'
import RankBadge from '../RankBadge'
import LoadingSpinner from '../LoadingSpinner'
import ExerciseChart from './ExerciseChart'
import {
  TIERS, TIER_GROUPS, TIER_COLORS,
  tierGroup, tierColor,
  expandAnchors, getTierIdx, getProgress, weightForOrm,
  getAnchors, anchorsOrNull,
} from '../../lib/strengthStandards'
import {
  ALL_TIME_RANK_MODE,
  ACTIVE_RANK_MODE,
  applyInactivityDecay,
  getContinuousTierScore,
  inferRatioFromScore,
  resolveTierFromScore,
} from '../../lib/rollingRanks'
import { getSetTrainingVolumeKg } from '../../lib/liftMath'
import './ExerciseDetail.css'

const EXERCISE_DAILY_ORM_POINTS_RPC = 'get_exercise_daily_orm_points'
const EXERCISE_HISTORY_SUMMARY_RPC = 'get_exercise_history_summary'

// Maps our DB muscle names to the closest library regions.
const MUSCLE_MAP = {
  'Chest': ['chest'],
  'Upper Chest': ['chest'],
  'Lower Chest': ['chest'],
  'Triceps': ['triceps'],
  'Front Delts': ['front-deltoids'],
  // Light the full shoulder cap for lateral delt work.
  'Lateral Delts': ['front-deltoids', 'back-deltoids'],
  'Rear Delts': ['back-deltoids'],
  'Shoulders': ['front-deltoids', 'back-deltoids'],
  'Quads': ['quadriceps'],
  'Glutes': ['gluteal'],
  'Hamstrings': ['hamstring'],
  'Core': ['abs', 'obliques'],
  'Abs': ['abs'],
  'Obliques': ['obliques'],
  'Lower Back': ['lower-back'],
  'Traps': ['trapezius'],
  'Lats': ['upper-back'],
  'Upper Back': ['upper-back', 'trapezius'],
  'Biceps': ['biceps'],
  'Forearms': ['forearm'],
  'Calves': ['calves'],
  'Shins': ['calves'],
  // Approximate inner and outer upper thigh with the closest library zones.
  'Adductors': ['adductor'],
  'Abductors': ['abductors'],
  'Hip Flexors': ['quadriceps'],
  'Neck': ['neck'],
  'Rhomboids': ['upper-back'],
}

const MUSCLE_LABEL = {
  'neck': 'Neck',
  'chest': 'Chest',
  'triceps': 'Triceps',
  'front-deltoids': 'Front Delts',
  'back-deltoids': 'Rear Delts',
  'biceps': 'Biceps',
  'forearm': 'Forearms',
  'obliques': 'Obliques',
  'abs': 'Abs',
  'adductor': 'Adductors',
  'quadriceps': 'Quads',
  'abductors': 'Abductors',
  'calves': 'Calves',
  'trapezius': 'Traps',
  'upper-back': 'Upper Back',
  'lower-back': 'Lower Back',
  'gluteal': 'Glutes',
  'hamstring': 'Hamstrings',
}

function buildDiagramEntries(primaryMuscles = [], secondaryMuscles = []) {
  const entries = []
  const seen = new Map()

  const addEntries = (muscles, frequency) => {
    muscles.forEach(name => {
      const mapped = MUSCLE_MAP[name]
      if (!mapped?.length) return

      const prev = seen.get(name)
      if (prev) {
        prev.frequency = Math.max(prev.frequency, frequency)
        return
      }

      const entry = { name, muscles: mapped, frequency }
      seen.set(name, entry)
      entries.push(entry)
    })
  }

  addEntries(secondaryMuscles, 1)
  addEntries(primaryMuscles, 2)

  return entries
}

function lbsToKg(v) { return v * 0.453592 }
function kgToLbs(v) { return v * 2.20462 }

function getHistorySetType(set) {
  if (set?.is_warmup || set?.setType === 'warmup' || set?.set_type === 'warmup') return 'warmup'
  return set?.set_type ?? set?.setType ?? 'normal'
}

function isHistoryWorkingSet(set) {
  const setType = getHistorySetType(set)
  return setType !== 'warmup' && setType !== 'dropset'
}

function isMissingExerciseHistoryRpc(error, functionName) {
  const code = error?.code || ''
  const message = error?.message?.toLowerCase?.() || ''
  return (
    code === 'PGRST202'
    || message.includes(functionName.toLowerCase())
    || message.includes('could not find the function')
  )
}

async function fetchExerciseDailyOrmPoints(userId, exerciseId) {
  const { data, error } = await supabase.rpc(EXERCISE_DAILY_ORM_POINTS_RPC, {
    p_user_id: userId,
    p_exercise_id: exerciseId,
  })

  if (error) {
    if (isMissingExerciseHistoryRpc(error, EXERCISE_DAILY_ORM_POINTS_RPC)) {
      return { rows: [], missingFunction: true }
    }
    throw error
  }

  return { rows: data ?? [], missingFunction: false }
}

async function fetchExerciseHistorySummary(userId, exerciseId) {
  const { data, error } = await supabase.rpc(EXERCISE_HISTORY_SUMMARY_RPC, {
    p_user_id: userId,
    p_exercise_id: exerciseId,
  })

  if (error) {
    if (isMissingExerciseHistoryRpc(error, EXERCISE_HISTORY_SUMMARY_RPC)) {
      return { row: null, missingFunction: true }
    }
    throw error
  }

  return { row: data?.[0] ?? null, missingFunction: false }
}

function deriveExerciseHistoryFromSets(sets = []) {
  if (!sets.length) return { chartData: [], stats: null }

  let bestOrmKg = 0
  let bestSet = null
  let totalVolumeKg = 0
  const chartPointsByDate = new Map()

  sets.forEach(set => {
    const ormKg = set.unit === 'lbs' ? lbsToKg(set.estimated_1rm) : set.estimated_1rm
    const date = String(set.created_at || '').split('T')[0]
    const isWorkingSet = isHistoryWorkingSet(set)

    totalVolumeKg += getSetTrainingVolumeKg({
      weight: set.weight,
      reps: set.reps,
      unit: set.unit,
      set_type: set.set_type,
      is_warmup: set.is_warmup,
    })

    if (isWorkingSet && ormKg > bestOrmKg) {
      bestOrmKg = ormKg
      bestSet = { weight: set.weight, reps: set.reps, unit: set.unit }
    }

    const existingPoint = chartPointsByDate.get(date)
    if (isWorkingSet && (!existingPoint || ormKg > existingPoint.orm)) {
      chartPointsByDate.set(date, { date, orm: ormKg })
    }
  })

  return {
    chartData: [...chartPointsByDate.values()].sort((a, b) => a.date.localeCompare(b.date)),
    stats: {
      bestOrmKg,
      bestSet,
      totalVolumeKg,
      totalSets: sets.filter(isHistoryWorkingSet).length,
    },
  }
}

const PREV_SETS_PAGE = 10

function formatSetDate(isoString) {
  if (!isoString) return ''
  return new Date(isoString).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function TierSwiper({ thresholds, isBW, bodyweightKg, currentTierIdx, fmt, useLbs }) {
  const total = TIERS.length
  const [idx, setIdx] = useState(currentTierIdx ?? 0)
  const [motionDir, setMotionDir] = useState(null)
  const startX = useRef(null)

  const go = (delta) => {
    setMotionDir(delta > 0 ? 'next' : 'prev')
    setIdx(i => (i + delta + total) % total)
  }

  const onTouchStart = (e) => { startX.current = e.touches[0].clientX }
  const onTouchEnd = (e) => {
    if (startX.current === null) return
    const dx = e.changedTouches[0].clientX - startX.current
    if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1)
    startX.current = null
  }

  const tier = TIERS[idx]
  const color = tierColor(tier)
  const targetKg = isBW
    ? thresholds[idx] * bodyweightKg - bodyweightKg
    : thresholds[idx] * bodyweightKg
  const isCurrent = idx === currentTierIdx
  const stageClass = motionDir ? `tier-swiper-stage tier-swiper-stage-${motionDir}` : 'tier-swiper-stage'

  return (
    <div
      className="tier-swiper"
      data-tab-swipe-ignore="true"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="tier-swiper-header">
        <button className="tier-swiper-arrow" onClick={() => go(-1)}>‹</button>
        <div className="tier-swiper-label-wrap">
          <div key={`label-${idx}-${motionDir ?? 'idle'}`} className={stageClass}>
            <div className="tier-swiper-label" style={{ color }}>
              <RankBadge tier={tierGroup(tier)} size={14} />
              {tier}
              {isCurrent && <span className="tier-swiper-you">(current)</span>}
            </div>
          </div>
        </div>
        <button className="tier-swiper-arrow" onClick={() => go(1)}>›</button>
      </div>
      <div className="tier-swiper-body">
        <div key={`body-${idx}-${motionDir ?? 'idle'}`} className={stageClass}>
          {!isBW && targetKg <= 0 ? (
            <div className="tier-swiper-bw-hint">Complete a set with 0 {useLbs ? 'lbs' : 'kg'}</div>
          ) : (
            <div className="ex-target-chips">
              {[1, 3, 5, 8].map(reps => (
                <div key={reps} className="ex-target-chip">
                  <span className="chip-reps">{reps === 1 ? '1 rep' : `${reps} reps`}</span>
                  <span className="chip-weight">{fmt(weightForOrm(targetKg, reps))}</span>
                </div>
              ))}
            </div>
          )}
          <div className="tier-swiper-dots">
            {TIER_GROUPS.map((g, i) => (
              <div key={g} className="tier-swiper-dot" style={{ background: Math.floor(idx / 3) === i ? TIER_COLORS[g] : undefined }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function ExerciseDetailSkeleton() {
  return (
    <div className="ex-skeleton-root" aria-hidden="true">
      <div className="ex-stats-grid">
        {[0, 1, 2].map(i => (
          <div key={i} className="ex-stat">
            <div className="ex-skeleton-block ex-skeleton-stat-value" />
            <div className="ex-skeleton-block ex-skeleton-stat-label" />
          </div>
        ))}
      </div>

      <div className="ex-section">
        <div className="ex-skeleton-block ex-skeleton-section-title" />
        <div className="ex-skeleton-block ex-skeleton-best-set" />
      </div>

      <div className="ex-section">
        <div className="ex-skeleton-block ex-skeleton-section-title" />
        <div className="ex-rank-card">
          <div className="ex-rank-top">
            <div className="ex-skeleton-block ex-skeleton-rank-badge" />
            <div className="ex-skeleton-block ex-skeleton-rank-ratio" />
          </div>
          <div className="ex-skeleton-block ex-skeleton-progress" />
          <div className="ex-progress-row">
            <div className="ex-skeleton-block ex-skeleton-pct" />
          </div>
        </div>
      </div>

      <div className="ex-section">
        <div className="ex-section-header">
          <div className="ex-skeleton-block ex-skeleton-section-title" />
          <div className="ex-skeleton-block ex-skeleton-period-toggle" />
        </div>
        <div className="ex-skeleton-block ex-skeleton-chart" />
      </div>

      <div className="ex-section">
        <div className="ex-skeleton-block ex-skeleton-section-title" />
        <div className="ex-prev-sets">
          {[0, 1, 2].map(i => (
            <div key={i} className="ex-prev-set-row">
              <div className="ex-skeleton-block ex-skeleton-date" />
              <div className="ex-skeleton-block ex-skeleton-lift" />
              <div className="ex-skeleton-block ex-skeleton-orm" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function ExerciseDetail({ exerciseId, onBack, rankMode = ALL_TIME_RANK_MODE }) {
  const userId = useCurrentUserId()
  const [exercise, setExercise]   = useState(null)
  const [profile, setProfile]     = useState(null)
  const [chartData, setChartData] = useState([])
  const [stats, setStats]         = useState(null)
  const [activeRankState, setActiveRankState] = useState(null)
  const [loading, setLoading]     = useState(true)
  const [loadError, setLoadError] = useState('')
  const [chartPeriod, setChartPeriod] = useState('3m')
  const [showTrendLine, setShowTrendLine] = useState(false)
  const [muscleLabel, setMuscleLabel] = useState(null)
  const [prevSets, setPrevSets] = useState([])
  const [prevSetsHasMore, setPrevSetsHasMore] = useState(false)
  const [prevSetsOffset, setPrevSetsOffset] = useState(0)
  const [prevSetsLoading, setPrevSetsLoading] = useState(false)
  const [prevSetsError, setPrevSetsError] = useState('')

  const handleMuscleClick = useCallback(({ muscle, data }) => {
    const preferred = data?.exercises?.find(Boolean)
    const label = preferred || MUSCLE_LABEL[muscle] || muscle
    setMuscleLabel(label)
  }, [])

  async function load() {
    if (!userId) return
    setLoading(true)
    setLoadError('')
    setPrevSetsError('')
    setPrevSets([])
    setPrevSetsHasMore(false)
    setPrevSetsOffset(0)

    try {
      const [{ data: ex, error: exError }, { data: prof, error: profileError }, activeRankResult, dailyHistoryResult, summaryResult, prevSetsResult] = await Promise.all([
        supabase.from('exercises').select('*').eq('id', exerciseId).single(),
        supabase.from('profiles').select('bodyweight, gender, unit_preference').eq('id', userId).single(),
        fetchExerciseRankStates(userId, [exerciseId]),
        fetchExerciseDailyOrmPoints(userId, exerciseId),
        fetchExerciseHistorySummary(userId, exerciseId),
        supabase
          .from('workout_sets')
          .select('id, weight, reps, unit, estimated_1rm, created_at, is_warmup, set_type')
          .eq('user_id', userId)
          .eq('exercise_id', exerciseId)
          .not('reps', 'is', null)
          .order('created_at', { ascending: false })
          .range(0, PREV_SETS_PAGE),
        getAnchors(),
      ])
      const initialLoadError = exError || profileError || prevSetsResult.error
      if (initialLoadError) throw initialLoadError

      const rawSets = prevSetsResult.data || []
      const initialSets = rawSets.slice(0, PREV_SETS_PAGE)
      setPrevSets(initialSets)
      setPrevSetsHasMore(rawSets.length > PREV_SETS_PAGE)
      setPrevSetsOffset(initialSets.length)

      setExercise(ex)
      setProfile(prof)
      setActiveRankState(activeRankResult.rows.find(row => row.exercise_id === exerciseId) || null)

      const useLegacyHistory = dailyHistoryResult.missingFunction || summaryResult.missingFunction

      if (useLegacyHistory) {
        const { data: sets, error: setsError } = await supabase
          .from('workout_sets')
          .select('estimated_1rm, weight, reps, unit, created_at, is_warmup, set_type')
          .eq('user_id', userId)
          .eq('exercise_id', exerciseId)
          .not('estimated_1rm', 'is', null)
          .order('created_at', { ascending: true })
          .limit(500)

        if (setsError) throw setsError

        const legacyHistory = deriveExerciseHistoryFromSets(sets || [])
        setChartData(legacyHistory.chartData)
        setStats(legacyHistory.stats)
        return
      }

      const nextChartData = (dailyHistoryResult.rows || [])
        .map(row => ({
          date: String(row.day).slice(0, 10),
          orm: Number(row.best_orm_kg) || 0,
        }))
        .filter(point => point.date && point.orm > 0)

      const summaryRow = summaryResult.row
      const nextStats = summaryRow && Number(summaryRow.total_sets) > 0
        ? {
          bestOrmKg: Number(summaryRow.best_orm_kg) || 0,
          bestSet: {
            weight: Number(summaryRow.best_set_weight) || 0,
            reps: Number(summaryRow.best_set_reps) || 0,
            unit: summaryRow.best_set_unit || 'kg',
          },
          totalVolumeKg: Number(summaryRow.total_volume_kg) || 0,
          totalSets: Number(summaryRow.total_sets) || 0,
        }
        : null

      setChartData(nextChartData)
      setStats(nextStats)
    } catch (error) {
      setLoadError(error?.message || 'Could not load this exercise. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleLoadMore() {
    if (prevSetsLoading || !userId) return
    setPrevSetsLoading(true)
    setPrevSetsError('')
    try {
      const { data, error } = await supabase
        .from('workout_sets')
        .select('id, weight, reps, unit, estimated_1rm, created_at, is_warmup, set_type')
        .eq('user_id', userId)
        .eq('exercise_id', exerciseId)
        .not('reps', 'is', null)
        .order('created_at', { ascending: false })
        .range(prevSetsOffset, prevSetsOffset + PREV_SETS_PAGE)
      if (error) throw error
      const loaded = data || []
      const more = loaded.slice(0, PREV_SETS_PAGE)
      setPrevSets(prev => [...prev, ...more])
      setPrevSetsHasMore(loaded.length > PREV_SETS_PAGE)
      setPrevSetsOffset(prev => prev + more.length)
    } catch (error) {
      setPrevSetsError(error?.message || 'Could not load more sets.')
    } finally {
      setPrevSetsLoading(false)
    }
  }

  const loadLatest = useEffectEvent(() => { load() })

  useEffect(() => {
    const timer = setTimeout(() => { loadLatest() }, 0)
    return () => clearTimeout(timer)
  }, [exerciseId, userId])

  useEffect(() => {
    const content = document.querySelector('.content')
    if (content) content.scrollTop = 0
  }, [])

  const useLbs = profile?.unit_preference === 'lbs'
  const fmt    = (kg) => useLbs ? `${kgToLbs(kg).toFixed(1)} lbs` : `${kg.toFixed(1)} kg`
  const displayUnit = useLbs ? 'lbs' : 'kg'

  const gender      = profile?.gender?.toLowerCase() === 'female' ? 'female' : 'male'
  const bodyweightKg = profile?.bodyweight
    ? (useLbs ? lbsToKg(profile.bodyweight) : profile.bodyweight)
    : null

  // Chart data filtered by period then converted to display unit
  const filteredChart = filterByChartPeriod(chartData, chartPeriod, point => point.date)
  const chartDisplay = useLbs
    ? filteredChart.map(d => ({ ...d, orm: kgToLbs(d.orm) }))
    : filteredChart

  const rankModeLabel = rankMode === ACTIVE_RANK_MODE ? 'Active' : 'All-Time'

  // Rank
  const isBW = exercise?.equipment === 'Bodyweight'
  const exerciseAnchors = exercise ? anchorsOrNull()?.[gender]?.[exercise.name] : null
  let allTimeRankSection = null
  if (stats && bodyweightKg && exerciseAnchors) {
    const thresholds = expandAnchors(exerciseAnchors)
    const ratio      = isBW
      ? (stats.bestOrmKg + bodyweightKg) / bodyweightKg
      : stats.bestOrmKg / bodyweightKg
    const tierIdx    = getTierIdx(ratio, thresholds)
    const tier       = TIERS[tierIdx]
    const color      = tierColor(tier)
    const progress   = getProgress(ratio, thresholds, tierIdx)
    const isMax      = tierIdx === TIERS.length - 1
    const nextTier   = !isMax ? TIERS[tierIdx + 1] : null
    const targetKg   = !isMax
      ? (isBW
          ? thresholds[tierIdx + 1] * bodyweightKg - bodyweightKg
          : thresholds[tierIdx + 1] * bodyweightKg)
      : null
    allTimeRankSection = { tierIdx, tier, color, progress, isMax, nextTier, targetKg, ratio }
  }

  let activeRankSection = null
  if (bodyweightKg && exerciseAnchors) {
    const thresholds = expandAnchors(exerciseAnchors)
    const storedScore = Number.isFinite(activeRankState?.current_score)
      ? Number(activeRankState.current_score)
      : null
    const fallbackScore = allTimeRankSection ? getContinuousTierScore(allTimeRankSection) : null
    const activeScore = storedScore !== null
      ? applyInactivityDecay(storedScore, activeRankState?.last_ranked_at).score
      : fallbackScore

    if (activeScore !== null) {
      const resolved = resolveTierFromScore(activeScore)
      const targetKg = !resolved.isMax
        ? (isBW
            ? thresholds[resolved.tierIdx + 1] * bodyweightKg - bodyweightKg
            : thresholds[resolved.tierIdx + 1] * bodyweightKg)
        : null
      activeRankSection = {
        ...resolved,
        ratio: inferRatioFromScore(activeScore, thresholds),
        targetKg,
      }
    }
  }

  const rankSection = rankMode === ACTIVE_RANK_MODE
    ? (activeRankSection || allTimeRankSection)
    : allTimeRankSection

  // Volume display
  const displayVolume = stats
    ? (useLbs
        ? kgToLbs(stats.totalVolumeKg) >= 1000
          ? `${(kgToLbs(stats.totalVolumeKg) / 1000).toFixed(1)}k lbs`
          : `${kgToLbs(stats.totalVolumeKg).toFixed(0)} lbs`
        : stats.totalVolumeKg >= 1000
          ? `${(stats.totalVolumeKg / 1000).toFixed(1)}k kg`
          : `${stats.totalVolumeKg.toFixed(0)} kg`)
    : '—'

  return (
    <div className="ex-detail">
      {/* Header */}
      <div className="ex-detail-header">
        <button className="ex-back-btn" onClick={onBack}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
        </button>
        <div className="ex-detail-title">
          <div className="ex-detail-name">{exercise?.name ?? '—'}</div>
          {exercise && (
            <div className="ex-detail-meta">{exercise.category} · {exercise.equipment}</div>
          )}
        </div>
      </div>

      {loading ? (
        <ExerciseDetailSkeleton />
      ) : loadError ? (
        <div className="ex-no-data">
          {loadError}
          <button className="ex-load-more-btn" onClick={load} style={{ marginTop: 12 }}>
            Retry
          </button>
        </div>
      ) : exercise?.category === 'Cardio' ? (
        <div className="ex-no-data">Cardio exercise — logged by duration, no strength rank.</div>
      ) : (
        <>
          {/* Dumbbell / single-side hint */}
          {(exercise?.equipment === 'Dumbbell' || exercise?.name === 'Cable Lateral Raise') && (
            <div className="ex-db-hint">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <strong>{exercise?.equipment === 'Dumbbell' ? 'Log the weight of one dumbbell.' : 'Log the weight for one side.'}</strong>
            </div>
          )}

          {/* Stats */}
          {stats ? (
            <div className="ex-stats-grid">
              <div className="ex-stat">
                <div className="ex-stat-value">{fmt(stats.bestOrmKg)}</div>
                <div className="ex-stat-label">Best 1RM</div>
              </div>
              <div className="ex-stat">
                <div className="ex-stat-value">{displayVolume}</div>
                <div className="ex-stat-label">Effective Volume</div>
              </div>
              <div className="ex-stat">
                <div className="ex-stat-value">{stats.totalSets}</div>
                <div className="ex-stat-label">Working Sets</div>
              </div>
            </div>
          ) : (
            <div className="ex-no-data">No workout data yet — log this exercise to see your stats</div>
          )}

          {/* Best Set */}
          {stats?.bestSet && (
            <div className="ex-section">
              <div className="ex-section-title">Best Set</div>
              <div className="ex-best-set">
                <span className="ex-best-weight">{stats.bestSet.weight} {stats.bestSet.unit}</span>
                <span className="ex-best-sep">×</span>
                <span className="ex-best-reps">{stats.bestSet.reps} reps</span>
                <span className="ex-best-orm">({fmt(stats.bestOrmKg)} est. 1RM)</span>
              </div>
            </div>
          )}

          {/* Rank */}
          <div className="ex-section">
            <div className="ex-section-title">Strength Rank ({rankModeLabel})</div>
            {rankSection ? (
              <div className="ex-rank-card">
                <div className="ex-rank-top">
                  <div className="tier-badge" style={{ background: rankSection.color + '22', color: rankSection.color }}>
                    <RankBadge tier={tierGroup(rankSection.tier)} size={18} />
                    {rankSection.tier}
                  </div>
                  <div className="ex-rank-ratio">{rankSection.ratio.toFixed(2)}× BW</div>
                </div>
                <div className="ex-progress-track">
                  <div className="ex-progress-fill" style={{ width: `${rankSection.progress}%`, background: rankSection.color }} />
                </div>
                <div className="ex-progress-row">
                  <span className="ex-progress-pct">{rankSection.isMax ? '100%' : `${rankSection.progress}%`}</span>
                  {rankSection.nextTier && (
                    <span className="ex-next-label">
                      → <span style={{ color: TIER_COLORS[tierGroup(rankSection.nextTier)] }}>{rankSection.nextTier}</span>
                    </span>
                  )}
                  {rankSection.isMax && <span className="ex-next-label" style={{ color: TIER_COLORS.Elite }}>Max Rank</span>}
                </div>
                {exerciseAnchors && bodyweightKg && (
                  <TierSwiper
                    thresholds={expandAnchors(exerciseAnchors)}
                    isBW={isBW}
                    bodyweightKg={bodyweightKg}
                    currentTierIdx={rankSection.tierIdx}
                    fmt={fmt}
                    useLbs={useLbs}
                  />
                )}
              </div>
            ) : (
              <div className="ex-rank-card ex-rank-unranked">
                <div className="ex-rank-top">
                  <div className="tier-badge" style={{ background: '#4b556322', color: '#4b5563' }}>
                    <RankBadge tier="Unranked" size={18} />
                    Unranked
                  </div>
                </div>
                <div className="ex-unranked-hint">
                  {!bodyweightKg
                    ? 'Add your bodyweight in Profile to see your rank'
                    : !exerciseAnchors
                    ? 'No strength standards for this exercise yet'
                    : 'Log this exercise to earn a rank'}
                </div>
                {exerciseAnchors && bodyweightKg && (
                  <TierSwiper
                    thresholds={expandAnchors(exerciseAnchors)}
                    isBW={isBW}
                    bodyweightKg={bodyweightKg}
                    currentTierIdx={null}
                    fmt={fmt}
                    useLbs={useLbs}
                  />
                )}
              </div>
            )}
          </div>

          {/* Progress Chart */}
          <div className="ex-section">
            <div className="ex-section-header">
              <div className="ex-section-title">1RM Progress</div>
              {chartData.length > 0 && (
                <div className="ex-chart-controls">
                  <label className="ex-trend-check">
                    <input
                      type="checkbox"
                      checked={showTrendLine}
                      onChange={e => setShowTrendLine(e.target.checked)}
                    />
                    Trend
                  </label>
                  <div className="ex-period-toggle">
                    {CHART_PERIOD_OPTIONS.map(({ value }) => (
                      <button
                        key={value}
                        className={`ex-period-btn ${chartPeriod === value ? 'active' : ''}`}
                        onClick={() => setChartPeriod(value)}
                      >
                        {getChartPeriodLabel(value)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {chartData.length === 0
              ? <div className="chart-empty">No data yet — log this exercise to track your progress</div>
              : chartDisplay.length > 0
                ? <div className="ex-chart-wrap"><ExerciseChart data={chartDisplay} unit={displayUnit} showTrendLine={showTrendLine} /></div>
                : <div className="chart-empty">No data in this period</div>
            }
          </div>

          {/* Muscles Worked */}
          {exercise && (exercise.primary_muscles?.length > 0 || exercise.secondary_muscles?.length > 0) && (() => {
            const diagramEntries = buildDiagramEntries(
              exercise.primary_muscles || [],
              exercise.secondary_muscles || [],
            )
            return (
              <div className="ex-section">
                <div className="ex-section-title">Muscles Worked</div>
                <div className="ex-muscle-legend">
                  {exercise.primary_muscles?.length > 0 && (
                    <div className="ex-muscle-row">
                      <div className="ex-muscle-dot primary" />
                      <span><strong>Primary:</strong> {exercise.primary_muscles.join(', ')}</span>
                    </div>
                  )}
                  {exercise.secondary_muscles?.length > 0 && (
                    <div className="ex-muscle-row">
                      <div className="ex-muscle-dot secondary" />
                      <span><strong>Secondary:</strong> {exercise.secondary_muscles.join(', ')}</span>
                    </div>
                  )}
                </div>
                {muscleLabel && (
                  <div className="ex-muscle-tooltip">{muscleLabel}</div>
                )}
                <div className="ex-muscle-models">
                  <div className="ex-muscle-model">
                    <div className="ex-muscle-model-label">Front</div>
                    <Model
                      data={diagramEntries}
                      type="anterior"
                      onClick={handleMuscleClick}
                      bodyColor="rgba(255, 255, 255, 0.16)"
                      highlightedColors={['rgba(59, 158, 255, 0.42)', '#3b9eff']}
                      style={{ width: '100%', aspectRatio: '1 / 2' }}
                    />
                  </div>
                  <div className="ex-muscle-model">
                    <div className="ex-muscle-model-label">Back</div>
                    <Model
                      data={diagramEntries}
                      type="posterior"
                      onClick={handleMuscleClick}
                      bodyColor="rgba(255, 255, 255, 0.16)"
                      highlightedColors={['rgba(59, 158, 255, 0.42)', '#3b9eff']}
                      style={{ width: '100%', aspectRatio: '1 / 2' }}
                    />
                  </div>
                </div>
              </div>
            )
          })()}

          {/* Previous Sets */}
          {prevSets.length > 0 && (
            <div className="ex-section">
              <div className="ex-section-title">Previous Sets</div>
              <div className="ex-prev-sets">
                {prevSets.map(set => (
                  <div key={set.id} className="ex-prev-set-row">
                    <span className="ex-prev-set-date">{formatSetDate(set.created_at)}</span>
                    <span className="ex-prev-set-lift">{set.weight} {set.unit} × {set.reps} reps</span>
                    {set.estimated_1rm != null && (
                      <span className="ex-prev-set-orm">est. 1RM: {fmt(set.unit === 'lbs' ? lbsToKg(set.estimated_1rm) : set.estimated_1rm)}</span>
                    )}
                  </div>
                ))}
              </div>
              <button
                className="ex-load-more-btn"
                onClick={handleLoadMore}
                disabled={!prevSetsHasMore || prevSetsLoading}
              >
                {prevSetsLoading ? <LoadingSpinner size="xs" color="currentColor" /> : 'Load More'}
              </button>
              {prevSetsError && <div className="ex-no-data">{prevSetsError}</div>}
            </div>
          )}
        </>
      )}
    </div>
  )
}
