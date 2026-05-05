import '../styles/RestWheelPicker.css'
import { VALIDATION_LIMITS } from '../lib/inputValidation'

export default function RestTimePicker({ value, onChange }) {
  const mins = Math.floor(value / 60)
  const secs = Math.round((value % 60) / 5) * 5 // snap to 5s

  const set = (m, s) => {
    let total = m * 60 + s
    if (total < VALIDATION_LIMITS.restSecondsMin) total = VALIDATION_LIMITS.restSecondsMin
    if (total > VALIDATION_LIMITS.restSecondsMax) total = VALIDATION_LIMITS.restSecondsMax
    onChange(total)
  }

  const minsUp   = () => set(mins + 1, secs)
  const minsDown = () => set(Math.max(0, mins - 1), secs)
  const secsUp   = () => secs + 5 >= 60 ? set(mins + 1, 0) : set(mins, secs + 5)
  const secsDown = () => secs - 5 < 0   ? set(Math.max(0, mins - 1), 55) : set(mins, secs - 5)

  return (
    <div className="rtp">
      <div className="rtp-unit">
        <button className="rtp-btn" onClick={minsUp}>+</button>
        <span className="rtp-val">{mins}</span>
        <button className="rtp-btn" onClick={minsDown}>−</button>
        <span className="rtp-label">min</span>
      </div>
      <span className="rtp-colon">:</span>
      <div className="rtp-unit">
        <button className="rtp-btn" onClick={secsUp}>+</button>
        <span className="rtp-val">{String(secs).padStart(2, '0')}</span>
        <button className="rtp-btn" onClick={secsDown}>−</button>
        <span className="rtp-label">sec</span>
      </div>
    </div>
  )
}
