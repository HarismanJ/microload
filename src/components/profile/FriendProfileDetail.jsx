import { useEffect, useMemo, useState } from 'react'
import { getCached, setCached } from '../../lib/cache'
import { computeStreak } from '../../lib/streakUtils'
import Model from 'react-body-highlighter'
import { supabase } from '../../lib/supabase'
import { useCurrentUserId } from '../../context/UserContext'
import { fetchExercises } from '../../data/exercises'
import { fetchExerciseRankStates, mapExerciseRankStates } from '../../data/rankStates'
import RankBadge from '../RankBadge'
import LoadingSpinner from '../LoadingSpinner'
import {
  TIERS,
  TIER_COLORS,
  tierGroup,
  tierColor,
  expandAnchors,
  getTierIdx,
  getProgress,
  getAnchors,
  anchorsOrNull,
} from '../../lib/strengthStandards'
import { convertWeight } from '../../lib/liftMath'
import { VALIDATION_LIMITS } from '../../lib/inputValidation'
import {
  ACTIVE_RANK_MODE,
  ALL_TIME_RANK_MODE,
  applyInactivityDecay,
  getContinuousTierScore,
  inferRatioFromScore,
  resolveTierFromScore,
} from '../../lib/rollingRanks'
import '../../styles/Ranks.css'
import '../../styles/Profile.css'

const FRIEND_TIER_GROUPS = ['Unranked', 'Iron', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Master', 'Grandmaster', 'Elite']
const SECONDARY_MUSCLE_WEIGHT = 0.35
const RANK_DISPLAY_MODE_STORAGE_KEY = 'ranks:display-mode'
const MUSCLE_GROUPS = [
  { key: 'chest', label: 'Chest', muscles: ['Chest', 'Upper Chest', 'Lower Chest'], chartMuscles: ['chest'] },
  { key: 'front-deltoids', label: 'Shoulders', muscles: ['Front Delts', 'Lateral Delts', 'Shoulders'], chartMuscles: ['front-deltoids', 'back-deltoids'] },
  { key: 'biceps', label: 'Biceps', muscles: ['Biceps'], chartMuscles: ['biceps'] },
  { key: 'triceps', label: 'Triceps', muscles: ['Triceps'], chartMuscles: ['triceps'] },
  { key: 'forearm', label: 'Forearms', muscles: ['Forearms'], chartMuscles: ['forearm'] },
  { key: 'abs', label: 'Abs', muscles: ['Abs', 'Core'], chartMuscles: ['abs'] },
  { key: 'obliques', label: 'Obliques', muscles: ['Obliques', 'Core'], chartMuscles: ['obliques'] },
  { key: 'quadriceps', label: 'Quads', muscles: ['Quads', 'Hip Flexors'], chartMuscles: ['quadriceps'] },
  { key: 'adductor', label: 'Adductors', muscles: ['Adductors'], chartMuscles: ['adductor'] },
  { key: 'abductors', label: 'Abductors', muscles: ['Abductors'], chartMuscles: ['abductors'] },
  { key: 'calves', label: 'Calves', muscles: ['Calves', 'Shins'], chartMuscles: ['calves'] },
  { key: 'gluteal', label: 'Glutes', muscles: ['Glutes'], chartMuscles: ['gluteal'] },
  { key: 'hamstring', label: 'Hamstrings', muscles: ['Hamstrings'], chartMuscles: ['hamstring'] },
  { key: 'lower-back', label: 'Lower Back', muscles: ['Lower Back'], chartMuscles: ['lower-back'] },
  { key: 'trapezius', label: 'Traps', muscles: ['Traps'], chartMuscles: ['trapezius'] },
  { key: 'upper-back', label: 'Upper/Middle Back', muscles: ['Upper Back', 'Lats', 'Rhomboids'], chartMuscles: ['upper-back'] },
  { key: 'neck', label: 'Neck', muscles: ['Neck'], chartMuscles: ['neck'] },
]
const MUSCLE_GROUP_KEYS = new Set(MUSCLE_GROUPS.map(group => group.key))
const MUSCLE_CHART_COLORS = FRIEND_TIER_GROUPS.slice(1).map(group => TIER_COLORS[group])

function kgToLbs(v) {
  return v * 2.20462
}

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

  const resolvedRank = resolveTierFromScore(contributions[0].weightedScore)
  return {
    ...muscleGroup,
    ...resolvedRank,
    matchingLiftCount: matchingLifts.length,
    contributionCount: contributions.length,
    chartFrequency: FRIEND_TIER_GROUPS.indexOf(tierGroup(resolvedRank.tier)),
  }
}

