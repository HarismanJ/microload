import { useState, useEffect, useCallback, useEffectEvent } from 'react'
import Model from 'react-body-highlighter'
import { supabase } from '../../lib/supabase'
import RankBadge from '../RankBadge'
import LoadingSpinner from '../LoadingSpinner'
import ExerciseChart from './ExerciseChart'
import {
  TIERS, TIER_COLORS, ANCHORS,
  tierGroup, tierColor,
  expandAnchors, getTierIdx, getProgress, weightForOrm,
} from '../../lib/strengthStandards'
import './ExerciseDetail.css'

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

export default function ExerciseDetail({ exerciseId, onBack }) {
  const [exercise, setExercise]   = useState(null)
  const [profile, setProfile]     = useState(null)
  const [chartData, setChartData] = useState([])
  const [stats, setStats]         = useState(null)
  const [loading, setLoading]     = useState(true)
  const [chartPeriod, setChartPeriod] = useState('all')
  const [muscleLabel, setMuscleLabel] = useState(null)

  const handleMuscleClick = useCallback(({ muscle, data }) => {
    const preferred = data?.exercises?.find(Boolean)
    const label = preferred || MUSCLE_LABEL[muscle] || muscle
    setMuscleLabel(label)
  }, [])

  async function load() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()

    const [{ data: ex }, { data: prof }, { data: sets }] = await Promise.all([
      supabase.from('exercises').select('*').eq('id', exerciseId).single(),
      supabase.from('profiles').select('bodyweight, gender, unit_preference').eq('id', user.id).single(),
      supabase
        .from('workout_sets')
        .select('estimated_1rm, weight, reps, unit, created_at')
        .eq('user_id', user.id)
        .eq('exercise_id', exerciseId)
        .not('estimated_1rm', 'is', null)
        .order('created_at', { ascending: true }),
    ])

    setExercise(ex)
    setProfile(prof)

    if (sets && sets.length > 0) {
      let bestOrmKg = 0, bestSet = null, totalVolumeKg = 0
      const allPoints = []

      sets.forEach(s => {
        const ormKg = s.unit === 'lbs' ? lbsToKg(s.estimated_1rm) : s.estimated_1rm
        const wKg   = s.unit === 'lbs' ? lbsToKg(s.weight) : s.weight
        totalVolumeKg += wKg * s.reps

        if (ormKg > bestOrmKg) {
          bestOrmKg = ormKg
          bestSet   = { weight: s.weight, reps: s.reps, unit: s.unit }
        }
        allPoints.push({ date: s.created_at.split('T')[0], orm: ormKg })
      })

      setChartData(allPoints)
      setStats({ bestOrmKg, bestSet, totalVolumeKg, totalSets: sets.length })
    }

    setLoading(false)
  }

  const loadLatest = useEffectEvent(() => { load() })

  useEffect(() => {
    const timer = setTimeout(() => { loadLatest() }, 0)
    return () => clearTimeout(timer)
  }, [exerciseId])

  const useLbs = profile?.unit_preference === 'lbs'
  const fmt    = (kg) => useLbs ? `${kgToLbs(kg).toFixed(1)} lbs` : `${kg.toFixed(1)} kg`
  const displayUnit = useLbs ? 'lbs' : 'kg'

  const gender      = profile?.gender?.toLowerCase() === 'female' ? 'female' : 'male'
  const bodyweightKg = profile?.bodyweight
    ? (useLbs ? lbsToKg(profile.bodyweight) : profile.bodyweight)
    : null

  // Chart data filtered by period then converted to display unit
  const now = new Date()
  const periodDays = { '1w': 7, '1m': 30, '1y': 365 }
  const filteredChart = chartPeriod === 'all'
    ? chartData
    : chartData.filter(d => {
        const diff = (now - new Date(d.date)) / (1000 * 60 * 60 * 24)
        return diff <= periodDays[chartPeriod]
      })
  const chartDisplay = useLbs
    ? filteredChart.map(d => ({ ...d, orm: kgToLbs(d.orm) }))
    : filteredChart

  // Rank
  const isBW = exercise?.equipment === 'Bodyweight'
  const exerciseAnchors = exercise ? ANCHORS[gender]?.[exercise.name] : null
  let rankSection = null
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
    rankSection = { tier, color, progress, isMax, nextTier, targetKg, ratio }
  }

  // Iron target shown when unranked but standards + bodyweight are available
  const ironTargetKg = !stats && exerciseAnchors && bodyweightKg
    ? (isBW
        ? expandAnchors(exerciseAnchors)[1] * bodyweightKg - bodyweightKg
        : expandAnchors(exerciseAnchors)[1] * bodyweightKg)
    : null

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
        <div className="ex-loading">
          <LoadingSpinner size="md" />
        </div>
      ) : (
        <>
          {/* Stats */}
          {stats ? (
            <div className="ex-stats-grid">
              <div className="ex-stat">
                <div className="ex-stat-value">{fmt(stats.bestOrmKg)}</div>
                <div className="ex-stat-label">Best 1RM</div>
              </div>
              <div className="ex-stat">
                <div className="ex-stat-value">{displayVolume}</div>
                <div className="ex-stat-label">Volume</div>
              </div>
              <div className="ex-stat">
                <div className="ex-stat-value">{stats.totalSets}</div>
                <div className="ex-stat-label">Sets Done</div>
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
            <div className="ex-section-title">Strength Rank</div>
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
                {rankSection.targetKg && (
                  <div className="ex-rank-targets">
                    <div className="ex-targets-label">
                      {isBW ? 'Added weight' : 'Target 1RM'} to reach <span style={{ color: TIER_COLORS[tierGroup(rankSection.nextTier)] }}>{rankSection.nextTier}</span>: {fmt(rankSection.targetKg)}
                    </div>
                    <div className="ex-target-chips">
                      {[1, 3, 5, 8].map(reps => (
                        <div key={reps} className="ex-target-chip">
                          <span className="chip-reps">{reps === 1 ? '1 rep' : `${reps} reps`}</span>
                          <span className="chip-weight">{fmt(weightForOrm(rankSection.targetKg, reps))}</span>
                        </div>
                      ))}
                    </div>
                  </div>
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
                {ironTargetKg && (
                  <div className="ex-rank-targets">
                    <div className="ex-targets-label">
                      {isBW ? 'Added weight' : 'Target 1RM'} to reach <span style={{ color: TIER_COLORS.Iron }}>Iron</span>: {fmt(ironTargetKg)}
                    </div>
                    <div className="ex-target-chips">
                      {[1, 3, 5, 8].map(reps => (
                        <div key={reps} className="ex-target-chip">
                          <span className="chip-reps">{reps === 1 ? '1 rep' : `${reps} reps`}</span>
                          <span className="chip-weight">{fmt(weightForOrm(ironTargetKg, reps))}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Progress Chart */}
          <div className="ex-section">
            <div className="ex-section-header">
              <div className="ex-section-title">1RM Progress</div>
              {chartData.length > 0 && (
                <div className="ex-period-toggle">
                  {['1w', '1m', '1y', 'all'].map(p => (
                    <button
                      key={p}
                      className={`ex-period-btn ${chartPeriod === p ? 'active' : ''}`}
                      onClick={() => setChartPeriod(p)}
                    >
                      {p === 'all' ? 'All' : p === '1w' ? '1W' : p === '1m' ? '1M' : '1Y'}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {chartData.length === 0
              ? <div className="chart-empty">No data yet — log this exercise to track your progress</div>
              : chartDisplay.length > 0
                ? <div className="ex-chart-wrap"><ExerciseChart data={chartDisplay} unit={displayUnit} /></div>
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

          {/* Tier Targets Table */}
          {exerciseAnchors && bodyweightKg && (
            <div className="ex-section">
              <div className="ex-section-title">All Tier Targets</div>
              <div className="ex-tier-table">
                <div className="ex-tier-table-header">
                  <span className="ex-tier-col-tier">Tier</span>
                  <span className="ex-tier-col-rep">1 rep</span>
                  <span className="ex-tier-col-rep">3 reps</span>
                  <span className="ex-tier-col-rep">5 reps</span>
                  <span className="ex-tier-col-rep">8 reps</span>
                </div>
                {TIERS.map((tier, i) => {
                  const thresholds = expandAnchors(exerciseAnchors)
                  const targetKg = isBW
                    ? thresholds[i] * bodyweightKg - bodyweightKg
                    : thresholds[i] * bodyweightKg
                  const isCurrent = rankSection?.tier === tier
                  const color = tierColor(tier)
                  return (
                    <div key={tier} className={`ex-tier-row${isCurrent ? ' ex-tier-row-current' : ''}`} style={isCurrent ? { borderColor: color + '66' } : {}}>
                      <span className="ex-tier-col-tier" style={{ color: isCurrent ? color : undefined }}>
                        <RankBadge tier={tierGroup(tier)} size={13} />
                        {tier}
                      </span>
                      {!isBW && targetKg <= 0
                        ? <span className="ex-tier-col-rep" style={{ gridColumn: 'span 4', textAlign: 'center', color: 'var(--muted)', fontSize: 10 }}>0 {displayUnit}</span>
                        : [1, 3, 5, 8].map(reps => (
                            <span key={reps} className="ex-tier-col-rep">{fmt(weightForOrm(targetKg, reps))}</span>
                          ))
                      }
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
