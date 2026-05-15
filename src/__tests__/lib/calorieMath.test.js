import { CARDIO_MET, getMuscleCountMET } from '../../data/metValues.js'
import { estimateCaloriesBurned } from '../../lib/calorieMath.js'
import { DEFAULT_BODYWEIGHT_KG } from '../../lib/liftMath.js'

function makeCardio(name, durationSeconds) {
  return {
    name,
    isCardio: true,
    sets: [{ durationSeconds }],
  }
}

function makeStrength(setCount = 1, primary_muscles = ['Chest'], secondary_muscles = []) {
  return {
    name: 'Strength',
    isCardio: false,
    primary_muscles,
    secondary_muscles,
    sets: Array.from({ length: setCount }, () => ({})),
  }
}

describe('estimateCaloriesBurned', () => {
  it('returns zero for empty workouts', () => {
    expect(estimateCaloriesBurned([], 3600, 80)).toBe(0)
  })

  it('uses known cardio MET values per set', () => {
    expect(estimateCaloriesBurned([
      makeCardio('Running', 1800),
    ], 1800, 80)).toBe(Math.round(CARDIO_MET.Running * 80 * 0.5))
  })

  it('uses fallback MET for unknown cardio exercises', () => {
    expect(estimateCaloriesBurned([
      makeCardio('Mystery Conditioning', 600),
    ], 600, 60)).toBe(60)
  })

  it('uses the default bodyweight when bodyweight is invalid', () => {
    expect(estimateCaloriesBurned([
      makeCardio('Walking', 3600),
    ], 3600, null)).toBe(Math.round(CARDIO_MET.Walking * DEFAULT_BODYWEIGHT_KG))
  })

  it('subtracts cardio time from the strength duration in mixed workouts', () => {
    const strength = makeStrength(2, ['Chest'])
    const expectedCardio = CARDIO_MET.Running * 100 * 0.5
    const expectedStrength = getMuscleCountMET(strength) * 100 * 0.5

    expect(estimateCaloriesBurned([
      makeCardio('Running', 1800),
      strength,
    ], 3600, 100)).toBe(Math.round(expectedCardio + expectedStrength))
  })

  it('rounds fractional calories and clamps negative totals to zero', () => {
    const rounded = estimateCaloriesBurned([makeCardio('Running', 100)], 100, 70)
    expect(Number.isInteger(rounded)).toBe(true)
    expect(rounded).toBe(Math.round(CARDIO_MET.Running * 70 * (100 / 3600)))

    expect(estimateCaloriesBurned([makeCardio('Running', -60)], -60, 70)).toBe(0)
  })
})
