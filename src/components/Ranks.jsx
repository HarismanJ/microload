import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import Model from 'react-body-highlighter'
import { supabase } from '../lib/supabase'
import { getCached, setCached, invalidateCache } from '../lib/cache'
import { calculateORM } from '../lib/orm'
import { fetchExercises } from '../data/exercises'
import RankBadge from './RankBadge'
import LoadingSpinner from './LoadingSpinner'
import {
  TIERS, TIER_COLORS, ANCHORS,
  tierGroup, tierColor,
  expandAnchors, getTierIdx, getProgress, weightForOrm,
} from '../lib/strengthStandards'
import {
  MAX_REPS,
  getWeightInputMax,
  getWeightInputMin,
  isRepsWithinInputRange,
  isWeightWithinInputRange,
} from '../lib/liftMath'
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

function lbsToKg(v) { return v * 0.453592 }
function kgToLbs(v) { return v * 2.20462 }

function getLiftRank(lift, ormKg, bodyweightKg, gender) {
  const anchors = ANCHORS[gender]?.[lift.name]
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

function getContinuousTierScore(rank) {
  return rank.tierIdx + Math.min(0.999, (rank.progress ?? 0) / 100)
}

function resolveTierFromScore(score) {
  const cappedScore = Math.max(0, Math.min(TIERS.length - 0.001, score))
  const tierIdx = Math.floor(cappedScore)
  const tier = TIERS[tierIdx]
  const isMax = tierIdx === TIERS.length - 1
  return {
    tierIdx,
    tier,
    color: tierColor(tier),
    progress: isMax ? 100 : Math.round((cappedScore - tierIdx) * 100),
    isMax,
    nextTier: isMax ? null : TIERS[tierIdx + 1],
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

  let totalWeightedScore = 0
  let totalWeight = 0
  contributions.forEach((entry, index) => {
    const decayWeight = 1 / Math.sqrt(index + 1)
    const effectiveWeight = entry.muscleWeight * decayWeight
    totalWeightedScore += entry.score * effectiveWeight
    totalWeight += effectiveWeight
  })

  const resolvedRank = resolveTierFromScore(totalWeightedScore / totalWeight)

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

export default function Ranks() {
  const [profile, setProfile] = useState(null)
  const [lifts, setLifts] = useState([])
  const [loading, setLoading] = useState(true)
  const [muscleLoadingActive, setMuscleLoadingActive] = useState(true)
  const [muscleRevealActive, setMuscleRevealActive] = useState(false)
  const [detailExerciseId, setDetailExerciseId] = useState(null)
  const [search, setSearch] = useState('')
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState(null)
  const [bwInput, setBwInput] = useState('')
  const [bwSaving, setBwSaving] = useState(false)
  const [editingLiftId, setEditingLiftId] = useState(null)
  const [topSetForm, setTopSetForm] = useState({ weight: '', reps: '1' })
  const [topSetSaving, setTopSetSaving] = useState(false)
  const [topSetError, setTopSetError] = useState('')
  const [topSetNotice, setTopSetNotice] = useState('')

  async function saveBW() {
    const val = parseFloat(bwInput)
    if (!val || val <= 0) return
    setBwSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const unit = profile?.unit_preference || 'kg'
    await Promise.all([
      supabase.from('profiles').update({ bodyweight: val }).eq('id', user.id),
      supabase.from('body_weight_logs').insert({ user_id: user.id, weight: val, unit }),
    ])
    invalidateCache('ranks', 'profile', 'home')
    setProfile(p => ({ ...p, bodyweight: val }))
    setBwInput('')
    setBwSaving(false)
  }

  async function load() {
    const cached = getCached('ranks')
    const cachedHasMuscles = cached?.lifts?.every(lift =>
      Array.isArray(lift.primary_muscles) && Array.isArray(lift.secondary_muscles)
    )
    if (cached?.profile && Array.isArray(cached.lifts) && cached.lifts.length > 0 && cachedHasMuscles) {
      setProfile(cached.profile)
      setLifts(cached.lifts)
      setLoading(false)
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      const anchorNames = Object.keys(ANCHORS.male)
      const anchorNameSet = new Set(anchorNames)

      const [{ data: profileData }, { data: setsData }, exerciseRows] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase
          .from('workout_sets')
          .select('exercise_id, estimated_1rm, unit, exercises(name, category)')
          .eq('user_id', user.id)
          .not('estimated_1rm', 'is', null),
        fetchExercises(user.id),
      ])

      // Best ORM per exercise name
      const liftMap = {}
      setsData?.forEach(s => {
        const exerciseName = s.exercises?.name
        if (!exerciseName) return
        const ormKg = s.unit === 'lbs' ? lbsToKg(s.estimated_1rm) : s.estimated_1rm
        if (!liftMap[exerciseName] || ormKg > liftMap[exerciseName].ormKg) {
          liftMap[exerciseName] = { ormKg, exerciseId: s.exercise_id }
        }
      })

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
        }))

      setCached('ranks', { profile: profileData, lifts: allLifts })
      setProfile(profileData)
      setLifts(allLifts)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => { load() }, 0)
    return () => clearTimeout(timer)
  }, [])

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
  const missingBodyweight = profileLoaded && (profile.bodyweight === null || profile.bodyweight === undefined)

  const liftsWithDetails = lifts.map(lift => {
    const anchors = ANCHORS[gender]?.[lift.name] ?? null
    const cardRank = lift.ormKg !== null && bodyweightKg && anchors
      ? getLiftRank(lift, lift.ormKg, bodyweightKg, gender)
      : null
    return {
      ...lift,
      anchors,
      cardRank,
    }
  })

  const muscleGroupRanks = MUSCLE_GROUPS.map(group => buildMuscleGroupRank(group, liftsWithDetails))
  const selectedMuscleGroupData = muscleGroupRanks.find(group => group.key === selectedMuscleGroup) ?? null
  const muscleChartData = muscleGroupRanks
    .filter(group => group.chartFrequency > 0)
    .map(group => ({
      name: group.label,
      muscles: group.chartMuscles,
      frequency: group.chartFrequency,
    }))
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

  const filteredLifts = liftsWithDetails
    .filter(lift => {
      if (selectedMuscleGroupData && getMuscleContributionWeight(lift, selectedMuscleGroupData) === 0) {
        return false
      }
      if (!search.trim()) return true
      const query = search.toLowerCase()
      return lift.name.toLowerCase().includes(query) || lift.category.toLowerCase().includes(query)
    })
    .slice()
    .sort((a, b) => {
      if (!a.cardRank && !b.cardRank) return a.name.localeCompare(b.name)
      if (!a.cardRank) return 1
      if (!b.cardRank) return -1
      if (b.cardRank.tierIdx !== a.cardRank.tierIdx) return b.cardRank.tierIdx - a.cardRank.tierIdx
      if (b.cardRank.ratio !== a.cardRank.ratio) return b.cardRank.ratio - a.cardRank.ratio
      return a.name.localeCompare(b.name)
    })

  const editingLift = lifts.find(lift => lift.exerciseId === editingLiftId) ?? null
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
    ? calculateORM(enteredWeight, enteredReps)
    : null
  const previewOrmKg = previewOrm === null
    ? null
    : useLbs ? lbsToKg(previewOrm) : previewOrm
  const previewRank = editingLift && previewOrmKg !== null
    ? getLiftRank(editingLift, previewOrmKg, bodyweightKg, gender)
    : null
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

    const estimated1RM = calculateORM(weight, reps)
    const estimated1RMKg = useLbs ? lbsToKg(estimated1RM) : estimated1RM
    const beatsCurrentTop = lift.ormKg === null || estimated1RMKg > lift.ormKg + 0.01

    if (!beatsCurrentTop) {
      setTopSetError('That set does not beat your current top set, so your rank would stay the same.')
      return
    }

    setTopSetSaving(true)
    setTopSetError('')

    const { data: { user } } = await supabase.auth.getUser()
    const unit = useLbs ? 'lbs' : 'kg'
    const { error } = await supabase.from('workout_sets').insert({
      user_id: user.id,
      session_id: null,
      exercise_id: lift.exerciseId,
      set_number: 1,
      reps,
      weight,
      unit,
      estimated_1rm: estimated1RM,
    })

    if (error) {
      setTopSetSaving(false)
      setTopSetError(error.message || 'Could not save your imported top set.')
      return
    }

    invalidateCache('ranks', 'profile', 'achievements')
    setLifts(prev => prev.map(item => (
      item.exerciseId === lift.exerciseId
        ? { ...item, ormKg: Math.max(item.ormKg ?? 0, estimated1RMKg) }
        : item
    )))

    const savedRank = getLiftRank(lift, estimated1RMKg, bodyweightKg, gender)
    setTopSetNotice(
      savedRank
        ? `${lift.name} saved. Current rank: ${savedRank.tier}.`
        : `${lift.name} saved as your top set.`
    )
    setTopSetSaving(false)
    closeTopSetEditor()
  }

  if (detailExerciseId) {
    return (
      <Suspense fallback={<LoadingSpinner fullPage />}>
        <ExerciseDetail exerciseId={detailExerciseId} onBack={() => setDetailExerciseId(null)} />
      </Suspense>
    )
  }

  return (
    <div className="ranks-screen">
      <div className="ranks-header">
        <div className="ranks-title">Strength Ranks</div>
        <div className="ranks-subtitle">Your 1RM relative to bodyweight · {TIERS.length} tiers · {lifts.length} exercises</div>
      </div>

      {topSetNotice && (
        <div className="ranks-notice ranks-notice-success">{topSetNotice}</div>
      )}

      <details className="ranks-dropdown">
        <summary className="ranks-dropdown-summary">
          <span className="ranks-dropdown-label">Rank Legend</span>
          <span className="ranks-dropdown-value">{TIER_GROUPS.length} tiers</span>
        </summary>
        <div className="tier-legend">
          {TIER_GROUPS.map(g => (
            <div key={g} className="tier-legend-item">
              <RankBadge tier={g} size={22} />
              <span>{g}</span>
            </div>
          ))}
        </div>
      </details>

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

        <div className={`ranks-muscle-map-shell ${muscleLoadingActive ? 'ranks-muscle-map-shell-loading' : ''} ${muscleRevealActive ? 'ranks-muscle-map-shell-revealing' : ''}`}>
          <div className="ranks-muscle-models">
            <div
              className={`ranks-muscle-model ${muscleLoadingActive ? 'ranks-muscle-model-loading' : ''} ${muscleRevealActive ? 'ranks-muscle-model-revealing' : ''}`}
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
              className={`ranks-muscle-model ${muscleLoadingActive ? 'ranks-muscle-model-loading' : ''} ${muscleRevealActive ? 'ranks-muscle-model-revealing' : ''}`}
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
              placeholder={useLbs ? 'e.g. 175' : 'e.g. 80'}
              value={bwInput}
              onChange={e => setBwInput(e.target.value)}
            />
            <span className="ranks-bw-unit">{useLbs ? 'lbs' : 'kg'}</span>
            <button className="ranks-bw-save" onClick={saveBW} disabled={bwSaving || !bwInput}>
              {bwSaving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}

      <input
        className="ranks-search"
        type="text"
        placeholder={selectedMuscleGroupData ? `Search ${selectedMuscleGroupData.label.toLowerCase()} exercises...` : 'Search exercises...'}
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {loading ? (
        <LoadingSpinner fullPage />
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
          {filteredLifts.map(lift => {
            const thresholds = lift.anchors ? expandAnchors(lift.anchors) : null
            const isLogged = lift.ormKg !== null
            const cardRank = lift.cardRank
            const isEditing = editingLiftId === lift.exerciseId

            // Unranked: not logged yet, or no bodyweight
            if (!isLogged || !bodyweightKg) {
              return (
                <div key={lift.name} className="lift-card">
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
                  {!bodyweightKg
                    ? <div className="lift-no-bw">Add bodyweight in Profile to see targets</div>
                    : thresholds && <TierSwiper thresholds={thresholds} isBW={lift.equipment === 'Bodyweight'} bodyweightKg={bodyweightKg} currentTierIdx={null} fmt={fmt} useLbs={useLbs} />
                  }
                  <button className="lift-import-btn" onClick={() => isEditing ? closeTopSetEditor() : openTopSetEditor(lift)}>
                    {isEditing ? 'Cancel' : isLogged ? 'Update top set' : 'Add top set'}
                  </button>
                  {isEditing && (
                    <div className="lift-import-panel">
                      <div className="lift-import-title">Manual rank update</div>
                      <div className="lift-import-sub">
                        {lift.equipment === 'Bodyweight'
                          ? 'Enter the added or assisted weight for your best set. Use a negative number for assisted machine reps.'
                          : 'Enter your best set and we’ll use it as your imported top set.'}
                      </div>
                      <div className="lift-import-grid">
                        <label className="lift-import-field">
                          <span>{lift.equipment === 'Bodyweight' ? 'Added / assisted weight' : 'Weight'}</span>
                          <div className="lift-import-input-wrap">
                            <input
                              className="lift-import-input"
                              type="number"
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
                        <div className="lift-import-hint">
                          {bodyweightKg ? 'Enter a set to preview the rank.' : 'Set bodyweight first to preview the rank.'}
                        </div>
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
                        {topSetSaving ? 'Saving…' : isLogged ? 'Update top set' : 'Save as top set'}
                      </button>
                    </div>
                  )}
                </div>
              )
            }

            // Ranked
            const { isBW, ratio, tier, color, progress, isMax, nextTier, tierIdx } = cardRank


            return (
              <div key={lift.name} className="lift-card">
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

                <div className="lift-progress-track">
                  <div className="lift-progress-fill" style={{ width: `${progress}%`, background: color }} />
                </div>
                <div className="lift-progress-pct">{isMax ? '100%' : `${progress}%`}</div>

                {thresholds && <TierSwiper thresholds={thresholds} isBW={isBW} bodyweightKg={bodyweightKg} currentTierIdx={tierIdx} fmt={fmt} useLbs={useLbs} />}
                <button className="lift-import-btn" onClick={() => isEditing ? closeTopSetEditor() : openTopSetEditor(lift)}>
                  {isEditing ? 'Cancel' : 'Update top set'}
                </button>
                {isEditing && (
                  <div className="lift-import-panel">
                    <div className="lift-import-title">Manual rank update</div>
                    <div className="lift-import-sub">
                      {isBW
                        ? 'Enter the added or assisted weight for your imported best set. Use a negative number for assisted machine reps.'
                        : 'Enter a better top set to update your best lift and rank.'}
                    </div>
                    <div className="lift-import-grid">
                      <label className="lift-import-field">
                        <span>{isBW ? 'Added / assisted weight' : 'Weight'}</span>
                        <div className="lift-import-input-wrap">
                          <input
                            className="lift-import-input"
                            type="number"
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
                      <div className="lift-import-hint">Enter a set to preview the updated rank.</div>
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
                      {topSetSaving ? 'Saving…' : 'Update top set'}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
