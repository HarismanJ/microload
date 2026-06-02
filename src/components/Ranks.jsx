import { useState, useEffect, useLayoutEffect, useRef, lazy, Suspense, useMemo } from 'react'
import { push as pushBack, remove as removeBack } from '../lib/backStack'
import { useFocusTrap } from '../lib/useFocusTrap'
import { createPortal } from 'react-dom'
import Model from 'react-body-highlighter'
import { supabase } from '../lib/supabase'
import { getCached, setCached, getStartupSnapshot, setStartupSnapshot, getCalendarMonthCacheKey, invalidateCache } from '../lib/cache'
import { ESTIMATED_ORM_REP_CAP, calculateORM, calculateSetEstimatedOrm } from '../lib/orm'
import { fetchExercises } from '../data/exercises'
import { fetchExerciseRankStates, mapExerciseRankStates, upsertExerciseRankStates } from '../data/rankStates'
import RankBadge from './RankBadge'
import TierProgressBar from './TierProgressBar'
import LoadingSpinner from './LoadingSpinner'
import {
  TIERS, TIER_COLORS,
  tierGroup, tierColor,
  expandAnchors, getTierIdx, getProgress, weightForOrm,
  getAnchors, anchorsOrNull,
} from '../lib/strengthStandards'
import {
  MAX_REPS,
  MAX_WEIGHT,
  getWeightInputMax,
  getWeightInputMin,
  isRepsWithinInputRange,
  isWeightWithinInputRange,
} from '../lib/liftMath'
import { friendlyError } from '../lib/friendlyError'
import {
  ACTIVE_RANK_MODE,
  ALL_TIME_RANK_MODE,
  applyInactivityDecay,
  clampContinuousTierScore,
  getContinuousTierScore,
  inferRatioFromScore,
  resolveTierFromScore,
  updateRollingScore,
} from '../lib/rollingRanks'
import { useCurrentUserId } from '../context/UserContext'
import { matchesSearchQuery, scoreExerciseMatch } from '../lib/exerciseSearch'
import { VALIDATION_LIMITS, validateBodyweight } from '../lib/inputValidation'
import '../styles/Ranks.css'

const ExerciseDetail = lazy(() => import('./exercise/ExerciseDetail'))

