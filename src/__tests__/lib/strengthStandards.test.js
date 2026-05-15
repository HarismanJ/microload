import {
  anchorsOrNull,
  getAnchors,
  TIER_COLORS,
  TIER_GROUPS,
  TIERS,
  expandAnchors,
  getProgress,
  getTierIdx,
  tierColor,
  tierGroup,
  weightForOrm,
} from '../../lib/strengthStandards.js'

describe('strength standard rank constants and display helpers', () => {
  it('expands rank groups into three tiers each', () => {
    expect(TIER_GROUPS).toEqual([
      'Iron',
      'Bronze',
      'Silver',
      'Gold',
      'Platinum',
      'Diamond',
      'Master',
      'Grandmaster',
      'Elite',
    ])
    expect(TIERS).toHaveLength(27)
    expect(TIERS.slice(0, 4)).toEqual(['Iron I', 'Iron II', 'Iron III', 'Bronze I'])
    expect(TIERS.at(-1)).toBe('Elite III')
  })

  it('resolves tier groups and colors', () => {
    expect(tierGroup('Grandmaster III')).toBe('Grandmaster')
    expect(tierColor('Gold II')).toBe(TIER_COLORS.Gold)
    expect(tierColor('Unknown I')).toBeUndefined()
  })
})

describe('expandAnchors', () => {
  it('turns ten group anchors into 27 tier thresholds', () => {
    const thresholds = expandAnchors([0, 3, 6, 9, 12, 15, 18, 21, 24, 27])

    expect(thresholds).toHaveLength(27)
    expect(thresholds.slice(0, 9)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8])
    expect(thresholds.slice(-3)).toEqual([24, 25, 26])
  })

  it('rounds interpolated thresholds to three decimals', () => {
    const thresholds = expandAnchors([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])

    expect(thresholds.slice(0, 6)).toEqual([0, 0.333, 0.667, 1, 1.333, 1.667])
    expect(thresholds.at(-1)).toBe(8.667)
  })

  it('builds usable threshold ladders for known catalog lifts', async () => {
    const anchors = await getAnchors()
    const maleBench = anchors.male['Bench Press']
    const femaleBench = anchors.female['Bench Press']

    expect(maleBench).toHaveLength(10)
    expect(femaleBench).toHaveLength(10)
    expect(expandAnchors(maleBench)).toHaveLength(TIERS.length)
    expect(expandAnchors(femaleBench)).toHaveLength(TIERS.length)
    expect(femaleBench[1]).toBeLessThan(maleBench[1])
  })

  it('caches dynamically loaded anchors for synchronous render paths', async () => {
    const [first, second] = await Promise.all([getAnchors(), getAnchors()])

    expect(second).toBe(first)
    expect(anchorsOrNull()).toBe(first)
    expect(anchorsOrNull().male['Bench Press']).toBe(first.male['Bench Press'])
  })
})

describe('tier and progress mapping', () => {
  const thresholds = [0, 10, 20, 30, 40]

  it('finds the current tier index across threshold boundaries', () => {
    expect(getTierIdx(-5, thresholds)).toBe(0)
    expect(getTierIdx(0, thresholds)).toBe(0)
    expect(getTierIdx(10, thresholds)).toBe(1)
    expect(getTierIdx(19.9, thresholds)).toBe(1)
    expect(getTierIdx(99, thresholds)).toBe(4)
  })

  it('calculates clamped percentage progress toward the next tier', () => {
    expect(getProgress(-5, thresholds, 0)).toBe(0)
    expect(getProgress(5, thresholds, 0)).toBe(50)
    expect(getProgress(25, thresholds, 2)).toBe(50)
    expect(getProgress(35, thresholds, 2)).toBe(100)
  })

  it('returns full progress for final or non-increasing threshold ranges', () => {
    expect(getProgress(999, thresholds, TIERS.length - 1)).toBe(100)
    expect(getProgress(10, [0, 10, 10], 1)).toBe(100)
  })
})

describe('weightForOrm', () => {
  it('returns the target ORM directly for one rep', () => {
    expect(weightForOrm(125, 1)).toBe(125)
  })

  it('converts common rep targets to stable half-kilo weights', () => {
    expect(weightForOrm(100, 5)).toBe(87.5)
    expect(weightForOrm(100, 10)).toBe(75)
    expect(weightForOrm(120, 8)).toBe(95.5)
  })

  it('documents current edge-case behavior without changing production code', () => {
    expect(Number.isNaN(weightForOrm(undefined, 5))).toBe(true)
    expect(weightForOrm(null, 5)).toBe(0)
    expect(weightForOrm(100, 0)).toBeGreaterThan(100)
    expect(weightForOrm(100, 37)).toBe(0)
    expect(weightForOrm(100, 38)).toBeLessThan(0)
  })
})
