import { useState, useEffect, useRef } from 'react'
import { fromKg, toKg, getWeightInputMax } from '../lib/liftMath'
import { getWeightIncrement } from '../lib/progressiveOverload'

const ACTION_CONFIG = {
  first_time:      { label: 'Start',      colorClass: 'ps-green'  },
  increase_weight: { label: 'Microload',  colorClass: 'ps-green'  },
  increase_reps:   { label: 'More Reps', colorClass: 'ps-green'  },
  maintain:        { label: 'Maintain',  colorClass: 'ps-yellow' },
  deload:          { label: 'Deload',    colorClass: 'ps-amber'  },
}

const INCREMENT_MIN = { kg: 0.25, lbs: 0.5 }
const INCREMENT_MAX = { kg: 20,   lbs: 45  }
const BODYWEIGHT_MODE_STORAGE_PREFIX = 'liftlog:bodyweightProgressionMode:'

function readStoredBodyweightSide(exerciseId) {
  try {
    const saved = localStorage.getItem(`${BODYWEIGHT_MODE_STORAGE_PREFIX}${exerciseId}`)
    return saved === 'reps' || saved === 'load' ? saved : null
  } catch {
    return null
  }
}

export default function ProgressionSuggestion({
  suggestion,
  unitPreference,
  onApply,
  equipment,
  exerciseId,
  customIncrementKg,
  onIncrementChange,
  customStartingWeightKg,
  onStartingWeightChange,
  bilateral = false,
}) {
  const [popupMode, setPopupMode]           = useState(null) // null | 'reasoning' | 'confidence'
  const [settingsOpen, setSettingsOpen]     = useState(false)
  const [inputValue, setInputValue]         = useState('')
  const [inputError, setInputError]         = useState('')
  const [startInputValue, setStartInputValue] = useState('')
  const [startInputError, setStartInputError] = useState('')
  const [bodyweightSideOverrides, setBodyweightSideOverrides] = useState({})
  const containerRef = useRef(null)

  const unit = unitPreference || 'kg'
  const bodyweightAlternates = suggestion?.bodyweightAlternates
  const hasBodyweightAlternates = Boolean(bodyweightAlternates?.reps && bodyweightAlternates?.load)
  const defaultBodyweightSide = suggestion?.isBodyweightOnly ? 'reps' : 'load'
  const bodyweightSide = hasBodyweightAlternates
    ? (bodyweightSideOverrides[exerciseId] ?? readStoredBodyweightSide(exerciseId) ?? defaultBodyweightSide)
    : defaultBodyweightSide

  function populateSettingsInputs() {
    const effectiveKg = customIncrementKg ?? getWeightIncrement(equipment, unit, bilateral)
    setInputValue(String(Math.round(fromKg(effectiveKg, unit) * 100) / 100))
    setInputError('')
    const effectiveStartKg = customStartingWeightKg ?? 0
    setStartInputValue(String(Math.round(fromKg(effectiveStartKg, unit) * 100) / 100))
    setStartInputError('')
  }

  // Close panels on outside click
  useEffect(() => {
    if (!popupMode && !settingsOpen) return
    const onDown = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setPopupMode(null)
        setSettingsOpen(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [popupMode, settingsOpen])

  if (!suggestion) return null
  const visibleSuggestion = hasBodyweightAlternates
    ? (bodyweightAlternates[bodyweightSide] || suggestion)
    : suggestion
  const { action, activeSetIndex, setNumber: suggestionSetNumber, suggestedWeightKg, suggestedReps, reasoning, isBodyweightOnly } = visibleSuggestion
  const config = ACTION_CONFIG[action]
  if (!config) return null

  const setNumber = suggestionSetNumber ?? (Number.isInteger(activeSetIndex) ? activeSetIndex + 1 : null)
  const { level: confidenceLevel, score: confidenceScore, topReasons, axes: confidenceAxes } = visibleSuggestion?.confidenceSignal ?? {}
  // 4 bars driven by the raw 0–1 score. Math.round maps the real score floor
  // (~0.30, enforced by the no-history hard veto) to 1 bar, so bar 1 is reachable.
  const filledBars = Math.max(1, Math.round((confidenceScore ?? 0) * 4))
  const BARS_LABEL = ['', 'Low', 'Moderate', 'High', 'Very high']
  const confidenceLabel = BARS_LABEL[filledBars] ?? confidenceLevel

  // Positive labels for each axis — shown when that axis scores well
  const AXIS_BOOST_LABELS = {
    historyQuantity:            'Solid training history on this exercise',
    historyRecency:             'Training has been recent and consistent',
    historyRepresentativeness:  'Performance is stable and representative',
    statisticalReliability:     'Very consistent output across sessions',
    suggestionIntegrity:        'Suggestion required minimal adjustment',
    currentStateKnowledge:      'Current training state is well-known',
    formulaModelFit:            'Exercise models well with available data',
    planRegimeFit:              'Training aligns closely with the plan',
    exerciseVariability:        'Exercise has predictable session-to-session output',
  }
  // Approximate contribution weight of each axis to the final score
  const AXIS_WEIGHTS = {
    historyQuantity: 0.20, historyRecency: 0.10, historyRepresentativeness: 0.10,
    statisticalReliability: 0.10, suggestionIntegrity: 0.10, currentStateKnowledge: 0.10,
    formulaModelFit: 0.20, planRegimeFit: 0.06, exerciseVariability: 0.04,
  }
  const topBoosts = confidenceAxes
    ? Object.entries(confidenceAxes)
        .filter(([, ax]) => ax.score >= 0.80)
        .sort(([ka, a], [kb, b]) => (b.score * (AXIS_WEIGHTS[kb] ?? 0)) - (a.score * (AXIS_WEIGHTS[ka] ?? 0)))
        .slice(0, 2)
        .map(([key]) => AXIS_BOOST_LABELS[key])
        .filter(Boolean)
    : []

  const applyWeight = suggestedWeightKg !== null
    ? Math.round(fromKg(suggestedWeightKg, unit) * 10) / 10
    : null
  const displayWeight = applyWeight !== null && !(isBodyweightOnly && suggestedWeightKg === 0)
    ? applyWeight
    : null

  const targetLabel = displayWeight !== null && suggestedReps !== null
    ? `${displayWeight} × ${suggestedReps}`
    : displayWeight !== null
      ? `${displayWeight} ${unit}`
      : suggestedReps !== null
        ? `${suggestedReps} reps`
        : null

  const popupTitle = popupMode === 'confidence'
    ? `Why ${confidenceLabel?.toLowerCase()} confidence?`
    : setNumber ? `Set ${setNumber} · ${config.label}` : config.label

  function handleBodyweightFlip(event) {
    event.stopPropagation()
    const nextSide = bodyweightSide === 'reps' ? 'load' : 'reps'
    setBodyweightSideOverrides(prev => ({ ...prev, [exerciseId]: nextSide }))
    setPopupMode(null)
    setSettingsOpen(false)
    try {
      localStorage.setItem(`${BODYWEIGHT_MODE_STORAGE_PREFIX}${exerciseId}`, nextSide)
    } catch {
      // Ignore storage failures; the visible toggle still works for this render.
    }
  }

  function handleIncrementSave() {
    const parsed = parseFloat(inputValue)
    const min = INCREMENT_MIN[unit] ?? 0.25
    const max = INCREMENT_MAX[unit] ?? 20
    if (!isFinite(parsed) || parsed <= 0) {
      setInputError(`Enter a positive number`)
      return
    }
    if (parsed < min) {
      setInputError(`Min ${min}${unit}`)
      return
    }
    if (parsed > max) {
      setInputError(`Max ${max}${unit}`)
      return
    }

    const parsedStart = parseFloat(startInputValue)
    const startMax = getWeightInputMax(equipment, unit)
    if (!isFinite(parsedStart) || parsedStart < 0) {
      setStartInputError(`Enter 0 or a positive number`)
      return
    }
    if (parsedStart > startMax) {
      setStartInputError(`Max ${startMax}${unit}`)
      return
    }

    onIncrementChange(exerciseId, toKg(parsed, unit))
    const startKg = toKg(parsedStart, unit)
    onStartingWeightChange(exerciseId, startKg > 0 ? startKg : null)
    setSettingsOpen(false)
  }

  function handleIncrementReset() {
    onIncrementChange(exerciseId, null)
    onStartingWeightChange(exerciseId, null)
    setSettingsOpen(false)
  }

  function handleSettingsToggle() {
    const nextOpen = !settingsOpen
    if (nextOpen) populateSettingsInputs()
    setSettingsOpen(nextOpen)
    setPopupMode(null)
  }

  return (
    <div className={`progression-suggestion ${config.colorClass}${hasBodyweightAlternates ? ' ps-has-flip' : ''}`} ref={containerRef}>
      {popupMode && (
        <div className="ps-popup">
          <div className="ps-popup-title">{popupTitle}</div>
          <div className="ps-popup-body">
            {popupMode === 'confidence'
              ? (
                <div className="ps-confidence-reasons">
                  {topBoosts.map((r, i) => (
                    <p key={`b${i}`} className="ps-reason ps-reason--boost">
                      <span className="ps-reason-icon" aria-hidden="true">↑</span>{r}
                    </p>
                  ))}
                  {(topReasons ?? []).map((r, i) => (
                    <p key={`p${i}`} className="ps-reason ps-reason--penalty">
                      <span className="ps-reason-icon" aria-hidden="true">↓</span>{r}
                    </p>
                  ))}
                </div>
              )
              : (reasoning || config.label)
            }
          </div>
        </div>
      )}

      <div className="ps-bar">
        <div className="ps-left ps-flip-content" key={hasBodyweightAlternates ? bodyweightSide : 'single'}>
          <span className={`ps-badge ${config.colorClass}`}>{setNumber ? `Set ${setNumber} · ${config.label}` : config.label}</span>
          {targetLabel && <span className="ps-target">{targetLabel}</span>}
        </div>

        <div className="ps-right">
          <button
            className={`ps-settings-btn${(customIncrementKg != null || customStartingWeightKg != null) ? ' active' : ''}`}
            type="button"
            aria-label="Increment settings"
            onClick={handleSettingsToggle}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>
          <button
            className="ps-info-btn"
            type="button"
            aria-label="Why this suggestion"
            onClick={() => { setPopupMode(m => m === 'reasoning' ? null : 'reasoning'); setSettingsOpen(false) }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          </button>
          {targetLabel && onApply && (
            <button
              className="ps-apply-btn"
              type="button"
              onClick={() => onApply(applyWeight, suggestedReps, visibleSuggestion)}
            >
              Apply
            </button>
          )}
        </div>
      </div>

      {confidenceLevel && (
        <div className="ps-confidence-row">
          <span className="ps-confidence-label">Confidence</span>
          <div className="ps-confidence-bars">
            {[1, 2, 3, 4].map(n => (
              <div
                key={n}
                className={`ps-confidence-bar${n <= filledBars ? ' ps-confidence-bar--filled' : ''}`}
                data-level={n <= filledBars ? confidenceLevel : undefined}
              />
            ))}
          </div>
          {topReasons?.length > 0 && (
            <button
              className="ps-confidence-info-btn"
              type="button"
              onClick={() => { setPopupMode(m => m === 'confidence' ? null : 'confidence'); setSettingsOpen(false) }}
              aria-label="Why this confidence level?"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            </button>
          )}
        </div>
      )}

      {hasBodyweightAlternates && (
        <button
          type="button"
          className="ps-flip-btn"
          aria-label={bodyweightSide === 'reps' ? 'Show added-load progression' : 'Show reps progression'}
          onClick={handleBodyweightFlip}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M7 7h11l-3-3" />
            <path d="M18 7l-3 3" />
            <path d="M17 17H6l3 3" />
            <path d="M6 17l3-3" />
          </svg>
        </button>
      )}

      {settingsOpen && (
        <div className="ps-settings-panel">
          <div className="ps-popup-title">Settings · {equipment}</div>
          <div className="ps-settings-field-label">Increment</div>
          <div className="ps-settings-row">
            <input
              className="ps-increment-input"
              type="number"
              inputMode="decimal"
              value={inputValue}
              min={INCREMENT_MIN[unit]}
              max={INCREMENT_MAX[unit]}
              step={INCREMENT_MIN[unit]}
              onChange={e => { setInputValue(e.target.value); setInputError('') }}
              onKeyDown={e => e.key === 'Enter' && handleIncrementSave()}
            />
            <span className="ps-increment-unit">{unit}</span>
          </div>
          {inputError && <div className="ps-increment-error">{inputError}</div>}
          <div className="ps-settings-field-label">Starting weight</div>
          <div className="ps-settings-row">
            <input
              className="ps-increment-input"
              type="number"
              inputMode="decimal"
              value={startInputValue}
              min="0"
              max={getWeightInputMax(equipment, unit)}
              step={INCREMENT_MIN[unit]}
              onChange={e => { setStartInputValue(e.target.value); setStartInputError('') }}
              onKeyDown={e => e.key === 'Enter' && handleIncrementSave()}
            />
            <span className="ps-increment-unit">{unit}</span>
          </div>
          {startInputError && <div className="ps-increment-error">{startInputError}</div>}
          <div className="ps-settings-actions">
            <button className="ps-settings-save" onClick={handleIncrementSave}>Save</button>
            {(customIncrementKg != null || customStartingWeightKg != null) && (
              <button className="ps-settings-reset" onClick={handleIncrementReset}>
                Reset to defaults
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
