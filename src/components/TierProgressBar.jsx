import RankBadge from './RankBadge'
import { tierGroup } from '../lib/strengthStandards'

export default function TierProgressBar({
  currentTier,
  nextTier,
  progress,
  color,
  isMax = false,
  badgeSize = 18,
}) {
  if (!currentTier) return null
  const pct = isMax ? 100 : Math.max(0, Math.min(100, Math.round(progress ?? 0)))
  const currentGroup = tierGroup(currentTier)
  const nextGroup = nextTier ? tierGroup(nextTier) : null

  return (
    <div className="tier-progress-row" style={{ '--tier-color': color }}>
      <div className="tier-progress-badge">
        <RankBadge tier={currentGroup} size={badgeSize} />
      </div>
      <div className="tier-progress-track">
        <div className="tier-progress-fill" style={{ width: `${pct}%` }} />
        {!isMax && pct > 0 && pct < 100 && (
          <span className="tier-progress-notch" style={{ left: `${pct}%` }} />
        )}
      </div>
      {isMax ? (
        <div className="tier-progress-max">MAX</div>
      ) : (
        <div className="tier-progress-badge">
          {nextGroup && <RankBadge tier={nextGroup} size={badgeSize} />}
        </div>
      )}
      <div className="tier-progress-pct">{isMax ? '100%' : `${pct}%`}</div>
    </div>
  )
}
