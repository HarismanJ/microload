import { calculateORM, calculateSetEstimatedOrm } from '../../lib/orm.js'

describe('calculateORM', () => {
  it('returns the input weight for a single rep', () => {
    expect(calculateORM(140, 1)).toBe(140)
  })

  it('averages Brzycki and Epley estimates through the rep cap', () => {
    expect(calculateORM(100, 30)).toBe(357.1)
  })
})

describe('calculateSetEstimatedOrm', () => {
  it('rejects invalid weights and rep counts', () => {
    expect(calculateSetEstimatedOrm({ weight: Number.NaN, reps: 5 })).toBeNull()
    expect(calculateSetEstimatedOrm({ weight: 100, reps: 0 })).toBeNull()
    expect(calculateSetEstimatedOrm({ weight: 100, reps: 31 })).toBeNull()
  })

  it('estimates regular equipment directly from the entered weight', () => {
    expect(calculateSetEstimatedOrm({
      weight: '100',
      reps: '10',
      equipment: 'Barbell',
    })).toBe(133.3)
  })

  it('estimates external load for bodyweight exercises in kg', () => {
    expect(calculateSetEstimatedOrm({
      weight: 20,
      reps: 10,
      unit: 'kg',
      equipment: 'Bodyweight',
      bodyweightKg: 80,
    })).toBe(53.3)
  })

  it('preserves the requested unit for bodyweight estimates', () => {
    expect(calculateSetEstimatedOrm({
      weight: 45,
      reps: 1,
      unit: 'lbs',
      equipment: 'Bodyweight',
      bodyweightKg: 80,
    })).toBe(45)
  })

  it('falls back to the default bodyweight when none is supplied', () => {
    expect(calculateSetEstimatedOrm({
      weight: 0,
      reps: 1,
      equipment: 'Bodyweight',
      unit: 'kg',
    })).toBe(0)
  })
})
