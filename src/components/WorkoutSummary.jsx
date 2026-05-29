import { useEffect, useMemo, useRef, useState } from 'react'
import { useFocusTrap } from '../lib/useFocusTrap'
import { fmtCompact } from '../lib/liftMath'
import { TIERS, tierColor, tierGroup } from '../lib/strengthStandards'
import RankBadge from './RankBadge'
import '../styles/WorkoutSummary.css'

function fmtTime(s) {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${sec}s`
  return `${sec}s`
}

function fmtVolume(v) {
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`
  return String(v)
}

function getSummarySetType(set) {
  if (set?.is_warmup || set?.setType === 'warmup' || set?.set_type === 'warmup') return 'warmup'
  return set?.setType ?? set?.set_type ?? 'normal'
}


function fmtMetricValue(metric, value) {
  if (value === null || value === undefined) return '—'
  const suffix = metric.display?.includes('min') && !metric.display?.includes('/')
    ? ''
    : metric.display?.includes('MET')
      ? ''
      : 'x'
  return `${value.toFixed(2)}${suffix}`
}

function fmtMetricWeight(metric) {
  const weight = Number(metric.effectiveWeight ?? metric.weight)
  return Number.isFinite(weight) && weight > 0 ? `${Math.round(weight)} pts` : ''
}

function getHighlightLabel(type) {
  if (type === 'pr') return 'PR'
  if (type === 'rank_up') return 'Rank Up'
  if (type === 'achievement') return 'Achievement'
  return 'Effort'
}

function getBattleOutcome(battle) {
  if (!battle) return null
  if (battle.status === 'waiting') {
    return {
      pill: 'Live Battle',
      title: 'Waiting for final result',
      body: battle.verdict,
      tone: 'waiting',
    }
  }

  if (battle.winner === 'you') {
    return {
      pill: 'Victory',
      title: 'You won the battle',
      body: battle.verdict,
      tone: 'win',
    }
  }

  if (battle.winner === 'opponent') {
    return {
      pill: 'Defeat',
      title: `${battle.opponentName} won the battle`,
      body: battle.verdict,
      tone: 'loss',
    }
  }

  return {
    pill: battle.status === 'cancelled' ? 'Cancelled' : 'Tie',
    title: battle.status === 'cancelled' ? 'Battle cancelled' : 'Battle ended in a draw',
    body: battle.verdict,
    tone: battle.status === 'cancelled' ? 'waiting' : 'tie',
  }
}

const STEP_MS = 200

