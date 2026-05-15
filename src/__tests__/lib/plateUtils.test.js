import {
  BAR_OPTIONS_KG,
  platesToWeight,
  snapToPlates,
  weightToPlates,
} from '../../lib/plateUtils.js'

describe('snapToPlates', () => {
  it('keeps an already achievable barbell weight', () => {
    expect(snapToPlates(100, 'kg', 'Barbell')).toBe(100)
  })

  it('rounds up to the next smallest achievable plate load', () => {
    expect(snapToPlates(21, 'kg', 'Barbell')).toBe(22.5)
  })

  it('returns the bare bar when the target is below bar weight', () => {
    expect(snapToPlates(10, 'kg', 'Barbell')).toBe(20)
  })

  it('snaps pound targets and returns kilograms', () => {
    expect(snapToPlates(45.3592, 'lbs', 'Barbell')).toBeCloseTo(45.3592)
  })

  it('leaves non-plate equipment untouched', () => {
    expect(snapToPlates(23, 'kg', 'Dumbbell')).toBe(23)
  })

  it('uses equipment-specific default bars', () => {
    expect(snapToPlates(12, 'kg', 'EZ Bar')).toBe(12.5)
    expect(snapToPlates(10, 'kg', 'EZ Bar')).toBe(10)
  })
})

describe('plate decomposition', () => {
  it('round-trips weightToPlates through platesToWeight', () => {
    const result = weightToPlates(100, 'kg', 'Barbell')
    expect(result).toEqual({ barIndex: 0, platesPerSide: [25, 10, 5] })
    expect(platesToWeight(BAR_OPTIONS_KG[result.barIndex].weight, result.platesPerSide)).toBe(100)
  })

  it('returns no plates when total weight is below the default bar', () => {
    expect(weightToPlates(5, 'kg', 'Barbell')).toEqual({ barIndex: 0, platesPerSide: [] })
  })

  it('decomposes pound weights with the default pound bar', () => {
    expect(weightToPlates(135, 'lbs', 'Barbell')).toEqual({
      barIndex: 0,
      platesPerSide: [45],
    })
  })
})