function getDisplayName(profile) {
  return profile?.full_name || profile?.username || 'Friend'
}

async function loadRankBundle(userId, { currentUserId = null, fallbackProfile = null } = {}) {
  const resolvedAnchors = await getAnchors()
  const anchorNames = Object.keys(resolvedAnchors.male)
  const anchorNameSet = new Set(anchorNames)
  const isSelf = userId === currentUserId

  const queries = [
    isSelf
      ? supabase.from('profiles').select('id, full_name, username, unit_preference, gender, bodyweight, streak_start_date, streak_last_workout_at').eq('id', userId).single()
      : supabase.rpc('get_friend_rank_profile', { p_profile_id: userId }),
    supabase
      .from('exercise_prs')
      .select('exercise_id, best_1rm_kg')
      .eq('user_id', userId),
    fetchExercises(userId),
    // Always fetch latest body weight log as fallback in case profile.bodyweight is null
    supabase
      .from('body_weight_logs')
      .select('weight, unit')
      .eq('user_id', userId)
      .order('logged_at', { ascending: false })
      .limit(1),
    fetchExerciseRankStates(userId),
  ]

  const [profileRes, prsRes, exerciseRows, weightLogRes, rankStatesResult] = await Promise.all(queries)
  if (profileRes.error) throw profileRes.error
  if (prsRes.error) throw prsRes.error

  // Use profile.bodyweight if set, otherwise fall back to most recent weight log
  const rpcProfile = Array.isArray(profileRes.data) ? profileRes.data[0] : profileRes.data
  const profileData = { ...(fallbackProfile || {}), ...(rpcProfile || {}), id: userId }
  if (!profileData.bodyweight && weightLogRes.data?.length > 0) {
    const latest = weightLogRes.data[0]
    profileData.bodyweight = latest.weight
    profileData._bodyweightUnit = latest.unit || profileData.unit_preference || 'kg'
  }

  const exerciseById = new Map((exerciseRows ?? []).map(ex => [ex.id, ex]))
  const rankStateByExerciseId = mapExerciseRankStates(rankStatesResult.rows)
  const liftMap = {}
  prsRes.data?.forEach(pr => {
    const exercise = exerciseById.get(pr.exercise_id)
    const exerciseName = exercise?.name
    if (!exerciseName) return
    liftMap[exerciseName] = { ormKg: pr.best_1rm_kg, exerciseId: pr.exercise_id }
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

  const lifts = anchorNames
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
    .filter(lift => lift.ormKg !== null)

  return {
    profile: profileData,
    lifts,
    workoutStreak: computeStreak(profileData.streak_start_date, profileData.streak_last_workout_at),
  }
}

function buildLiftDetails(lifts, bodyweightKg, gender, rankDisplayMode) {
  const rankNow = Date.now()
  return lifts.map(lift => ({
    ...lift,
    anchors: anchorsOrNull()?.[gender]?.[lift.name] ?? null,
  })).map(lift => {
    const thresholds = lift.anchors ? expandAnchors(lift.anchors) : null
    const allTimeCardRank = lift.ormKg !== null && bodyweightKg && lift.anchors
      ? getLiftRank(lift, lift.ormKg, bodyweightKg, gender)
      : null

    let activeScore = null
    if (bodyweightKg && thresholds) {
      if (Number.isFinite(lift.activeCurrentScore)) {
        activeScore = applyInactivityDecay(
          Number(lift.activeCurrentScore),
          lift.activeLastRankedAt,
          rankNow
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
      thresholds,
      allTimeCardRank,
      activeScore,
      activeCardRank,
      cardRank: rankDisplayMode === ACTIVE_RANK_MODE ? activeCardRank : allTimeCardRank,
    }
  });
}

function buildMuscleChartData(muscleGroupRanks) {
  return muscleGroupRanks
    .filter(group => group.chartFrequency > 0)
    .map(group => ({
      name: group.label,
      muscles: group.chartMuscles,
      frequency: group.chartFrequency,
    }))
}

function sortLiftRows(a, b) {
  if (!a?.cardRank && !b?.cardRank) return a.name.localeCompare(b.name)
  if (!a?.cardRank) return 1
  if (!b?.cardRank) return -1
  if (b.cardRank.tierIdx !== a.cardRank.tierIdx) return b.cardRank.tierIdx - a.cardRank.tierIdx
  if (b.cardRank.ratio !== a.cardRank.ratio) return b.cardRank.ratio - a.cardRank.ratio
  return a.name.localeCompare(b.name)
}

function getComparisonLeader(selfLift, friendLift) {
  const selfScore = selfLift?.cardRank ? getContinuousTierScore(selfLift.cardRank) : -1
  const friendScore = friendLift?.cardRank ? getContinuousTierScore(friendLift.cardRank) : -1
  if (selfScore === friendScore) return 'Tie'
  return selfScore > friendScore ? 'You lead' : 'Friend leads'
}

function MuscleModelPair({ label, muscleChartData, setSelectedMuscleGroup }) {
  return (
    <div className="friend-compare-model-card">
      <div className="friend-compare-model-title">{label}</div>
      <div className="ranks-muscle-models">
        <div className="ranks-muscle-model">
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
          </div>
        </div>

        <div className="ranks-muscle-model">
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
          </div>
        </div>
      </div>
    </div>
  )
}

export default function FriendProfileDetail({ friendId, fallbackProfile = null, onBack }) {
  const currentUserId = useCurrentUserId()
  const [profile, setProfile] = useState(fallbackProfile)
  const [lifts, setLifts] = useState([])
  const [workoutStreak, setWorkoutStreak] = useState(0)
  const [selfProfile, setSelfProfile] = useState(null)
  const [selfLifts, setSelfLifts] = useState([])
  const [rankDisplayMode, setRankDisplayMode] = useState(readRankDisplayMode)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState(null)
  const [compareMode, setCompareMode] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem(RANK_DISPLAY_MODE_STORAGE_KEY, rankDisplayMode)
    } catch {
      // Keep the current in-memory preference if storage is unavailable.
    }
  }, [rankDisplayMode])

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!friendId) return
      setLoading(true)
      setError('')

      try {
        const ranksCache = currentUserId ? getCached('ranks') : null
        const cachedSelf = (ranksCache?.userId === currentUserId)
          ? {
              profile: { ...ranksCache.profile, id: currentUserId },
              lifts: (ranksCache.lifts || []).filter(l => l.ormKg !== null),
              workoutStreak: 0,
            }
          : null

        const friendCacheKey = `ranks:friend:v2:${friendId}`
        const cachedFriend = getCached(friendCacheKey)

        const [friendBundle, selfBundle] = await Promise.all([
          cachedFriend
            ? Promise.resolve(cachedFriend)
            : loadRankBundle(friendId, { currentUserId, fallbackProfile }),
          cachedSelf ? Promise.resolve(cachedSelf) : (currentUserId ? loadRankBundle(currentUserId, { currentUserId }) : Promise.resolve(null)),
        ])

        if (!cachedFriend) {
          setCached(friendCacheKey, friendBundle, 5 * 60 * 1000)
        }

        if (!cancelled) {
          setProfile(friendBundle.profile)
          setLifts(friendBundle.lifts)
          setWorkoutStreak(friendBundle.workoutStreak)
          setSelfProfile(selfBundle?.profile || null)
          setSelfLifts(selfBundle?.lifts || [])
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || 'Could not load this friend profile right now.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    const timer = setTimeout(load, 0)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [currentUserId, fallbackProfile, friendId])

  const useLbs = profile?.unit_preference === 'lbs'
  const fmt = (kg) => useLbs ? `${kgToLbs(kg).toFixed(1)} lbs` : `${kg.toFixed(1)} kg`
  const gender = profile?.gender?.toLowerCase() === 'female' ? 'female' : 'male'
  const bodyweightKg = profile?.bodyweight
    ? convertWeight(profile.bodyweight, profile?._bodyweightUnit || profile?.unit_preference || 'kg', 'kg')
    : null

  const selfUseLbs = selfProfile?.unit_preference === 'lbs'
  const selfFmt = (kg) => selfUseLbs ? `${kgToLbs(kg).toFixed(1)} lbs` : `${kg.toFixed(1)} kg`
  const selfGender = selfProfile?.gender?.toLowerCase() === 'female' ? 'female' : 'male'
  const selfBodyweightKg = selfProfile?.bodyweight
    ? convertWeight(selfProfile.bodyweight, selfProfile?.unit_preference || 'kg', 'kg')
    : null
  const canCompare = Boolean(selfProfile?.id && selfProfile.id !== friendId)
  const isActiveMode = rankDisplayMode === ACTIVE_RANK_MODE

  const liftsWithDetails = useMemo(
    () => buildLiftDetails(lifts, bodyweightKg, gender, rankDisplayMode),
    [bodyweightKg, gender, lifts, rankDisplayMode]
  )
  const selfLiftsWithDetails = useMemo(
    () => buildLiftDetails(selfLifts, selfBodyweightKg, selfGender, rankDisplayMode),
    [selfBodyweightKg, selfGender, selfLifts, rankDisplayMode]
  )

  const muscleGroupRanks = useMemo(
    () => MUSCLE_GROUPS.map(group => buildMuscleGroupRank(group, liftsWithDetails)),
    [liftsWithDetails]
  )
  const selfMuscleGroupRanks = useMemo(
    () => MUSCLE_GROUPS.map(group => buildMuscleGroupRank(group, selfLiftsWithDetails)),
    [selfLiftsWithDetails]
  )

  const selectedMuscleGroupData = muscleGroupRanks.find(group => group.key === selectedMuscleGroup) ?? null
  const selfSelectedMuscleGroupData = selfMuscleGroupRanks.find(group => group.key === selectedMuscleGroup) ?? null
  const muscleChartData = buildMuscleChartData(muscleGroupRanks)
  const selfMuscleChartData = buildMuscleChartData(selfMuscleGroupRanks)

  const filteredLifts = useMemo(() => {
    const query = search.trim().toLowerCase()
    return liftsWithDetails
      .filter(lift => {
        if (selectedMuscleGroupData && getMuscleContributionWeight(lift, selectedMuscleGroupData) === 0) return false
        if (!query) return true
        return lift.name.toLowerCase().includes(query) || lift.category.toLowerCase().includes(query)
      })
      .slice()
      .sort(sortLiftRows)
  }, [liftsWithDetails, search, selectedMuscleGroupData])

  const comparisonRows = useMemo(() => {
    if (!canCompare) return []

    const byName = new Map()
    const includeLift = (lift) => {
      if (!lift?.cardRank) return
      const existing = byName.get(lift.name) || {
        name: lift.name,
        category: lift.category,
        selfLift: null,
        friendLift: null,
      }
      byName.set(lift.name, existing)
    }

    selfLiftsWithDetails.forEach(includeLift)
    liftsWithDetails.forEach(includeLift)
    selfLiftsWithDetails.forEach(lift => {
      const row = byName.get(lift.name)
      if (row) row.selfLift = lift
    })
    liftsWithDetails.forEach(lift => {
      const row = byName.get(lift.name)
      if (row) row.friendLift = lift
    })

    const query = search.trim().toLowerCase()
    return [...byName.values()]
      .filter(row => {
        if (selectedMuscleGroup) {
          const selfMatches = selfSelectedMuscleGroupData && row.selfLift
            ? getMuscleContributionWeight(row.selfLift, selfSelectedMuscleGroupData) > 0
            : false
          const friendMatches = selectedMuscleGroupData && row.friendLift
            ? getMuscleContributionWeight(row.friendLift, selectedMuscleGroupData) > 0
            : false
          if (!selfMatches && !friendMatches) return false
        }
        if (!query) return true
        return row.name.toLowerCase().includes(query) || row.category.toLowerCase().includes(query)
      })
      .sort((a, b) => sortLiftRows(a.selfLift || a.friendLift, b.selfLift || b.friendLift))
  }, [
    canCompare,
    liftsWithDetails,
    search,
    selectedMuscleGroup,
    selectedMuscleGroupData,
    selfLiftsWithDetails,
    selfSelectedMuscleGroupData,
  ])

  if (loading) return <LoadingSpinner fullPage />

  if (error) {
    return (
      <div className="friend-profile-screen">
        <div className="friend-profile-header">
          <button className="back-btn" onClick={onBack}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          </button>
          <span className="picker-title">Friend Profile</span>
        </div>
        <div className="ranks-empty">{error}</div>
      </div>
    )
  }

  return (
    <div className="friend-profile-screen ranks-screen">
      <div className="friend-profile-header">
        <button className="back-btn" onClick={onBack}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>
        <div className="friend-profile-identity">
          <div className="friend-profile-title">{getDisplayName(profile)}</div>
          <div className="friend-profile-subtitle">
            {profile?.username ? `@${profile.username}` : 'No username'} · {filteredLifts.length} ranked exercise{filteredLifts.length === 1 ? '' : 's'} · {isActiveMode ? 'Current' : 'All-Time'} ranks
          </div>
        </div>
      </div>

      <div className="friend-profile-streak">
        <span className="friend-profile-streak-label">Streak</span>
        <span className="friend-profile-streak-value">{workoutStreak} day{workoutStreak === 1 ? '' : 's'}</span>
      </div>

      <div className="ranks-mode-toggle" role="tablist" aria-label="Friend rank display mode">
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

      {canCompare && (
        <div className="friend-profile-view-toggle">
          <button
            type="button"
            className={`friend-profile-view-btn${!compareMode ? ' active' : ''}`}
            onClick={() => setCompareMode(false)}
          >
            Friend
          </button>
          <button
            type="button"
            className={`friend-profile-view-btn${compareMode ? ' active' : ''}`}
            onClick={() => setCompareMode(true)}
          >
            Compare
          </button>
        </div>
      )}

      {!compareMode && !bodyweightKg && (
        <div className="ranks-notice">This friend has not set a bodyweight yet, so ranks cannot be calculated.</div>
      )}

      {compareMode && (!bodyweightKg || !selfBodyweightKg) && (
        <div className="ranks-notice">
          {!selfBodyweightKg && !bodyweightKg
            ? 'You and this friend both need bodyweight entries for a full rank comparison.'
            : !selfBodyweightKg
              ? 'Add your bodyweight to compare your ranks against this friend.'
              : 'This friend has not set a bodyweight yet, so the comparison is partial.'}
        </div>
      )}

      <div className="ranks-muscle-panel">
        <div className="ranks-muscle-panel-top">
          <div>
            <div className="ranks-muscle-title">{compareMode ? 'Body Graph Comparison' : 'Muscle Group Ranks'}</div>
          </div>
        </div>

        <label className="ranks-filter-field">
          <span className="ranks-filter-label">Muscle Filter</span>
          <div className="ranks-select-wrap">
            <select
              className="ranks-select"
              value={selectedMuscleGroup || ''}
              onChange={(e) => setSelectedMuscleGroup(e.target.value || null)}
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

        <div className="ranks-muscle-map-shell">
          {compareMode ? (
            <div className="friend-compare-model-grid">
              <MuscleModelPair
                label="You"
                muscleChartData={selfMuscleChartData}
                setSelectedMuscleGroup={setSelectedMuscleGroup}
              />
              <MuscleModelPair
                label={getDisplayName(profile)}
                muscleChartData={muscleChartData}
                setSelectedMuscleGroup={setSelectedMuscleGroup}
              />
            </div>
          ) : (
            <div className="ranks-muscle-models">
              <div className="ranks-muscle-model">
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
                </div>
              </div>

              <div className="ranks-muscle-model">
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
                </div>
              </div>
            </div>
          )}
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
                {compareMode && selfSelectedMuscleGroupData
                  ? `You: ${selfSelectedMuscleGroupData.tier} · ${getDisplayName(profile)}: ${selectedMuscleGroupData.tier}`
                  : selectedMuscleGroupData.tier}
              </div>
              <div className="ranks-muscle-active-sub">
                {compareMode && selfSelectedMuscleGroupData
                  ? `You: ${selfSelectedMuscleGroupData.matchingLiftCount} exercise${selfSelectedMuscleGroupData.matchingLiftCount === 1 ? '' : 's'} · ${getDisplayName(profile)}: ${selectedMuscleGroupData.matchingLiftCount} exercise${selectedMuscleGroupData.matchingLiftCount === 1 ? '' : 's'}`
                  : `${selectedMuscleGroupData.matchingLiftCount} exercise${selectedMuscleGroupData.matchingLiftCount === 1 ? '' : 's'} in this group${selectedMuscleGroupData.contributionCount > 0 ? ` · ${selectedMuscleGroupData.contributionCount} ranked` : ''}`}
              </div>
            </div>
          </div>
        )}
      </div>

      <input
        className="ranks-search"
        type="text"
        placeholder={
          compareMode
            ? (selectedMuscleGroupData ? `Search ${selectedMuscleGroupData.label.toLowerCase()} comparisons...` : 'Search rank comparisons...')
            : (selectedMuscleGroupData ? `Search ${selectedMuscleGroupData.label.toLowerCase()} exercises...` : 'Search ranked exercises...')
        }
        value={search}
        onChange={e => setSearch(e.target.value)}
        maxLength={VALIDATION_LIMITS.searchMaxLength}
      />

      {!compareMode && (
        filteredLifts.length === 0 ? (
          <div className="ranks-empty">
            {search.trim()
              ? `No ranked exercises match "${search.trim()}".`
              : 'No ranked exercises to show yet.'}
          </div>
        ) : (
          <div className="lift-cards">
            {filteredLifts.map(lift => {
              if (!lift.cardRank) {
                return (
                  <div key={lift.name} className="lift-card">
                    <div className="lift-card-top">
                      <div>
                        <div className="lift-name">{lift.name}</div>
                        <div className="lift-category">{lift.category}</div>
                      </div>
                    </div>
                    <div className="lift-tier-row">
                      <div className="tier-badge" style={{ background: '#4b556322', color: '#4b5563' }}>
                        <RankBadge tier="Unranked" size={18} />
                        Unranked
                      </div>
                    </div>
                    <div className="lift-no-bw">Bodyweight is needed to calculate this rank.</div>
                  </div>
                )
              }

              const { ratio, tier, color, progress, isMax, nextTier } = lift.cardRank
              return (
                <div key={lift.name} className="lift-card">
                  <div className="lift-card-top">
                    <div>
                      <div className="lift-name">{lift.name}</div>
                      <div className="lift-category">{lift.category}</div>
                    </div>
                    <div className="lift-right">
                      <div className="lift-orm">{fmt(lift.ormKg)}</div>
                      <div className="lift-ratio">{ratio.toFixed(2)}× BW</div>
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
                </div>
              )
            })}
          </div>
        )
      )}

      {compareMode && (
        comparisonRows.length === 0 ? (
          <div className="ranks-empty">
            {search.trim()
              ? `No comparable ranked exercises match "${search.trim()}".`
              : 'No comparable ranked exercises to show yet.'}
          </div>
        ) : (
          <div className="friend-compare-cards">
            {comparisonRows.map(row => {
              const selfRank = row.selfLift?.cardRank
              const friendRank = row.friendLift?.cardRank
              const leader = getComparisonLeader(row.selfLift, row.friendLift)

              return (
                <div key={row.name} className="friend-compare-card">
                  <div className="friend-compare-card-top">
                    <div>
                      <div className="lift-name">{row.name}</div>
                      <div className="lift-category">{row.category}</div>
                    </div>
                    <div className="friend-compare-leader">{leader}</div>
                  </div>

                  <div className="friend-compare-columns">
                    <div className="friend-compare-column">
                      <div className="friend-compare-column-label">You</div>
                      {selfRank ? (
                        <>
                          <div className="tier-badge" style={{ background: selfRank.color + '22', color: selfRank.color }}>
                            <RankBadge tier={tierGroup(selfRank.tier)} size={18} />
                            {selfRank.tier}
                          </div>
                          <div className="friend-compare-metric">{selfFmt(row.selfLift.ormKg)} · {selfRank.ratio.toFixed(2)}× BW</div>
                        </>
                      ) : (
                        <div className="friend-compare-empty">Unranked</div>
                      )}
                    </div>

                    <div className="friend-compare-divider" />

                    <div className="friend-compare-column">
                      <div className="friend-compare-column-label">{getDisplayName(profile)}</div>
                      {friendRank ? (
                        <>
                          <div className="tier-badge" style={{ background: friendRank.color + '22', color: friendRank.color }}>
                            <RankBadge tier={tierGroup(friendRank.tier)} size={18} />
                            {friendRank.tier}
                          </div>
                          <div className="friend-compare-metric">{fmt(row.friendLift.ormKg)} · {friendRank.ratio.toFixed(2)}× BW</div>
                        </>
                      ) : (
                        <div className="friend-compare-empty">Unranked</div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}
    </div>
  )
}
