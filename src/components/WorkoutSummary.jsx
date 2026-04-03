import { useEffect, useState } from 'react'
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

function fmtMetricValue(metric, value) {
  if (value === null || value === undefined) return '—'
  return `${value.toFixed(2)}x`
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

export default function WorkoutSummary({ summary, onDismiss }) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    // Slight delay so CSS transition fires
    const t = setTimeout(() => setShow(true), 30)
    return () => clearTimeout(t)
  }, [])

  const handleDismiss = () => {
    setShow(false)
    setTimeout(onDismiss, 280)
  }

  const {
    durationSeconds,
    totalSets,
    totalVolume,
    unit,
    exercises,
    rankUps,
    newAchievements = [],
    battle = null,
    battleOnly = false,
  } = summary
  const battleOutcome = getBattleOutcome(battle)

  return (
    <div className={`ws-overlay ${show ? 'ws-overlay-in' : ''}`}>
      <div className={`ws-screen ${show ? 'ws-screen-in' : ''}`}>

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
              <div className="ws-stat-value">{totalSets}</div>
              <div className="ws-stat-label">Sets</div>
            </div>
            <div className="ws-stat-divider" />
            <div className="ws-stat">
              <div className="ws-stat-value">{exercises.length}</div>
              <div className="ws-stat-label">Exercises</div>
            </div>
            <div className="ws-stat-divider" />
            <div className="ws-stat">
              <div className="ws-stat-value">{fmtVolume(totalVolume)}</div>
              <div className="ws-stat-label">Volume ({unit})</div>
            </div>
          </div>
        )}

        <div className="ws-body">
          {battle && battleOutcome && (
            <div className="ws-section">
              <div className="ws-section-title">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8h12M6 16h12"/><rect x="2" y="10" width="4" height="4" rx="1"/><rect x="18" y="10" width="4" height="4" rx="1"/><rect x="6" y="6" width="3" height="12" rx="1"/><rect x="15" y="6" width="3" height="12" rx="1"/></svg>
                Head To Head
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
                            ? metric.display
                            : 'Needs at least one shared exercise'}
                        </div>
                      </div>
                      <div className={`ws-battle-metric-value ${metric.winner === 'opponent' ? 'is-winner' : ''}`}>
                        {metric.available ? fmtMetricValue(metric, metric.opponentValue) : '—'}
                      </div>
                    </div>
                  ))}
                </div>
                {battle.bodyweightFallbackUsed && (
                  <div className="ws-battle-note">
                    Bodyweight was missing for at least one lifter, so this recap filled the gap from the available bodyweights in the room or a 170 lb default.
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

          {/* Rank-ups */}
          {!battleOnly && rankUps.length > 0 && (
            <div className="ws-section">
              <div className="ws-section-title">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                Rank Ups
              </div>
              <div className="ws-rankups">
                {rankUps.map((r, i) => (
                  <div
                    key={r.exercise}
                    className={`ws-rankup-card ${show ? 'ws-rankup-in' : ''}`}
                    style={{ '--delay': `${0.15 + i * 0.1}s`, '--tier-color': r.color }}
                  >
                    <div className="ws-rankup-arrow">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
                    </div>
                    <div className="ws-rankup-info">
                      <div className="ws-rankup-exercise">{r.exercise}</div>
                      <div className="ws-rankup-from">{r.from}</div>
                    </div>
                    <div className="ws-rankup-new">{r.to}</div>
                  </div>
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
                  const top = ex.sets.reduce((best, s) => s.weight > best ? s.weight : best, 0)
                  return (
                    <div key={ex.name} className="ws-exercise-row">
                      <div className="ws-exercise-name">{ex.name}</div>
                      <div className="ws-exercise-meta">
                        <span>{ex.sets.length} set{ex.sets.length !== 1 ? 's' : ''}</span>
                        {top > 0 && <span className="ws-exercise-top">{top} {ex.sets[0]?.unit}</span>}
                      </div>
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