const TIER_GROUPS = ['Unranked', 'Iron', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Master', 'Grandmaster', 'Elite']
const SECONDARY_MUSCLE_WEIGHT = 0.35
const MUSCLE_GROUPS = [
  {
    key: 'chest',
    label: 'Chest',
    muscles: ['Chest', 'Upper Chest', 'Lower Chest'],
    chartMuscles: ['chest'],
  },
  {
    key: 'front-deltoids',
    label: 'Shoulders',
    muscles: ['Front Delts', 'Lateral Delts', 'Shoulders'],
    chartMuscles: ['front-deltoids', 'back-deltoids'],
  },
  {
    key: 'biceps',
    label: 'Biceps',
    muscles: ['Biceps'],
    chartMuscles: ['biceps'],
  },
  {
    key: 'triceps',
    label: 'Triceps',
    muscles: ['Triceps'],
    chartMuscles: ['triceps'],
  },
  {
    key: 'forearm',
    label: 'Forearms',
    muscles: ['Forearms'],
    chartMuscles: ['forearm'],
  },
  {
    key: 'abs',
    label: 'Abs',
    muscles: ['Abs', 'Core'],
    chartMuscles: ['abs'],
  },
  {
    key: 'obliques',
    label: 'Obliques',
    muscles: ['Obliques', 'Core'],
    chartMuscles: ['obliques'],
  },
  {
    key: 'quadriceps',
    label: 'Quads',
    muscles: ['Quads', 'Hip Flexors'],
    chartMuscles: ['quadriceps'],
  },
  {
    key: 'adductor',
    label: 'Adductors',
    muscles: ['Adductors'],
    chartMuscles: ['adductor'],
  },
  {
    key: 'abductors',
    label: 'Abductors',
    muscles: ['Abductors'],
    chartMuscles: ['abductors'],
  },
  {
    key: 'calves',
    label: 'Calves',
    muscles: ['Calves', 'Shins'],
    chartMuscles: ['calves'],
  },
  {
    key: 'gluteal',
    label: 'Glutes',
    muscles: ['Glutes'],
    chartMuscles: ['gluteal'],
  },
  {
    key: 'hamstring',
    label: 'Hamstrings',
    muscles: ['Hamstrings'],
    chartMuscles: ['hamstring'],
  },
  {
    key: 'lower-back',
    label: 'Lower Back',
    muscles: ['Lower Back'],
    chartMuscles: ['lower-back'],
  },
  {
    key: 'trapezius',
    label: 'Traps',
    muscles: ['Traps'],
    chartMuscles: ['trapezius'],
  },
  {
    key: 'upper-back',
    label: 'Upper/Middle Back',
    muscles: ['Upper Back', 'Lats', 'Rhomboids'],
    chartMuscles: ['upper-back'],
  },
  {
    key: 'neck',
    label: 'Neck',
    muscles: ['Neck'],
    chartMuscles: ['neck'],
  },
]
const MUSCLE_CHART_COLORS = TIER_GROUPS.slice(1).map(group => TIER_COLORS[group])
const MUSCLE_GROUP_KEYS = new Set(MUSCLE_GROUPS.map(group => group.key))
const RANK_DISPLAY_MODE_STORAGE_KEY = 'ranks:display-mode'

function lbsToKg(v) { return v * 0.453592 }
function kgToLbs(v) { return v * 2.20462 }

function getLiftRank(lift, ormKg, bodyweightKg, gender) {
  const anchors = anchorsOrNull()?.[gender]?.[lift.name]
  if (!anchors || !bodyweightKg) return null

  const thresholds = expandAnchors(anchors)
  const isBW = lift.equipment === 'Bodyweight'
  const ratio = isBW
    ? (ormKg + bodyweightKg) / bodyweightKg
    : ormKg / bodyweightKg
  const tierIdx = getTierIdx(ratio, thresholds)
  const tier = TIERS[tierIdx]
  const isMax = tierIdx === TIERS.length - 1

  return {
    thresholds,
    isBW,
    ratio,
    tierIdx,
    tier,
    color: tierColor(tier),
    progress: getProgress(ratio, thresholds, tierIdx),
    isMax,
    nextTier: !isMax ? TIERS[tierIdx + 1] : null,
  }
}

function getLiftScoreFromOrm(lift, ormKg, bodyweightKg, thresholds = []) {
  if (!Number.isFinite(ormKg) || !bodyweightKg || !thresholds.length) return null
  const ratio = lift.equipment === 'Bodyweight'
    ? (ormKg + bodyweightKg) / bodyweightKg
    : ormKg / bodyweightKg
  const tierIdx = getTierIdx(ratio, thresholds)
  const progress = getProgress(ratio, thresholds, tierIdx)
  return clampContinuousTierScore(tierIdx + Math.min(0.999, progress / 100))
}

function getRankFromScore(lift, score, thresholds = []) {
  const resolved = resolveTierFromScore(score)
  return {
    ...resolved,
    thresholds,
    isBW: lift.equipment === 'Bodyweight',
    ratio: inferRatioFromScore(score, thresholds),
  }
}

function readRankDisplayMode() {
  try {
    const value = localStorage.getItem(RANK_DISPLAY_MODE_STORAGE_KEY)
    return value === ALL_TIME_RANK_MODE ? ALL_TIME_RANK_MODE : ACTIVE_RANK_MODE
  } catch {
    return ACTIVE_RANK_MODE
  }
}

function getMuscleContributionWeight(lift, muscleGroup) {
  const primaryMuscles = lift.primary_muscles || []
  const secondaryMuscles = lift.secondary_muscles || []
  const hasPrimary = muscleGroup.muscles.some(muscle => primaryMuscles.includes(muscle))
  if (hasPrimary) return 1
  const hasSecondary = muscleGroup.muscles.some(muscle => secondaryMuscles.includes(muscle))
  return hasSecondary ? SECONDARY_MUSCLE_WEIGHT : 0
}

function buildMuscleGroupRank(muscleGroup, liftsWithDetails) {
  const matchingLifts = liftsWithDetails.filter(lift => getMuscleContributionWeight(lift, muscleGroup) > 0)
  const contributions = matchingLifts
    .filter(lift => lift.cardRank)
    .map(lift => {
      const muscleWeight = getMuscleContributionWeight(lift, muscleGroup)
      const score = getContinuousTierScore(lift.cardRank)
      return {
        lift,
        score,
        muscleWeight,
        weightedScore: score * muscleWeight,
      }
    })
    .sort((a, b) => b.weightedScore - a.weightedScore)

  if (!contributions.length) {
    return {
      ...muscleGroup,
      tier: 'Unranked',
      color: TIER_COLORS.Unranked,
      progress: 0,
      isMax: false,
      nextTier: null,
      tierIdx: -1,
      matchingLiftCount: matchingLifts.length,
      contributionCount: 0,
      chartFrequency: 0,
    }
  }

  // Weighted maximum: rank = best (score × muscleWeight) across all contributing exercises.
  // This means additional exercises can only help (never hurt), and secondary-only muscles
  // are naturally capped at SECONDARY_MUSCLE_WEIGHT × their score (no cancellation).
  const resolvedRank = resolveTierFromScore(contributions[0].weightedScore)

  return {
    ...muscleGroup,
    ...resolvedRank,
    matchingLiftCount: matchingLifts.length,
    contributionCount: contributions.length,
    chartFrequency: TIER_GROUPS.indexOf(tierGroup(resolvedRank.tier)),
  }
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
            <div className="lift-target-chips">
              {[1, 3, 5, 8].map(reps => (
                <div key={reps} className="target-chip">
                  <span className="chip-reps">{reps === 1 ? '1 rep' : `${reps} reps`}</span>
                  <span className="chip-weight">{fmt(weightForOrm(targetKg, reps))}</span>
                </div>
              ))}
            </div>
          )}
          <div className="tier-swiper-dots">
            {TIER_GROUPS.slice(1).map((g, i) => (
              <div key={g} className="tier-swiper-dot" style={{ background: Math.floor(idx / 3) === i ? TIER_COLORS[g] : undefined }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function RanksSkeleton() {
  return (
    <div className="lift-cards" role="status" aria-label="Loading ranks">
      {[0, 1, 2, 3, 4].map(i => (
        <div key={i} className="lift-card" style={{ '--card-index': i }} aria-hidden="true">
          <div className="lift-card-top">
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="ranks-skeleton-block ranks-skeleton-name" />
              <div className="ranks-skeleton-block ranks-skeleton-category" />
            </div>
            <div className="lift-right">
              <div className="ranks-skeleton-block ranks-skeleton-orm" />
              <div className="ranks-skeleton-block ranks-skeleton-ratio" />
            </div>
          </div>
          <div className="lift-tier-row">
            <div className="ranks-skeleton-block ranks-skeleton-badge" />
          </div>
          <div className="ranks-skeleton-block ranks-skeleton-progress" />
          <div className="ranks-skeleton-block ranks-skeleton-pct" />
        </div>
      ))}
    </div>
  )
}

export default function Ranks({ refreshTick = 0, profileRefreshTick = 0, onBodyweightChanged, onWorkoutDataChanged }) {
  const userId = useCurrentUserId()
  const muscleMapRef = useRef(null)
  const [profile, setProfile] = useState(null)
  const [lifts, setLifts] = useState([])
  const [rankDisplayMode, setRankDisplayMode] = useState(readRankDisplayMode)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [muscleLoadingActive, setMuscleLoadingActive] = useState(true)
  const [muscleRevealActive, setMuscleRevealActive] = useState(false)
  const [rankLegendOpen, setRankLegendOpen] = useState(false)
  const [detailExerciseId, setDetailExerciseId] = useState(null)
  const [search, setSearch] = useState('')
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState(null)
  const [bwInput, setBwInput] = useState('')
  const [bwError, setBwError] = useState('')
  const [bwSaving, setBwSaving] = useState(false)
  const [editingLiftId, setEditingLiftId] = useState(null)
  const [topSetForm, setTopSetForm] = useState({ weight: '', reps: '1' })
  const [topSetSaving, setTopSetSaving] = useState(false)
  const [topSetError, setTopSetError] = useState('')
  const [topSetNotice, setTopSetNotice] = useState('')
  const [skeletonFading, setSkeletonFading] = useState(false)
  const [skeletonVisible, setSkeletonVisible] = useState(true)
  const [ormCalcOpen, setOrmCalcOpen] = useState(false)
  const [ormWeight, setOrmWeight] = useState('')
  const [ormReps, setOrmReps] = useState('')
  const [ormUnit, setOrmUnit] = useState('lbs')
  const ormCalcRef = useRef(null)
  useFocusTrap(ormCalcRef, { active: ormCalcOpen, onEscape: () => setOrmCalcOpen(false) })

  useEffect(() => {
    if (!detailExerciseId) return
    const id = pushBack(() => setDetailExerciseId(null))
    return () => removeBack(id)
  }, [detailExerciseId])

  useLayoutEffect(() => {
    if (loading) {
      setSkeletonFading(false)
      setSkeletonVisible(true)
      return
    }
    setSkeletonFading(true)
    const timer = setTimeout(() => setSkeletonVisible(false), 680)
    return () => clearTimeout(timer)
  }, [loading])

  useEffect(() => {
    try {
      localStorage.setItem(RANK_DISPLAY_MODE_STORAGE_KEY, rankDisplayMode)
    } catch {
      // Ignore storage issues and keep in-memory preference.
    }
  }, [rankDisplayMode])

  async function saveBW() {
    const val = parseFloat(bwInput)
    const unit = profile?.unit_preference || 'lbs'
    if (!userId) return
    const weightError = validateBodyweight(bwInput, unit)
    if (weightError) {
      setBwError(weightError)
      return
    }
    setBwSaving(true)
    setBwError('')
    const timestamp = new Date().toISOString()
    try {
      const [{ error: profileError }, { error: logError }] = await Promise.all([
        supabase.from('profiles').update({ bodyweight: val }).eq('id', userId),
        supabase.from('body_weight_logs').insert({ user_id: userId, weight: val, unit, logged_at: timestamp }),
      ])
      const saveError = profileError || logError
      if (saveError) throw saveError
      invalidateCache('ranks', 'profile', 'home', getCalendarMonthCacheKey(timestamp))
      setProfile(p => ({ ...p, bodyweight: val }))
      onBodyweightChanged?.()
      setBwInput('')
    } catch (error) {
      setBwError(friendlyError(error, 'Could not save your bodyweight.'))
    } finally {
      setBwSaving(false)
    }
  }

  function isValidRanksSnapshot(data, expectedUserId) {
    return (
      data?.userId === expectedUserId &&
      data?.profile &&
      Array.isArray(data.lifts) &&
      data.lifts.length > 0 &&
      data.lifts.every(lift => Array.isArray(lift.primary_muscles) && Array.isArray(lift.secondary_muscles))
    )
  }

  async function load() {
    if (!userId) return
    const cached = getCached('ranks')
    if (isValidRanksSnapshot(cached, userId)) {
      setProfile(cached.profile)
      await getAnchors()
      setLifts(cached.lifts)
      setLoading(false)
      return
    }

    const snapshot = getStartupSnapshot('ranks', userId)
    if (isValidRanksSnapshot(snapshot, userId)) {
      setCached('ranks', snapshot)
      setProfile(snapshot.profile)
      await getAnchors()
      setLifts(snapshot.lifts)
      setLoading(false)
      return
    }

    try {
      const resolvedAnchors = await getAnchors()
      const anchorNames = Object.keys(resolvedAnchors.male)
      const anchorNameSet = new Set(anchorNames)

      const [{ data: profileData }, { data: prsData }, exerciseRows, rankStatesResult] = await Promise.all([
        supabase.from('profiles').select('gender, bodyweight, unit_preference').eq('id', userId).single(),
        supabase
          .from('exercise_prs')
          .select('exercise_id, best_1rm_kg')
          .eq('user_id', userId),
        fetchExercises(userId),
        fetchExerciseRankStates(userId),
      ])

      // Best ORM per exercise name (from cached PRs table)
      const exerciseById = new Map((exerciseRows ?? []).map(ex => [ex.id, ex]))
      const liftMap = {}
      prsData?.forEach(pr => {
        const exercise = exerciseById.get(pr.exercise_id)
        const exerciseName = exercise?.name
        if (!exerciseName) return
        liftMap[exerciseName] = { ormKg: pr.best_1rm_kg, exerciseId: pr.exercise_id }
      })
      const rankStateByExerciseId = mapExerciseRankStates(rankStatesResult.rows)

      const preferredExercisesByName = new Map()
      for (const ex of exerciseRows ?? []) {
        if (!anchorNameSet.has(ex.name)) continue
        const existing = preferredExercisesByName.get(ex.name)
        const isGlobal = ex.user_id === null || ex.user_id === undefined
        const existingIsGlobal = existing?.user_id === null || existing?.user_id === undefined
        if (!existing || (isGlobal && !existingIsGlobal)) {
          preferredExercisesByName.set(ex.name, ex)
        }
      }

      const allLifts = anchorNames
        .map(name => preferredExercisesByName.get(name))
        .filter(Boolean)
        .map(ex => ({
          name: ex.name,
          category: ex.category,
          equipment: ex.equipment,
          exerciseId: ex.id,
          ormKg: liftMap[ex.name]?.ormKg ?? null,
          primary_muscles: ex.primary_muscles || [],
          secondary_muscles: ex.secondary_muscles || [],
          activeCurrentScore: rankStateByExerciseId.get(ex.id)?.current_score ?? null,
          activePeakScore: rankStateByExerciseId.get(ex.id)?.peak_score ?? null,
          activeLastRankedAt: rankStateByExerciseId.get(ex.id)?.last_ranked_at ?? null,
        }))

      const cardioLifts = (exerciseRows ?? [])
        .filter(ex => ex.category === 'Cardio' && ex.id)
        .map(ex => ({
          name: ex.name,
          category: ex.category,
          equipment: ex.equipment,
          exerciseId: ex.id,
          ormKg: null,
          primary_muscles: [],
          secondary_muscles: [],
          activeCurrentScore: null,
          activePeakScore: null,
          activeLastRankedAt: null,
        }))

      const ranksData = { userId, profile: profileData, lifts: [...allLifts, ...cardioLifts] }
      setCached('ranks', ranksData)
      setStartupSnapshot('ranks', ranksData, undefined, userId)
      setProfile(profileData)
      setLifts(allLifts)
    } catch (err) {
      console.error('Ranks load failed:', err)
      setLoadError(friendlyError(err, 'Could not load ranks.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => { load() }, 0)
    return () => clearTimeout(timer)
  }, [refreshTick, profileRefreshTick, userId]) // eslint-disable-line react-hooks/exhaustive-deps

  function openTopSetEditor(lift) {
    setEditingLiftId(lift.exerciseId)
    setTopSetForm({
      weight: lift.equipment === 'Bodyweight' ? '0' : '',
      reps: '1',
    })
    setTopSetError('')
    setTopSetNotice('')
  }

  function closeTopSetEditor() {
    setEditingLiftId(null)
    setTopSetForm({ weight: '', reps: '1' })
    setTopSetError('')
  }

  const useLbs = profile?.unit_preference === 'lbs'
  const fmt = (kg) => useLbs ? `${kgToLbs(kg).toFixed(1)} lbs` : `${kg.toFixed(1)} kg`

  const gender = profile?.gender?.toLowerCase() === 'female' ? 'female' : 'male'
  const profileLoaded = !loading && profile !== null
  const bodyweightKg = profile?.bodyweight
    ? (useLbs ? lbsToKg(profile.bodyweight) : profile.bodyweight)
    : null
  const missingBodyweight = profileLoaded && !profile?.bodyweight
  const isActiveMode = rankDisplayMode === ACTIVE_RANK_MODE
  const rankNow = Date.now()

  const liftsWithDetails = useMemo(() => {
    const now = Date.now()
    return lifts.map(lift => {
      const anchors = anchorsOrNull()?.[gender]?.[lift.name] ?? null
      const thresholds = anchors ? expandAnchors(anchors) : null
      const allTimeCardRank = lift.ormKg !== null && bodyweightKg && anchors
        ? getLiftRank(lift, lift.ormKg, bodyweightKg, gender)
        : null

      let activeScore = null
      if (bodyweightKg && thresholds) {
        if (lift.ormKg !== null && Number.isFinite(lift.activeCurrentScore)) {
          activeScore = applyInactivityDecay(
            Number(lift.activeCurrentScore),
            lift.activeLastRankedAt,
            now
          ).score
        } else if (allTimeCardRank) {
          activeScore = getContinuousTierScore(allTimeCardRank)
        }
      }

      const activeCardRank = activeScore !== null && thresholds
        ? getRankFromScore(lift, activeScore, thresholds)
        : null

      return {
        ...lift,
        anchors,
        thresholds,
        allTimeCardRank,
        activeCardRank,
        activeScore,
        cardRank: isActiveMode ? activeCardRank : allTimeCardRank,
      }
    })
  }, [lifts, gender, bodyweightKg, isActiveMode])

  const muscleGroupRanks = useMemo(() =>
    MUSCLE_GROUPS.map(group => buildMuscleGroupRank(group, liftsWithDetails)),
  [liftsWithDetails])
  const selectedMuscleGroupData = muscleGroupRanks.find(group => group.key === selectedMuscleGroup) ?? null
  const muscleChartData = muscleGroupRanks
    .filter(group => group.chartFrequency > 0)
    .map(group => ({
      name: group.label,
      muscles: group.chartMuscles,
      frequency: group.chartFrequency,
    }))
  const hasAnyMuscleRank = muscleGroupRanks.some(group => group.contributionCount > 0)
  const showMuscleRankPreview = !loading && !hasAnyMuscleRank
  const muscleChartSignature = muscleGroupRanks
    .map(group => `${group.key}:${group.tier}:${group.chartFrequency}`)
    .join('|')

  useEffect(() => {
    if (loading || !muscleChartSignature) {
      setMuscleLoadingActive(true)
      setMuscleRevealActive(false)
      return undefined
    }
    setMuscleRevealActive(true)
    const loadingOff = setTimeout(() => setMuscleLoadingActive(false), 720)
    const revealOff = setTimeout(() => setMuscleRevealActive(false), 1260)
    return () => {
      clearTimeout(loadingOff)
      clearTimeout(revealOff)
    }
  }, [loading, muscleChartSignature])

  const filteredLifts = useMemo(() => {
    const filtered = liftsWithDetails.filter(lift => {
      if (selectedMuscleGroupData && getMuscleContributionWeight(lift, selectedMuscleGroupData) === 0) {
        return false
      }
      if (!search.trim()) return true
      return matchesSearchQuery(
        search,
        lift.name,
        lift.category,
        lift.equipment,
        (lift.primary_muscles || []).join(' '),
        (lift.secondary_muscles || []).join(' ')
      )
    })
    const scores = search.trim()
      ? new Map(filtered.map(lift => [lift, scoreExerciseMatch(search, lift)]))
      : null
    return filtered.slice().sort((a, b) => {
      if (scores) {
        const diff = scores.get(b) - scores.get(a)
        if (diff !== 0) return diff
        const lengthDiff = a.name.length - b.name.length
        if (lengthDiff !== 0) return lengthDiff
      }
      if (!a.cardRank && !b.cardRank) return a.name.localeCompare(b.name)
      if (!a.cardRank) return 1
      if (!b.cardRank) return -1
      if (b.cardRank.tierIdx !== a.cardRank.tierIdx) return b.cardRank.tierIdx - a.cardRank.tierIdx
      if (b.cardRank.ratio !== a.cardRank.ratio) return b.cardRank.ratio - a.cardRank.ratio
      return a.name.localeCompare(b.name)
    })
  }, [liftsWithDetails, selectedMuscleGroupData, search])

  const editingLift = liftsWithDetails.find(lift => lift.exerciseId === editingLiftId) ?? null
  const enteredWeight = Number.parseFloat(topSetForm.weight)
  const enteredReps = Number.parseInt(topSetForm.reps, 10)
  const weightReady = editingLift
    && topSetForm.weight !== ''
    && Number.isFinite(enteredWeight)
    && isWeightWithinInputRange(enteredWeight, {
      equipment: editingLift.equipment,
      unit: useLbs ? 'lbs' : 'kg',
      bodyweightKg,
    })
  const repsReady = topSetForm.reps !== '' && isRepsWithinInputRange(enteredReps)
  const previewOrm = editingLift && weightReady && repsReady
    ? calculateSetEstimatedOrm({
        weight: enteredWeight,
        reps: enteredReps,
        unit: useLbs ? 'lbs' : 'kg',
        equipment: editingLift.equipment,
        bodyweightKg,
      })
    : null
  const previewOrmKg = previewOrm === null
    ? null
    : useLbs ? lbsToKg(previewOrm) : previewOrm
  const previewAllTimeRank = editingLift && previewOrmKg !== null
    ? getLiftRank(editingLift, previewOrmKg, bodyweightKg, gender)
    : null
  const previewActiveRank = (() => {
    if (!editingLift || previewOrmKg === null || !editingLift.thresholds || !bodyweightKg) return null

    const sessionScore = getLiftScoreFromOrm(editingLift, previewOrmKg, bodyweightKg, editingLift.thresholds)
    if (sessionScore === null) return null

    const currentActiveScore = Number.isFinite(editingLift.activeCurrentScore)
      ? applyInactivityDecay(
          Number(editingLift.activeCurrentScore),
          editingLift.activeLastRankedAt,
          rankNow
        ).score
      : (editingLift.allTimeCardRank ? getContinuousTierScore(editingLift.allTimeCardRank) : sessionScore)

    const nextScore = updateRollingScore({
      priorScore: currentActiveScore,
      priorLastRankedAt: editingLift.activeLastRankedAt,
      sessionScore,
      now: rankNow,
    })

    return getRankFromScore(editingLift, nextScore, editingLift.thresholds)
  })()
  const previewRank = isActiveMode ? previewActiveRank : previewAllTimeRank
  const improvesTopSet = editingLift && previewOrmKg !== null
    ? editingLift.ormKg === null || previewOrmKg > editingLift.ormKg + 0.01
    : false

  async function saveTopSet(lift) {
    if (topSetSaving) return

    const weight = Number.parseFloat(topSetForm.weight)
    const reps = Number.parseInt(topSetForm.reps, 10)
    const validWeight = isWeightWithinInputRange(weight, {
      equipment: lift.equipment,
      unit: useLbs ? 'lbs' : 'kg',
      bodyweightKg,
    })
    const validReps = isRepsWithinInputRange(reps)

    if (!validWeight || !validReps) {
      setTopSetError('Enter a valid weight and reps first.')
      return
    }

    const estimated1RM = calculateSetEstimatedOrm({
      weight,
      reps,
      unit: useLbs ? 'lbs' : 'kg',
      equipment: lift.equipment,
      bodyweightKg,
    })

    if (estimated1RM === null) {
      setTopSetError(`Estimated 1RM ranks are only available for sets of ${ESTIMATED_ORM_REP_CAP} reps or fewer.`)
      return
    }

    const estimated1RMKg = useLbs ? lbsToKg(estimated1RM) : estimated1RM
    const beatsCurrentTop = lift.ormKg === null || estimated1RMKg > lift.ormKg + 0.01

    if (!beatsCurrentTop) {
      setTopSetError('That set does not beat your current top set, so your rank would stay the same.')
      return
    }

    setTopSetSaving(true)
    setTopSetError('')

    if (!userId) {
      setTopSetSaving(false)
      return
    }
    try {
      const unit = useLbs ? 'lbs' : 'kg'
      const { error } = await supabase.from('workout_sets').insert({
        user_id: userId,
        session_id: null,
        exercise_id: lift.exerciseId,
        set_number: 1,
        reps,
        weight,
        unit,
        estimated_1rm: estimated1RM,
      })

      if (error) throw error

      const nowIso = new Date().toISOString()

      const { error: prError } = await supabase.from('exercise_prs').upsert({
        user_id: userId,
        exercise_id: lift.exerciseId,
        best_1rm_kg: estimated1RMKg,
        updated_at: nowIso,
      }, { onConflict: 'user_id,exercise_id' })
      if (prError) throw prError

      let nextActiveScore = null
      let nextActivePeakScore = null
      if (bodyweightKg && lift.thresholds) {
        const sessionScore = getLiftScoreFromOrm(lift, estimated1RMKg, bodyweightKg, lift.thresholds)
        if (sessionScore !== null) {
          const currentActiveScore = Number.isFinite(lift.activeCurrentScore)
            ? applyInactivityDecay(
                Number(lift.activeCurrentScore),
                lift.activeLastRankedAt,
                nowIso
              ).score
            : (lift.allTimeCardRank ? getContinuousTierScore(lift.allTimeCardRank) : sessionScore)

          nextActiveScore = updateRollingScore({
            priorScore: currentActiveScore,
            priorLastRankedAt: lift.activeLastRankedAt,
            sessionScore,
            now: nowIso,
          })

          const previousPeak = Number.isFinite(lift.activePeakScore)
            ? Number(lift.activePeakScore)
            : currentActiveScore
          nextActivePeakScore = Math.max(previousPeak, nextActiveScore)

          await upsertExerciseRankStates(userId, [{
            exerciseId: lift.exerciseId,
            currentScore: nextActiveScore,
            peakScore: nextActivePeakScore,
            lastRankedAt: nowIso,
            updatedAt: nowIso,
          }])
        }
      }

      invalidateCache('ranks', 'profile', 'achievements')
      setLifts(prev => prev.map(item => (
        item.exerciseId === lift.exerciseId
          ? {
              ...item,
              ormKg: Math.max(item.ormKg ?? 0, estimated1RMKg),
              activeCurrentScore: nextActiveScore ?? item.activeCurrentScore,
              activePeakScore: nextActivePeakScore ?? item.activePeakScore,
              activeLastRankedAt: nextActiveScore !== null ? nowIso : item.activeLastRankedAt,
            }
          : item
      )))
      onWorkoutDataChanged?.()

      const savedAllTimeRank = getLiftRank(lift, estimated1RMKg, bodyweightKg, gender)
      const savedActiveRank = nextActiveScore !== null && lift.thresholds
        ? getRankFromScore(lift, nextActiveScore, lift.thresholds)
        : null
      const savedRank = isActiveMode ? (savedActiveRank || savedAllTimeRank) : savedAllTimeRank
      setTopSetNotice(
        savedRank
          ? `${lift.name} saved. ${isActiveMode ? 'Active' : 'All-time'} rank: ${savedRank.tier}.`
          : `${lift.name} saved as your top set.`
      )
      closeTopSetEditor()
    } catch (error) {
      setTopSetError(friendlyError(error, 'Could not save your imported top set.'))
    } finally {
      setTopSetSaving(false)
    }
  }

  if (detailExerciseId) {
    return (
      <Suspense fallback={<LoadingSpinner fullPage />}>
        <ExerciseDetail
          exerciseId={detailExerciseId}
          rankMode={rankDisplayMode}
          onBack={() => window.history.back()}
        />
      </Suspense>
    )
  }

  const ormCalcW = parseFloat(ormWeight)
  const ormCalcR = parseInt(ormReps)
  const ormResult = Number.isFinite(ormCalcW) && ormCalcW > 0 && Number.isFinite(ormCalcR) && ormCalcR >= 1 && ormCalcR <= ESTIMATED_ORM_REP_CAP
    ? (() => {
        const kg = ormUnit === 'lbs' ? ormCalcW * 0.453592 : ormCalcW
        const resultKg = calculateORM(kg, ormCalcR)
        return ormUnit === 'lbs' ? Math.round(resultKg * 2.20462 * 10) / 10 : resultKg
      })()
    : null

  function renderImportPanel({ lift, isBW, isLogged, description }) {
    const saveLabel = topSetSaving ? 'Saving…' : isLogged ? 'Update top set' : 'Save as top set'
    const emptyPreviewHint = bodyweightKg
      ? 'Enter a set to preview the rank.'
      : 'Set bodyweight first to preview the rank.'
    return (
      <div className="lift-import-panel">
        <div className="lift-import-title">Manual rank update</div>
        <div className="lift-import-sub">{description}</div>
        <div className="lift-import-grid">
          <label className="lift-import-field">
            <span>{isBW ? 'Added / assisted weight' : 'Weight'}</span>
            <div className="lift-import-input-wrap">
              <input
                className="lift-import-input"
                type="number"
                inputMode={getWeightInputMin(lift.equipment, useLbs ? 'lbs' : 'kg', bodyweightKg) < 0 ? 'text' : 'decimal'}
                min={String(getWeightInputMin(lift.equipment, useLbs ? 'lbs' : 'kg', bodyweightKg))}
                max={String(getWeightInputMax(lift.equipment, useLbs ? 'lbs' : 'kg'))}
                step="any"
                value={topSetForm.weight}
                onChange={e => {
                  setTopSetForm(prev => ({ ...prev, weight: e.target.value }))
                  setTopSetError('')
                  setTopSetNotice('')
                }}
              />
              <span>{useLbs ? 'lbs' : 'kg'}</span>
            </div>
          </label>
          <label className="lift-import-field">
            <span>Reps</span>
            <input
              className="lift-import-input"
              type="number"
              min="1"
              max={String(MAX_REPS)}
              step="1"
              value={topSetForm.reps}
              onChange={e => {
                setTopSetForm(prev => ({ ...prev, reps: e.target.value }))
                setTopSetError('')
                setTopSetNotice('')
              }}
            />
          </label>
        </div>
        {previewOrmKg !== null && (
          <div className="lift-import-preview">
            <span>Est. 1RM</span>
            <strong>{fmt(previewOrmKg)}</strong>
          </div>
        )}
        {previewRank ? (
          <div className="lift-import-rank">
            <div className="tier-badge" style={{ background: previewRank.color + '22', color: previewRank.color }}>
              <RankBadge tier={tierGroup(previewRank.tier)} size={18} />
              {previewRank.tier}
            </div>
            <span className="lift-import-ratio">{previewRank.ratio.toFixed(2)}× BW</span>
          </div>
        ) : (
          <div className="lift-import-hint">{emptyPreviewHint}</div>
        )}
        {previewOrmKg !== null && !improvesTopSet && (
          <div className="lift-import-hint">
            Your current top set is still higher, so saving this would not change your rank.
          </div>
        )}
        {topSetError && <div className="lift-import-error">{topSetError}</div>}
        <button
          className="lift-import-save"
          onClick={() => saveTopSet(lift)}
          disabled={!weightReady || !repsReady || !improvesTopSet || topSetSaving}
        >
          {saveLabel}
        </button>
      </div>
    )
  }

  return (
    <>
    <div className="ranks-screen">
      <div className="ranks-header">
        <div className="ranks-title-row">
          <div className="ranks-title">Strength Ranks</div>
          <button className="orm-calc-btn" onClick={() => setOrmCalcOpen(true)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="2" width="16" height="20" rx="2"/>
              <line x1="8" y1="6" x2="16" y2="6"/>
              <line x1="8" y1="10" x2="16" y2="10"/>
              <line x1="8" y1="14" x2="12" y2="14"/>
            </svg>
            1RM Calculator
          </button>
        </div>
        <div className="ranks-subtitle">
          {isActiveMode
            ? 'Current ranks track recent form with rolling updates and a 21-day inactivity grace period.'
            : 'All-time ranks are based on your best recorded 1RM for each exercise.'}
          {' '}· {TIERS.length} tiers · {lifts.length} exercises
        </div>
        <div className="ranks-mode-toggle" role="tablist" aria-label="Rank display mode">
          <button
            type="button"
            className={`ranks-mode-btn ${rankDisplayMode === ACTIVE_RANK_MODE ? 'active' : ''}`}
            onClick={() => setRankDisplayMode(ACTIVE_RANK_MODE)}
          >
            Current
          </button>
          <button
            type="button"
            className={`ranks-mode-btn ${rankDisplayMode === ALL_TIME_RANK_MODE ? 'active' : ''}`}
            onClick={() => setRankDisplayMode(ALL_TIME_RANK_MODE)}
          >
            All-Time
          </button>
        </div>
      </div>

      {topSetNotice && (
        <div className="ranks-notice ranks-notice-success">{topSetNotice}</div>
      )}

      <div className={`ranks-dropdown${rankLegendOpen ? ' open' : ''}`}>
        <button
          type="button"
          className="ranks-dropdown-summary"
          aria-expanded={rankLegendOpen}
          onClick={() => setRankLegendOpen(open => !open)}
        >
          <span className="ranks-dropdown-label">Rank Legend</span>
          <span className="ranks-dropdown-value">{TIER_GROUPS.length} tiers</span>
        </button>
        {rankLegendOpen && (
          <div className="tier-legend">
            {TIER_GROUPS.map(g => (
              <div key={g} className="tier-legend-item">
                <RankBadge tier={g} size={22} />
                <span>{g}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="ranks-muscle-panel">
        <div className="ranks-muscle-panel-top">
          <div>
            <div className="ranks-muscle-title">Muscle Group Ranks</div>
            <div className="ranks-muscle-subtitle">
            </div>
          </div>
        </div>

        <label className="ranks-filter-field">
          <span className="ranks-filter-label">Muscle Filter</span>
          <div className="ranks-select-wrap">
            <select
              className="ranks-select"
              value={selectedMuscleGroup || ''}
              onChange={e => setSelectedMuscleGroup(e.target.value || null)}
            >
              <option value="">All muscle groups</option>
              {muscleGroupRanks.map(group => (
                <option key={group.key} value={group.key}>
                  {group.label} · {group.tier}
                </option>
              ))}
            </select>
          </div>
        </label>

        <div ref={muscleMapRef} className={`ranks-muscle-map-shell ${muscleLoadingActive ? 'ranks-muscle-map-shell-loading' : ''} ${muscleRevealActive ? 'ranks-muscle-map-shell-revealing' : ''} ${showMuscleRankPreview ? 'ranks-muscle-map-shell-empty' : ''}`}>
          <div className="ranks-muscle-models">
            <div
              className={`ranks-muscle-model ${muscleLoadingActive ? 'ranks-muscle-model-loading' : ''} ${muscleRevealActive ? 'ranks-muscle-model-revealing' : ''} ${showMuscleRankPreview ? 'ranks-muscle-model-empty' : ''}`}
              style={{
                ...(muscleLoadingActive ? { '--loading-delay': '0ms' } : {}),
                ...(muscleRevealActive ? { '--reveal-delay': '0ms' } : {}),
              }}
            >
              <div className="ranks-muscle-model-label">Front</div>
              <div className="ranks-muscle-model-stack">
                <div className="ranks-muscle-model-base">
                  <Model
                    data={muscleChartData}
                    type="anterior"
                    bodyColor="rgba(255, 255, 255, 0.14)"
                    highlightedColors={MUSCLE_CHART_COLORS}
                    onClick={({ muscle }) => {
                      if (!MUSCLE_GROUP_KEYS.has(muscle)) return
                      setSelectedMuscleGroup(current => current === muscle ? null : muscle)
                    }}
                    style={{ width: '100%', aspectRatio: '1 / 2' }}
                  />
                </div>
                {(muscleLoadingActive || muscleRevealActive) && (
                  <div className="ranks-muscle-model-loader-layer" aria-hidden="true">
                    <Model
                      data={muscleChartData}
                      type="anterior"
                      bodyColor="rgba(255, 255, 255, 0.14)"
                      highlightedColors={MUSCLE_CHART_COLORS}
                      style={{ width: '100%', aspectRatio: '1 / 2' }}
                    />
                  </div>
                )}
              </div>
            </div>
            <div
              className={`ranks-muscle-model ${muscleLoadingActive ? 'ranks-muscle-model-loading' : ''} ${muscleRevealActive ? 'ranks-muscle-model-revealing' : ''} ${showMuscleRankPreview ? 'ranks-muscle-model-empty' : ''}`}
              style={{
                ...(muscleLoadingActive ? { '--loading-delay': '150ms' } : {}),
                ...(muscleRevealActive ? { '--reveal-delay': '80ms' } : {}),
              }}
            >
              <div className="ranks-muscle-model-label">Back</div>
              <div className="ranks-muscle-model-stack">
                <div className="ranks-muscle-model-base">
                  <Model
                    data={muscleChartData}
                    type="posterior"
                    bodyColor="rgba(255, 255, 255, 0.14)"
                    highlightedColors={MUSCLE_CHART_COLORS}
                    onClick={({ muscle }) => {
                      if (!MUSCLE_GROUP_KEYS.has(muscle)) return
                      setSelectedMuscleGroup(current => current === muscle ? null : muscle)
                    }}
                    style={{ width: '100%', aspectRatio: '1 / 2' }}
                  />
                </div>
                {(muscleLoadingActive || muscleRevealActive) && (
                  <div className="ranks-muscle-model-loader-layer" aria-hidden="true">
                    <Model
                      data={muscleChartData}
                      type="posterior"
                      bodyColor="rgba(255, 255, 255, 0.14)"
                      highlightedColors={MUSCLE_CHART_COLORS}
                      style={{ width: '100%', aspectRatio: '1 / 2' }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {selectedMuscleGroupData && (
          <div className="ranks-muscle-active">
            <div className="tier-badge" style={{ background: selectedMuscleGroupData.color + '22', color: selectedMuscleGroupData.color }}>
              <RankBadge tier={selectedMuscleGroupData.contributionCount > 0 ? tierGroup(selectedMuscleGroupData.tier) : 'Unranked'} size={18} />
              {selectedMuscleGroupData.label}
            </div>
            <div className="ranks-muscle-active-copy">
              <div
                className="ranks-muscle-active-tier"
                style={{ color: selectedMuscleGroupData.contributionCount > 0 ? selectedMuscleGroupData.color : 'var(--muted)' }}
              >
                {selectedMuscleGroupData.tier}
              </div>
              <div className="ranks-muscle-active-sub">
                {selectedMuscleGroupData.matchingLiftCount} exercise{selectedMuscleGroupData.matchingLiftCount === 1 ? '' : 's'} in this group
                {selectedMuscleGroupData.contributionCount > 0 ? ` · ${selectedMuscleGroupData.contributionCount} ranked` : ''}
              </div>
            </div>
          </div>
        )}
      </div>

      {missingBodyweight && (
        <div className="ranks-bw-prompt">
          <div className="ranks-bw-prompt-title">Set your bodyweight to unlock ranks</div>
          <div className="ranks-bw-prompt-sub">Your strength tier is calculated as your 1RM relative to bodyweight.</div>
          <div className="ranks-bw-prompt-row">
            <input
              className="ranks-bw-input"
              type="number"
              min={useLbs ? '44.1' : '20'}
              max={useLbs ? '1322.8' : '600'}
              step="0.1"
              inputMode="decimal"
              placeholder={useLbs ? 'e.g. 175' : 'e.g. 80'}
              value={bwInput}
              onChange={e => { setBwError(''); setBwInput(e.target.value) }}
            />
            <span className="ranks-bw-unit">{useLbs ? 'lbs' : 'kg'}</span>
            <button className="ranks-bw-save" onClick={saveBW} disabled={bwSaving || !bwInput}>
              {bwSaving ? 'Saving…' : 'Save'}
            </button>
          </div>
          {bwError && <div className="ranks-notice">{bwError}</div>}
        </div>
      )}

      <input
        className="ranks-search"
        type="text"
        placeholder={selectedMuscleGroupData ? `Search ${selectedMuscleGroupData.label.toLowerCase()} exercises...` : 'Search exercises...'}
        value={search}
        onChange={e => setSearch(e.target.value)}
        maxLength={VALIDATION_LIMITS.searchMaxLength}
      />

      <div className="ranks-cards-shell">
        {skeletonVisible && (
          <div className={'ranks-skeleton-overlay' + (skeletonFading ? ' ranks-skeleton-overlay--exit' : '')}>
            <RanksSkeleton />
          </div>
        )}
        {!loading && (loadError ? (
          <div className="ranks-empty">{loadError}</div>
        ) : filteredLifts.length === 0 ? (
          <div className="ranks-empty">
            {selectedMuscleGroupData
              ? `No exercises match ${selectedMuscleGroupData.label.toLowerCase()}${search.trim() ? ` for "${search.trim()}"` : ''}.`
              : search.trim()
                ? `No exercises match "${search.trim()}".`
                : 'No exercises found.'}
          </div>
        ) : (
          <div className="lift-cards">
            {filteredLifts.map((lift, index) => {
              const thresholds = lift.thresholds
              const isLogged = lift.ormKg !== null
              const cardRank = lift.cardRank
              const isEditing = editingLiftId === lift.exerciseId

              // Unranked: not logged yet, or no bodyweight
              if (!isLogged || !bodyweightKg) {
                return (
                  <div key={lift.name} className="lift-card" style={{ '--card-index': index }}>
                    <div className="lift-card-top">
                      <div>
                        <div className="lift-name">{lift.name}</div>
                        <div className="lift-category">{lift.category}</div>
                      </div>
                      <button className="info-btn" onClick={() => setDetailExerciseId(lift.exerciseId)}>i</button>
                    </div>
                    <div className="lift-tier-row">
                      <div className="tier-badge" style={{ background: '#4b556322', color: '#4b5563' }}>
                        <RankBadge tier="Unranked" size={18} />
                        Unranked
                      </div>
                    </div>
                    {lift.category !== 'Cardio' && (
                      !bodyweightKg
                        ? <div className="lift-no-bw">Add bodyweight in Profile to see targets</div>
                        : thresholds && <TierSwiper thresholds={thresholds} isBW={lift.equipment === 'Bodyweight'} bodyweightKg={bodyweightKg} currentTierIdx={null} fmt={fmt} useLbs={useLbs} />
                    )}
                    {lift.category !== 'Cardio' && <button className="lift-import-btn" onClick={() => isEditing ? closeTopSetEditor() : openTopSetEditor(lift)}>
                      {isEditing ? 'Cancel' : isLogged ? 'Update top set' : 'Add top set'}
                    </button>}
                    {lift.category !== 'Cardio' && isEditing && renderImportPanel({
                      lift,
                      isBW: lift.equipment === 'Bodyweight',
                      isLogged,
                      description: lift.equipment === 'Bodyweight'
                        ? 'Enter the added or assisted weight for your best set. Use a negative number for assisted machine reps.'
                        : "Enter your best set and we'll use it as your imported top set.",
                    })}
                  </div>
                )
              }

              // Ranked
              const { isBW, ratio, tier, color, progress, isMax, nextTier, tierIdx } = cardRank


              return (
                <div key={lift.name} className="lift-card" style={{ '--card-index': index }}>
                  <div className="lift-card-top">
                    <div>
                      <div className="lift-name">{lift.name}</div>
                      <div className="lift-category">{lift.category}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="lift-right">
                        <div className="lift-orm">{fmt(lift.ormKg)}</div>
                        <div className="lift-ratio">{ratio.toFixed(2)}× BW</div>
                      </div>
                      <button className="info-btn" onClick={() => setDetailExerciseId(lift.exerciseId)}>i</button>
                    </div>
                  </div>

                  <div className="lift-tier-row">
                    <div className="tier-badge" style={{ background: color + '22', color }}>
                      <RankBadge tier={tierGroup(tier)} size={18} />
                      {tier}
                    </div>
                    {nextTier && (
                      <span className="lift-next-label">
                        → <span style={{ color: tierColor(nextTier) }}>{nextTier}</span>
                      </span>
                    )}
                    {isMax && <span className="lift-next-label" style={{ color: TIER_COLORS.Elite }}>Max Rank</span>}
                  </div>

                  <TierProgressBar
                    currentTier={tier}
                    nextTier={nextTier}
                    progress={progress}
                    color={color}
                    isMax={isMax}
                    badgeSize={18}
                  />

                  {thresholds && <TierSwiper thresholds={thresholds} isBW={isBW} bodyweightKg={bodyweightKg} currentTierIdx={tierIdx} fmt={fmt} useLbs={useLbs} />}
                  <button className="lift-import-btn" onClick={() => isEditing ? closeTopSetEditor() : openTopSetEditor(lift)}>
                    {isEditing ? 'Cancel' : 'Update top set'}
                  </button>
                  {isEditing && renderImportPanel({
                    lift,
                    isBW,
                    isLogged: true,
                    description: isBW
                      ? 'Enter the added or assisted weight for your imported best set. Use a negative number for assisted machine reps.'
                      : 'Enter a better top set to update your best lift and rank.',
                  })}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>

    {ormCalcOpen && createPortal(
      <div className="confirm-overlay" onClick={() => setOrmCalcOpen(false)}>
        <div className="confirm-sheet orm-calc-sheet" onClick={e => e.stopPropagation()} ref={ormCalcRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="1RM Calculator">
          <div className="orm-calc-header">
            <div className="orm-calc-title">1RM Calculator</div>
            <div className="unit-toggle">
              <button className={`unit-btn ${ormUnit === 'kg' ? 'active' : ''}`} onClick={() => setOrmUnit('kg')}>kg</button>
              <button className={`unit-btn ${ormUnit === 'lbs' ? 'active' : ''}`} onClick={() => setOrmUnit('lbs')}>lbs</button>
            </div>
          </div>
          <div className="orm-calc-sub">Estimate your one-rep max from any working set</div>
          <div className="lift-import-grid">
            <label className="lift-import-field">
              <span>Weight ({ormUnit})</span>
              <div className="lift-import-input-wrap">
                <input
                  className="lift-import-input"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  max={MAX_WEIGHT}
                  step="any"
                  placeholder="0"
                  value={ormWeight}
                  onChange={e => setOrmWeight(e.target.value)}
                />
                <span>{ormUnit}</span>
              </div>
            </label>
            <label className="lift-import-field">
              <span>Reps</span>
              <input
                className="lift-import-input"
                type="number"
                inputMode="numeric"
                min="1"
                max="36"
                step="1"
                placeholder="0"
                value={ormReps}
                onChange={e => setOrmReps(e.target.value)}
              />
            </label>
          </div>
          {ormResult !== null ? (
            <div className="orm-calc-result">
              <span className="orm-calc-result-label">Estimated 1RM</span>
              <span className="orm-calc-result-value">{ormResult} {ormUnit}</span>
            </div>
          ) : (
            <div className="orm-calc-placeholder">Enter weight and reps to see your estimate</div>
          )}
          <button className="confirm-keep" onClick={() => setOrmCalcOpen(false)}>Done</button>
        </div>
      </div>,
      document.body
    )}
    </>
  )
}
