import { TIERS, tierColor } from './strengthStandards'

const DAY_MS = 24 * 60 * 60 * 1000

export const ACTIVE_RANK_ALPHA = 0.22
export const ACTIVE_RANK_INACTIVITY_GRACE_DAYS = 30
export const ACTIVE_RANK_DECAY_PER_DAY = 0.03
export const ACTIVE_RANK_MAX_DECAY = 6
export const ACTIVE_RANK_MODE = 'active'
export const ALL_TIME_RANK_MODE = 'all_time'

export function getMaxContinuousTierScore() {
  return TIERS.length - 0.001
}

export function clampContinuousTierScore(score) {
  if (!Number.isFinite(score)) return 0
  return Math.max(0, Math.min(getMaxContinuousTierScore(), score))
}

export function getContinuousTierScore(rank) {
  if (!rank) return null
  return clampContinuousTierScore(rank.tierIdx + Math.min(0.999, (rank.progress ?? 0) / 100))
}

export function resolveTierFromScore(score) {
  const cappedScore = clampContinuousTierScore(score)
  const tierIdx = Math.floor(cappedScore)
  const tier = TIERS[tierIdx]
  const isMax = tierIdx === TIERS.length - 1

  return {
    tierIdx,
    tier,
    color: tierColor(tier),
    progress: isMax ? 100 : Math.round((cappedScore - tierIdx) * 100),
    isMax,
    nextTier: isMax ? null : TIERS[tierIdx + 1],
  }
}

export function inferRatioFromScore(score, thresholds = []) {
  if (!thresholds.length) return 0

  const cappedScore = clampContinuousTierScore(score)
  const idx = Math.floor(cappedScore)
  const low = thresholds[idx] ?? thresholds[thresholds.length - 1] ?? 0
  const high = thresholds[idx + 1] ?? low
  const fractional = Math.min(0.999, Math.max(0, cappedScore - idx))

  return high <= low
    ? low
    : low + (high - low) * fractional
}

function parseDateValue(value) {
  if (!value) return null
  const ts = new Date(value).getTime()
  return Number.isFinite(ts) ? ts : null
}

export function applyInactivityDecay(
  score,
  lastRankedAt,
  now = Date.now(),
  options = {}
) {
  const graceDays = options.graceDays ?? ACTIVE_RANK_INACTIVITY_GRACE_DAYS
  const decayPerDay = options.decayPerDay ?? ACTIVE_RANK_DECAY_PER_DAY
  const maxDecay = options.maxDecay ?? ACTIVE_RANK_MAX_DECAY
  const nowTs = parseDateValue(now) ?? Date.now()
  const lastTs = parseDateValue(lastRankedAt)
  const safeScore = clampContinuousTierScore(score)

  if (lastTs === null || nowTs <= lastTs) {
    return {
      score: safeScore,
      daysSinceRanked: 0,
      daysAfterGrace: 0,
      decayApplied: 0,
    }
  }

  const daysSinceRanked = (nowTs - lastTs) / DAY_MS
  const daysAfterGrace = Math.max(0, daysSinceRanked - graceDays)
  const decayApplied = Math.min(maxDecay, daysAfterGrace * decayPerDay)

  return {
    score: clampContinuousTierScore(safeScore - decayApplied),
    daysSinceRanked,
    daysAfterGrace,
    decayApplied,
  }
}

export function updateRollingScore({
  priorScore,
  priorLastRankedAt,
  sessionScore,
  now = Date.now(),
  alpha = ACTIVE_RANK_ALPHA,
  decayOptions = {},
}) {
  const normalizedSessionScore = clampContinuousTierScore(sessionScore)
  const decayed = applyInactivityDecay(priorScore, priorLastRankedAt, now, decayOptions).score
  const nextScore = clampContinuousTierScore(decayed + alpha * (normalizedSessionScore - decayed))
  return nextScore
}
