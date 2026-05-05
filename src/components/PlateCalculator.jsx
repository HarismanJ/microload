import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useFocusTrap } from '../lib/useFocusTrap'
import {
  PLATE_SIZES_KG, PLATE_SIZES_LBS,
  BAR_OPTIONS_KG, BAR_OPTIONS_LBS,
  DEFAULT_BAR_INDEX,
  platesToWeight, weightToPlates,
} from '../lib/plateUtils'
import '../styles/PlateCalculator.css'

export default function PlateCalculator({ unit, equipment, currentWeight, onConfirm, onClose }) {
  const isBodyweight = equipment === 'Bodyweight'
  const barOptions  = unit === 'lbs' ? BAR_OPTIONS_LBS  : BAR_OPTIONS_KG
  const plateSizes  = unit === 'lbs' ? PLATE_SIZES_LBS  : PLATE_SIZES_KG

  const sortedPlateSizes = useMemo(() => [...plateSizes].sort((a, b) => b - a), [plateSizes])

  function weightToBodyweightPlates(totalWeight) {
    const plates = []
    let remaining = Math.max(0, Number(totalWeight) || 0)
    const tolerance = 0.01

    for (const plate of sortedPlateSizes) {
      while (remaining >= plate - tolerance) {
        plates.push(plate)
        remaining -= plate
      }
    }

    return plates
  }

  function getInitialState() {
    const parsed = Number(currentWeight)
    if (isBodyweight) {
      return { barIndex: 0, platesPerSide: parsed > 0 ? weightToBodyweightPlates(parsed) : [] }
    }
    if (parsed > 0) {
      const { barIndex, platesPerSide } = weightToPlates(parsed, unit, equipment)
      return { barIndex, platesPerSide }
    }
    return { barIndex: DEFAULT_BAR_INDEX[equipment] ?? 0, platesPerSide: [] }
  }

  const [barIndex, setBarIndex] = useState(() => getInitialState().barIndex)
  const [platesPerSide, setPlatesPerSide] = useState(() => getInitialState().platesPerSide)
  const [visible, setVisible] = useState(false)
  const [exiting, setExiting] = useState(false)
  const sheetRef = useRef(null)

  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  const barWeight = isBodyweight ? 0 : barOptions[barIndex].weight
  const perSideTotal = platesPerSide.reduce((s, p) => s + p, 0)
  const total = isBodyweight ? perSideTotal : platesToWeight(barWeight, platesPerSide)

  function closeAnimated() {
    if (exiting) return
    setExiting(true)
    setVisible(false)
    window.setTimeout(onClose, 220)
  }

  useFocusTrap(sheetRef, { active: visible, onEscape: closeAnimated })

  function addPlate(p) {
    setPlatesPerSide(prev => [...prev, p].sort((a, b) => b - a))
  }

  function removePlate(index) {
    setPlatesPerSide(prev => prev.filter((_, i) => i !== index))
  }

  function formatWeight(w) {
    return Number.isInteger(w) ? String(w) : String(Math.round(w * 100) / 100)
  }

  const content = (
    <div className={`plate-calc-overlay ${visible ? 'open' : ''} ${exiting ? 'closing' : ''}`} onClick={closeAnimated}>
      <div className={`plate-calc-sheet ${visible ? 'open' : ''} ${exiting ? 'closing' : ''}`} onClick={e => e.stopPropagation()} ref={sheetRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Plate Calculator">

        <div className="plate-calc-header">
          <span className="plate-calc-title">Plate Calculator</span>
          <button className="plate-calc-close" onClick={closeAnimated} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Bar selector */}
        {!isBodyweight && (
          <>
            <div className="plate-calc-section-label">Bar</div>
            <div className="plate-calc-bar-row">
              {barOptions.map((opt, idx) => (
                <button
                  key={opt.label}
                  className={`plate-calc-bar-btn ${barIndex === idx ? 'active' : ''}`}
                  onClick={() => setBarIndex(idx)}
                >
                  {opt.label}
                  <span className="plate-calc-bar-weight">{opt.weight} {unit}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* Add plates */}
        <div className="plate-calc-section-label">{isBodyweight ? 'Add weight' : 'Add per side'}</div>
        <div className="plate-calc-plates-row">
          {plateSizes.map(p => (
            <button key={p} className="plate-calc-plate-btn" onClick={() => addPlate(p)}>
              {formatWeight(p)}
            </button>
          ))}
        </div>

        {/* Current load */}
        <div className="plate-calc-section-label">
          {isBodyweight ? 'Selected plates' : 'Per side'}
          {platesPerSide.length > 0 && (
            <button className="plate-calc-clear" onClick={() => setPlatesPerSide([])}>Clear</button>
          )}
        </div>
        <div className="plate-calc-per-side">
          {platesPerSide.length === 0
            ? <span className="plate-calc-empty">No plates added</span>
            : platesPerSide.map((p, i) => (
                <button key={i} className="plate-calc-tag" onClick={() => removePlate(i)}>
                  {formatWeight(p)}
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              ))
          }
        </div>

        {/* Total */}
        <div className="plate-calc-total-row">
          <span className="plate-calc-total-formula">
            {isBodyweight
              ? `${formatWeight(perSideTotal)} =`
              : `${barWeight} + (${formatWeight(perSideTotal)} × 2) =`
            }
          </span>
          <span className="plate-calc-total-value">{formatWeight(total)} {unit}</span>
        </div>

        <button
          className="plate-calc-confirm"
          onClick={() => onConfirm(total)}
          disabled={total <= 0}
        >
          Use {formatWeight(total)} {unit}
        </button>

      </div>
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(content, document.body) : null
}
