import {
  applyInactivityDecay,
  clampContinuousTierScore,
  getContinuousTierScore,
  getMaxContinuousTierScore,
  inferRatioFromScore,
  resolveTierFromScore,
  updateRollingScore,
} from '../../lib/rollingRanks.js'

const now = new Date('2026-05-14T12:00:00.000Z')

function daysAgo(days) {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString()
}

describe('applyInactivityDecay', () => {
  it('does not decay when there is no prior ranked date', () => {
    expect(applyInactivityDecay(3, null, now)).toMatchObject({
      score: 3,
      daysAfterGrace: 0,
      decayApplied: 0,
    })
  })

  it('does not decay on the same day or within the grace period', () => {
    expect(applyInactivityDecay(3, now, now).score).toBe(3)
    expect(applyInactivityDecay(3, daysAgo(29), now).decayApplied).toBe(0)
  })

  it('applies decay after the grace period and caps long gaps', () => {
    expect(applyInactivityDecay(3, daysAgo(31), now).decayApplied).toBeCloseTo(0.03)
    expect(applyInactivityDecay(10, daysAgo(250), now).decayApplied).toBe(6)
  })
})

describe('continuous rank scores', () => {
  it('updates by EMA after inactivity decay', () => {
    expect(updateRollingScore({
      priorScore: 2,
      priorLastRankedAt: now,
      sessionScore: 4,
      now,
      alpha: 0.25,
    })).toBe(2.5)
  })

  it('clamps scores into the valid tier range', () => {
    expect(clampContinuousTierScore(-1)).toBe(0)
    expect(clampContinuousTierScore(Number.POSITIVE_INFINITY)).toBe(0)
    expect(clampContinuousTierScore(999)).toBe(getMaxContinuousTierScore())
  })

  it('maps tier progress into a continuous score', () => {
    expect(getContinuousTierScore({ tierIdx: 2, progress: 50 })).toBe(2.5)
    expect(getContinuousTierScore({ tierIdx: 2, progress: 150 })).toBe(2.999)
  })

  it('returns null continuous scores for missing ranks', () => {
    expect(getContinuousTierScore(null)).toBeNull()
  })

  it('resolves a score back into tier metadata', () => {
    expect(resolveTierFromScore(1.42)).toMatchObject({
      tierIdx: 1,
      progress: 42,
      isMax: false,
    })
  })

  it('interpolates ratio thresholds from a continuous score', () => {
    expect(inferRatioFromScore(1.5, [1, 2, 4])).toBe(3)
    expect(inferRatioFromScore(3, [])).toBe(0)
  })
})