function RankUpCard({ r, i, show }) {
  const fromGroup = r.from === 'Unranked' ? 'Unranked' : tierGroup(r.from)

  const walkPath = useMemo(() => {
    const toIdx = TIERS.indexOf(r.to)
    if (toIdx < 0) return [r.to]
    if (r.from === 'Unranked') return TIERS.slice(0, toIdx + 1)
    const fromIdx = TIERS.indexOf(r.from)
    if (fromIdx < 0 || toIdx <= fromIdx) return [r.to]
    return TIERS.slice(fromIdx + 1, toIdx + 1)
  }, [r.from, r.to])

  const [stepIdx, setStepIdx] = useState(0)
  const [popKey, setPopKey] = useState(0)

  useEffect(() => {
    if (!show || walkPath.length <= 1) return
    const startMs = (0.15 + i * 0.1 + 2.17) * 1000
    let timeoutId = null
    let cancelled = false

    const scheduleNext = (nextIdx) => {
      if (cancelled || nextIdx >= walkPath.length) return
      timeoutId = setTimeout(() => {
        if (cancelled) return
        const prevGroup = tierGroup(walkPath[nextIdx - 1])
        const nextGroup = tierGroup(walkPath[nextIdx])
        setStepIdx(nextIdx)
        if (prevGroup !== nextGroup) setPopKey(k => k + 1)
        scheduleNext(nextIdx + 1)
      }, STEP_MS)
    }

    const starter = setTimeout(() => scheduleNext(1), startMs)
    return () => {
      cancelled = true
      clearTimeout(starter)
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [show, walkPath, i])

  const currentTier = walkPath[stepIdx]
  const currentGroup = tierGroup(currentTier)
  const currentColor = tierColor(currentTier)

  return (
    <div
      className={`ws-rankup-card ${show ? 'ws-rankup-in' : ''}`}
      style={{ '--delay': `${0.15 + i * 0.1}s`, '--tier-color': currentColor }}
    >
      <div className="ws-rankup-header">
        <div className="ws-rankup-arrow">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 19V5M5 12l7-7 7 7"/>
          </svg>
        </div>
        <span className="ws-rankup-exercise">{r.exercise}</span>
      </div>
      <div className="ws-rankup-journey">
        <div className="ws-rankup-from-side">
          <RankBadge tier={fromGroup} size={20} />
          <span className="ws-rankup-from-name">{r.from}</span>
        </div>
        <div className="ws-rankup-bar-wrap">
          <div className="ws-rankup-bar-fill" />
        </div>
        <div
          key={popKey}
          className="ws-rankup-to-side"
          data-initial={popKey === 0 ? 'true' : undefined}
        >
          <RankBadge tier={currentGroup} size={26} />
          <span className="ws-rankup-to-name">{currentTier}</span>
        </div>
      </div>
    </div>
  )
}

export default function WorkoutSummary({ summary, onDismiss }) {
  const [show, setShow] = useState(false)
  const [expandedExercises, setExpandedExercises] = useState(new Set())
  const wsScreenRef = useRef(null)

  const toggleExercise = name => setExpandedExercises(prev => {
    const next = new Set(prev)
    next.has(name) ? next.delete(name) : next.add(name)
    return next
  })

  useEffect(() => {
    // Slight delay so CSS transition fires
    const t = setTimeout(() => setShow(true), 30)
    return () => clearTimeout(t)
  }, [])

  const handleDismiss = () => {
    setShow(false)
    setTimeout(onDismiss, 280)
  }

  useFocusTrap(wsScreenRef, { active: show, onEscape: handleDismiss })

  const {
    durationSeconds,
    caloriesBurned = 0,
    totalSets,
    totalWorkingSets,
    totalDropSets = 0,
    totalVolume,
    totalLoadVolume = null,
    unit,
    exercises,
    rankUps = [],
    bodyweightMissing = false,
    newAchievements = [],
    battle = null,
    battleOnly = false,
    planCoaching = null,
  } = summary
  const displayedWorkingSets = totalWorkingSets ?? totalSets ?? 0
  const hasDropSets = Number(totalDropSets) > 0
  const hasStrengthExercises = exercises.some(ex => !ex.isCardio)
  const setStatValue = hasDropSets ? `${displayedWorkingSets} + ${totalDropSets}` : displayedWorkingSets
  const setStatLabel = hasDropSets ? 'Working + Drops' : (hasStrengthExercises ? 'Working Sets' : 'Entries')
  const roundedLoadVolume = totalLoadVolume === null || totalLoadVolume === undefined ? null : Math.round(totalLoadVolume)
  const roundedTrainingVolume = Math.round(totalVolume || 0)
  const showLoadMoved = roundedLoadVolume !== null && roundedLoadVolume !== roundedTrainingVolume
  const battleOutcome = getBattleOutcome(battle)
  const battleHighlights = [
    ...(battle?.yourHighlights || []).map(item => ({ ...item, owner: 'You' })),
    ...(battle?.opponentHighlights || []).map(item => ({ ...item, owner: battle?.opponentName || 'Opponent' })),
  ]

  return (
    <div className={`ws-overlay ${show ? 'ws-overlay-in' : ''}`}>
      <div className={`ws-screen ${show ? 'ws-screen-in' : ''}`} ref={wsScreenRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Workout Summary">

        {/* Header */}
        <div className="ws-header">
          <div className={`ws-check ${show ? 'ws-check-in' : ''}`}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <div className="ws-title">{battleOnly ? 'Battle Result Ready' : 'Workout Complete'}</div>
          {!battleOnly && <div className="ws-duration">{fmtTime(durationSeconds)}</div>}
        </div>

        {/* Stats row */}
        {!battleOnly && (
          <div className="ws-stats">
            <div className="ws-stat">
              <div className="ws-stat-value">{setStatValue}</div>
              <div className="ws-stat-label">{setStatLabel}</div>
            </div>
            <div className="ws-stat-divider" />
            <div className="ws-stat">
              <div className="ws-stat-value">{exercises.length}</div>
              <div className="ws-stat-label">Exercises</div>
            </div>
            <div className="ws-stat-divider" />
            <div className="ws-stat">
              <div className="ws-stat-value">{fmtVolume(totalVolume)}</div>
              <div className="ws-stat-label">Effective Vol ({unit})</div>
            </div>
            {showLoadMoved && (
              <>
                <div className="ws-stat-divider" />
                <div className="ws-stat">
                  <div className="ws-stat-value">{fmtVolume(roundedLoadVolume)}</div>
                  <div className="ws-stat-label">Load Moved ({unit})</div>
                </div>
              </>
            )}
            {caloriesBurned > 0 && (
              <>
                <div className="ws-stat-divider" />
                <div className="ws-stat">
                  <div className="ws-stat-value">~{fmtCompact(caloriesBurned)}</div>
                  <div className="ws-stat-label">kcal</div>
                </div>
              </>
            )}
          </div>
        )}

        <div className="ws-body">
          {battle && battleOutcome && (
            <div className="ws-section">
              <div className="ws-section-title">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8h12M6 16h12"/><rect x="2" y="10" width="4" height="4" rx="1"/><rect x="18" y="10" width="4" height="4" rx="1"/><rect x="6" y="6" width="3" height="12" rx="1"/><rect x="15" y="6" width="3" height="12" rx="1"/></svg>
                {`${battle.battleModeLabel || 'Hybrid'} Head To Head`}
              </div>
              <div className={`ws-battle-card ws-battle-card-${battleOutcome.tone}`}>
                <div className="ws-battle-head">
                  <div className="ws-battle-pill">{battleOutcome.pill}</div>
                  <div>
                    <div className="ws-battle-title">{battleOutcome.title}</div>
                    <div className="ws-battle-subtitle">{battleOutcome.body}</div>
                  </div>
                </div>
                <div className="ws-battle-score">
                  <div className="ws-battle-score-item">
                    <strong>{battle.points?.you ?? 0}</strong>
                    <span>You</span>
                  </div>
                  <div className="ws-battle-score-sep">:</div>
                  <div className="ws-battle-score-item">
                    <strong>{battle.points?.opponent ?? 0}</strong>
                    <span>{battle.opponentName}</span>
                  </div>
                </div>
                {battle.scoreTotal && (
                  <div className="ws-battle-score-total">
                    Weighted score out of {battle.scoreTotal}
                  </div>
                )}
                <div className="ws-battle-metrics">
                  {battle.metrics?.map(metric => (
                    <div key={metric.id} className="ws-battle-metric-row">
                      <div className={`ws-battle-metric-value ${metric.winner === 'you' ? 'is-winner' : ''}`}>
                        {metric.available ? fmtMetricValue(metric, metric.yourValue) : '—'}
                      </div>
                      <div className="ws-battle-metric-center">
                        <div className="ws-battle-metric-label">{metric.label}</div>
                        <div className="ws-battle-metric-unit">
                          {metric.available
                            ? [metric.display, fmtMetricWeight(metric)].filter(Boolean).join(' · ')
                            : metric.unavailableText || 'Needs both lifters to log this metric'}
                        </div>
                      </div>
                      <div className={`ws-battle-metric-value ${metric.winner === 'opponent' ? 'is-winner' : ''}`}>
                        {metric.available ? fmtMetricValue(metric, metric.opponentValue) : '—'}
                      </div>
                    </div>
                  ))}
                </div>
                {battleHighlights.length > 0 && (
                  <div className="ws-battle-highlights">
                    <div className="ws-battle-highlights-head">
                      <span>Not scored</span>
                      <small>PR and effort context</small>
                    </div>
                    {battleHighlights.map((highlight, index) => (
                      <div key={`${highlight.owner}-${highlight.type}-${highlight.title}-${index}`} className="ws-battle-highlight">
                        <div>
                          <strong>{highlight.title}</strong>
                          {highlight.body && <span>{highlight.body}</span>}
                        </div>
                        <em>{highlight.owner} · {getHighlightLabel(highlight.type)}</em>
                      </div>
                    ))}
                  </div>
                )}
                {battle.bodyweightFallbackUsed && (
                  <div className="ws-battle-note">
                    Bodyweight was missing for at least one lifter, so this recap filled the gap from the available bodyweights in the room or a 170 lb default.
                  </div>
                )}
              </div>
            </div>
          )}

          {!battleOnly && planCoaching && (
            <div className="ws-section">
              <div className="ws-section-title">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.74V17h8v-2.26A7 7 0 0 0 12 2z"/></svg>
                Plan Coach
              </div>
              <div className="ws-coach-card">
                <div className="ws-coach-pill">Pending Review</div>
                <div className="ws-coach-title">{planCoaching.summary}</div>
                <div className="ws-coach-body">{planCoaching.body}</div>
                {planCoaching.metrics && (
                  <div className="ws-coach-metrics">
                    <span>{planCoaching.metrics.completedSets}/{planCoaching.metrics.plannedSets} sets</span>
                    <span>{planCoaching.metrics.actualMinutes}m actual</span>
                    <span>{Math.round((planCoaching.metrics.completionRate || 0) * 100)}% complete</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* New achievements */}
          {!battleOnly && newAchievements.length > 0 && (
            <div className="ws-section">
              <div className="ws-section-title">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>
                Achievements Unlocked
              </div>
              <div className="ws-achievements">
                {newAchievements.map((a, i) => (
                  <div
                    key={a.id}
                    className={`ws-achievement-card ${show ? 'ws-achievement-in' : ''}`}
                    style={{ '--delay': `${0.1 + i * 0.08}s` }}
                  >
                    <div className="ws-achievement-badge">
                      {a.emoji
                        ? <span style={{ fontSize: '20px' }}>{a.emoji}</span>
                        : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>
                      }
                    </div>
                    <div className="ws-achievement-info">
                      <div className="ws-achievement-title">{a.title}</div>
                      <div className="ws-achievement-desc">{a.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bodyweight-missing banner (shown in place of Rank Ups) */}
          {!battleOnly && bodyweightMissing && hasStrengthExercises && (
            <div className="ws-section">
              <div className="ws-rank-bw-warning">
                Bodyweight must be entered to see ranks.
              </div>
            </div>
          )}

          {/* Rank-ups */}
          {!battleOnly && rankUps.length > 0 && (
            <div className="ws-section">
              <div className="ws-section-title">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                Rank Ups
              </div>
              <div className="ws-rankups">
                {rankUps.map((r, i) => (
                  <RankUpCard key={r.exercise} r={r} i={i} show={show} />
                ))}
              </div>
            </div>
          )}

          {/* Exercise list */}
          {!battleOnly && (
            <div className="ws-section">
              <div className="ws-section-title">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8h12M6 16h12"/><rect x="2" y="10" width="4" height="4" rx="1"/><rect x="18" y="10" width="4" height="4" rx="1"/><rect x="6" y="6" width="3" height="12" rx="1"/><rect x="15" y="6" width="3" height="12" rx="1"/></svg>
                Exercises
              </div>
              <div className="ws-exercises">
                {exercises.map(ex => {
                  const isOpen = expandedExercises.has(ex.name)
                  return (
                    <div key={ex.name} className="ws-exercise-item">
                      <button
                        className={`ws-exercise-header${isOpen ? ' open' : ''}`}
                        onClick={() => toggleExercise(ex.name)}
                        aria-expanded={isOpen}
                      >
                        <span className="ws-exercise-name">{ex.name}</span>
                        <svg className="ws-exercise-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="6 9 12 15 18 9"/>
                        </svg>
                      </button>
                      {isOpen && (
                        <div className="ws-exercise-sets">
                          {ex.isCardio
                            ? ex.sets.map((s, i) => {
                                const sec = s.durationSeconds || 0
                                const label = sec < 60 ? `${sec}s` : `${Math.round(sec / 60)} min`
                                return (
                                  <div key={i} className="ws-exercise-set-row">
                                    <span className="ws-set-index">{i + 1}</span>
                                    <span className="ws-set-detail">{label}</span>
                                  </div>
                                )
                              })
                            : (() => {
                                let normalCount = 0
                                return ex.sets.map((s, i) => {
                                  const type = getSummarySetType(s)
                                  if (type === 'normal') normalCount++
                                  const indexLabel = type === 'warmup' ? 'W' : type === 'dropset' ? 'Drop' : String(normalCount)
                                  return (
                                    <div key={i} className={`ws-exercise-set-row ws-set-${type}`}>
                                      <span className="ws-set-index">{indexLabel}</span>
                                      <span className="ws-set-detail">{s.weight} {s.unit} × {s.reps}</span>
                                    </div>
                                  )
                                })
                              })()
                          }
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <button className="ws-done-btn" onClick={handleDismiss}>{battleOnly ? 'Close' : 'Done'}</button>
      </div>
    </div>
  )
}
