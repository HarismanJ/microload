import { SUPPORTED_MUSCLES, CUSTOM_EQUIPMENT_OPTIONS } from '../../lib/exerciseOptions'

describe('SUPPORTED_MUSCLES', () => {
  it('is an array with at least one entry', () => {
    expect(Array.isArray(SUPPORTED_MUSCLES)).toBe(true)
    expect(SUPPORTED_MUSCLES.length).toBeGreaterThan(0)
  })

  it('contains core muscle groups', () => {
    expect(SUPPORTED_MUSCLES).toContain('Chest')
    expect(SUPPORTED_MUSCLES).toContain('Biceps')
    expect(SUPPORTED_MUSCLES).toContain('Triceps')
    expect(SUPPORTED_MUSCLES).toContain('Quads')
    expect(SUPPORTED_MUSCLES).toContain('Glutes')
    expect(SUPPORTED_MUSCLES).toContain('Hamstrings')
    expect(SUPPORTED_MUSCLES).toContain('Lats')
    expect(SUPPORTED_MUSCLES).toContain('Core')
  })

  it('contains all entries as non-empty strings', () => {
    SUPPORTED_MUSCLES.forEach(m => {
      expect(typeof m).toBe('string')
      expect(m.length).toBeGreaterThan(0)
    })
  })

  it('has no duplicate entries', () => {
    expect(new Set(SUPPORTED_MUSCLES).size).toBe(SUPPORTED_MUSCLES.length)
  })
})

describe('CUSTOM_EQUIPMENT_OPTIONS', () => {
  it('is an array with at least one entry', () => {
    expect(Array.isArray(CUSTOM_EQUIPMENT_OPTIONS)).toBe(true)
    expect(CUSTOM_EQUIPMENT_OPTIONS.length).toBeGreaterThan(0)
  })

  it('contains common equipment types', () => {
    expect(CUSTOM_EQUIPMENT_OPTIONS).toContain('Barbell')
    expect(CUSTOM_EQUIPMENT_OPTIONS).toContain('Dumbbell')
    expect(CUSTOM_EQUIPMENT_OPTIONS).toContain('Bodyweight')
    expect(CUSTOM_EQUIPMENT_OPTIONS).toContain('Cable')
    expect(CUSTOM_EQUIPMENT_OPTIONS).toContain('Kettlebell')
  })

  it('contains all entries as non-empty strings', () => {
    CUSTOM_EQUIPMENT_OPTIONS.forEach(opt => {
      expect(typeof opt).toBe('string')
      expect(opt.length).toBeGreaterThan(0)
    })
  })

  it('has no duplicate entries', () => {
    expect(new Set(CUSTOM_EQUIPMENT_OPTIONS).size).toBe(CUSTOM_EQUIPMENT_OPTIONS.length)
  })
})
