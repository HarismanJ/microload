import { useState, useEffect, useRef } from 'react'
import { fromKg } from '../lib/liftMath'

const ACTION_CONFIG = {
  increase_weight: { label: 'Microload',  colorClass: 'ps-green'  },
  increase_reps:   { label: 'More Reps', colorClass: 'ps-green'  },
  maintain:        { label: 'Maintain',  colorClass: 'ps-yellow' },
  deload:          { label: 'Deload',    colorClass: 'ps-amber'  },
}

export default function ProgressionSuggestion({ suggestion, unitPreference, onApply }) {
  const [popupOpen, setPopupOpen] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    if (!popupOpen) return
    const onDown = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setPopupOpen(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [popupOpen])

  if (!suggestion) return null
  const { action, activeSetIndex, suggestedWeightKg, suggestedReps, reasoning, isBodyweightOnly } = suggestion
  const config = ACTION_CONFIG[action]
  if (!config) return null

  const setNumber = Number.isInteger(activeSetIndex) ? activeSetIndex + 1 : null

  const applyWeight = suggestedWeightKg !== null
    ? Math.round(fromKg(suggestedWeightKg, unitPreference) * 10) / 10
    : null
  const displayWeight = applyWeight !== null && !(isBodyweightOnly && suggestedWeightKg === 0)
    ? applyWeight
    : null

  const targetLabel = displayWeight !== null && suggestedReps !== null
    ? `${displayWeight} × ${suggestedReps}`
    : displayWeight !== null
      ? `${displayWeight} ${unitPreference}`
      : suggestedReps !== null
        ? `${suggestedReps} reps`
        : null

  const popupTitle = setNumber ? `Set ${setNumber} · ${config.label}` : config.label

  return (
    <div className={`progression-suggestion ${config.colorClass}`} ref={containerRef}>
      {popupOpen && (
        <div className="ps-popup">
          <div className="ps-popup-title">{popupTitle}</div>
          <div className="ps-popup-body">{reasoning || config.label}</div>
        </div>
      )}

      <div className="ps-left">
        <span className={`ps-badge ${config.colorClass}`}>{setNumber ? `Set ${setNumber} · ${config.label}` : config.label}</span>
        {targetLabel && <span className="ps-target">{targetLabel}</span>}
      </div>

      <div className="ps-right">
        <button
          className="ps-info-btn"
          type="button"
          aria-label="Why this suggestion"
          onClick={() => setPopupOpen(o => !o)}
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
  )
}
