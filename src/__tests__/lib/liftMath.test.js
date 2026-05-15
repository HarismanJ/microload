import {
  convertWeight,
  fromKg,
  getEffectiveLoadKg,
  getProfileBodyweightKg,
  getSetVolumeKg,
  getSetVolumeInUnit,
  getWeightInputMax,
  getWeightInputMin,
  isRepsWithinInputRange,
  isWeightWithinInputRange,
  toKg,
} from '../../lib/liftMath.js'

describe('weight conversion helpers', () => {
  it('converts pounds to kilograms and back', () => {
    expect(toKg(100, 'lbs')).toBeCloseTo(45.3592)
    expect(fromKg(45.3592, 'lbs')).toBeCloseTo(100)
  })

  it('leaves nullish and non-finite conversion inputs alone', () => {
    expect(convertWeight(null, 'kg', 'lbs')).toBeNull()
    expect(convertWeight(undefined, 'kg', 'lbs')).toBeUndefined()
    expect(convertWeight('heavy', 'kg', 'lbs')).toBe('heavy')
  })

  it('converts only when units differ', () => {
    expect(convertWeight('100', 'kg', 'kg')).toBe(100)
    expect(convertWeight(100, 'kg', 'lbs')).toBeCloseTo(220.462)
  })

  it('resolves profile bodyweight with fallback and unit conversion', () => {
    expect(getProfileBodyweightKg(null, 82)).toBe(82)
    expect(getProfileBodyweightKg({ bodyweight: null }, 82)).toBe(82)
    expect(getProfileBodyweightKg({ bodyweight: 220, unit_preference: 'lbs' })).toBeCloseTo(99.7902)
    expect(getProfileBodyweightKg({ bodyweight: 90, unit_preference: 'kg' })).toBe(90)
  })
})

describe('set volume and input ranges', () => {
  it('calculates barbell volume from external load', () => {
    expect(getSetVolumeKg({
      weight: 100,
      reps: 5,
      unit: 'kg',
      equipment: 'Barbell',
    })).toBe(500)
  })

  it('calculates bodyweight volume from bodyweight plus external load', () => {
    expect(getSetVolumeKg({
      weight: -20,
      reps: 5,
      unit: 'kg',
      equipment: 'Bodyweight',
      bodyweightKg: 80,
    })).toBe(300)
  })

  it('never returns negative effective load', () => {
    expect(getEffectiveLoadKg(-200, 'kg', 'Bodyweight', 80)).toBe(0)
    expect(getEffectiveLoadKg(-5, 'kg', 'Barbell')).toBe(0)
  })

  it('converts set volume into a target unit', () => {
    expect(getSetVolumeInUnit({
      weight: 100,
      reps: 2,
      unit: 'kg',
      equipment: 'Barbell',
    }, 'lbs')).toBeCloseTo(440.924)
  })

  it('reports equipment-specific input min and max values', () => {
    expect(getWeightInputMax('Bodyweight', 'kg')).toBe(999)
    expect(getWeightInputMax('Barbell', 'kg')).toBe(9999)
    expect(getWeightInputMin('Bodyweight', 'kg', 80)).toBe(-80)
    expect(getWeightInputMin('Barbell', 'kg')).toBe(0)
  })

  it('validates regular and bodyweight input bounds', () => {
    expect(isWeightWithinInputRange(-1, { equipment: 'Barbell' })).toBe(false)
    expect(isWeightWithinInputRange(10000, { equipment: 'Barbell' })).toBe(false)
    expect(isWeightWithinInputRange(-80, { equipment: 'Bodyweight', bodyweightKg: 80 })).toBe(true)
    expect(isWeightWithinInputRange(-81, { equipment: 'Bodyweight', bodyweightKg: 80 })).toBe(false)
  })

  it('validates rep input bounds', () => {
    expect(isRepsWithinInputRange(1)).toBe(true)
    expect(isRepsWithinInputRange(9999)).toBe(true)
    expect(isRepsWithinInputRange(0)).toBe(false)
    expect(isRepsWithinInputRange(1.5)).toBe(false)
  })
})
