import { MUSCLE_WORKLOAD_GROUPS, getMuscleWorkloadGroupsForName } from '../../lib/muscleGroups'

describe('MUSCLE_WORKLOAD_GROUPS', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(MUSCLE_WORKLOAD_GROUPS)).toBe(true)
    expect(MUSCLE_WORKLOAD_GROUPS.length).toBeGreaterThan(0)
  })

  it('each entry has the required shape', () => {
    MUSCLE_WORKLOAD_GROUPS.forEach(group => {
      expect(typeof group.key).toBe('string')
      expect(typeof group.label).toBe('string')
      expect(Array.isArray(group.muscles)).toBe(true)
      expect(Array.isArray(group.chartMuscles)).toBe(true)
      expect(typeof group.weeklyTargets).toBe('object')
      expect(typeof group.weeklyTargets.strength).toBe('number')
      expect(typeof group.weeklyTargets.hypertrophy).toBe('number')
      expect(typeof group.weeklyTargets.endurance).toBe('number')
    })
  })

  it('contains expected muscle groups', () => {
    const keys = MUSCLE_WORKLOAD_GROUPS.map(g => g.key)
    expect(keys).toContain('chest')
    expect(keys).toContain('biceps')
    expect(keys).toContain('triceps')
    expect(keys).toContain('quadriceps')
    expect(keys).toContain('gluteal')
    expect(keys).toContain('hamstring')
    expect(keys).toContain('upper-back')
  })

  it('weekly targets have endurance >= hypertrophy >= strength', () => {
    MUSCLE_WORKLOAD_GROUPS.forEach(group => {
      const { strength, hypertrophy, endurance } = group.weeklyTargets
      expect(hypertrophy).toBeGreaterThanOrEqual(strength)
      expect(endurance).toBeGreaterThanOrEqual(hypertrophy)
    })
  })
})

describe('getMuscleWorkloadGroupsForName', () => {
  it('returns [] for empty string', () => {
    expect(getMuscleWorkloadGroupsForName('')).toEqual([])
  })

  it('returns [] for null', () => {
    expect(getMuscleWorkloadGroupsForName(null)).toEqual([])
  })

  it('matches an exact primary muscle name', () => {
    const groups = getMuscleWorkloadGroupsForName('Chest')
    expect(groups.length).toBeGreaterThan(0)
    expect(groups.some(g => g.key === 'chest')).toBe(true)
  })

  it('matches Biceps to the biceps group', () => {
    const groups = getMuscleWorkloadGroupsForName('Biceps')
    expect(groups.length).toBe(1)
    expect(groups[0].key).toBe('biceps')
  })

  it('matches Lats to the upper-back group', () => {
    const groups = getMuscleWorkloadGroupsForName('Lats')
    expect(groups.some(g => g.key === 'upper-back')).toBe(true)
  })

  it('Core maps to multiple groups (abs and obliques)', () => {
    const groups = getMuscleWorkloadGroupsForName('Core')
    const keys = groups.map(g => g.key)
    expect(keys).toContain('abs')
    expect(keys).toContain('obliques')
  })

  it('is case-insensitive', () => {
    const lower = getMuscleWorkloadGroupsForName('chest')
    const upper = getMuscleWorkloadGroupsForName('Chest')
    expect(lower.map(g => g.key)).toEqual(upper.map(g => g.key))
  })

  it('Front Delts maps to the front-deltoids group', () => {
    const groups = getMuscleWorkloadGroupsForName('Front Delts')
    expect(groups.some(g => g.key === 'front-deltoids')).toBe(true)
  })

  it('Rhomboids maps to the upper-back group', () => {
    const groups = getMuscleWorkloadGroupsForName('Rhomboids')
    expect(groups.some(g => g.key === 'upper-back')).toBe(true)
  })

  it('returns [] for a completely unknown muscle name', () => {
    const groups = getMuscleWorkloadGroupsForName('Fingernails')
    expect(groups).toEqual([])
  })
})
