import { useState, useEffect, useRef } from 'react'
import { fromKg, toKg, getWeightInputMax } from '../lib/liftMath'
import { getWeightIncrement } from '../lib/progressiveOverload'

const ACTION_CONFIG = {
  increase_weight: { label: 'Microload',  colorClass: 'ps-green'  },
  increase_reps:   { label: 'More Reps', colorClass: 'ps-green'  },
  maintain:        { label: 'Maintain',  colorClass: 'ps-yellow' },
  deload:          { label: 'Deload',    colorClass: 'ps-amber'  },
}

const INCREMENT_MIN = { kg: 0.25, lbs: 0.5 }
const INCREMENT_MAX = { kg: 20,   lbs: 45  }

export default function ProgressionSuggestion({
  suggestion,
  unitPreference,
  onApply,
  equipment,
  customIncrementKg,
  onIncrementChange,
  customStartingWeightKg,
  onStartingWeightChange,
}) {
  const [popupOpen, setPopupOpen]           = useState(false)
  const [settingsOpen, setSettingsOpen]     = useState(false)
  const [inputValue, setInputValue]         = useState('')
  const [inputError, setInputError]         = useState('')
  const [startInputValue, setStartInputValue] = useState('')
  const [startInputError, setStartInputError] = useState('')
  const containerRef = useRef(null)

  const unit = unitPreference || 'kg'

  function populateSettingsInputs() {
    const effectiveKg = customIncrementKg ?? getWeightIncrement(equipment, unit)
    setInputValue(String(Math.round(fromKg(effectiveKg, unit) * 100) / 100))
    setInputError('')
    const effectiveStartKg = customStartingWeightKg ?? 0
    setStartInputValue(String(Math.round(fromKg(effectiveStartKg, unit) * 100) / 100))
    setStartInputError('')
  }

  // Close panels on outside click
  useEffect(() => {
    if (!popupOpen && !settingsOpen) return
    const onDown = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setPopupOpen(false)
        setSettingsOpen(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [popupOpen, settingsOpen])

  if (!suggestion) return null
  const { action, activeSetIndex, suggestedWeightKg, suggestedReps, reasoning, isBodyweightOnly } = suggestion
  const config = ACTION_CONFIG[action]
  if (!config) return null

  const setNumber = Number.isInteger(activeSetIndex) ? activeSetIndex + 1 : null

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

  const popupTitle = setNumber ? `Set ${setNumber} · ${config.label}` : config.label

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

    onIncrementChange(equipment, toKg(parsed, unit))
    const startKg = toKg(parsedStart, unit)
    onStartingWeightChange(equipment, startKg > 0 ? startKg : null)
    setSettingsOpen(false)
  }

  function handleIncrementReset() {
    onIncrementChange(equipment, null)
    onStartingWeightChange(equipment, null)
    setSettingsOpen(false)
  }

  function handleSettingsToggle() {
    const nextOpen = !settingsOpen
    if (nextOpen) populateSettingsInputs()
    setSettingsOpen(nextOpen)
    setPopupOpen(false)
  }

  return (
    <div className={`progression-suggestion ${config.colorClass}`} ref={containerRef}>
      {popupOpen && (
        <div className="ps-popup">
          <div className="ps-popup-title">{popupTitle}</div>
          <div className="ps-popup-body">{reasoning || config.label}</div>
        </div>
      )}

      <div className="ps-bar">
        <div className="ps-left">
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
            onClick={() => { setPopupOpen(o => !o); setSettingsOpen(false) }}
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
              onClick={() => onApply(applyWeight, suggestedReps)}
            >
              Apply
            </button>
          )}
        </div>
      </div>

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
