import { CARDIO_MET, getMuscleCountMET } from '../data/metValues'
import { DEFAULT_BODYWEIGHT_KG } from './liftMath'

const FALLBACK_CARDIO_MET = 6.0

/**
 * Estimate calories burned for a workout session.
 *
 * @param {Array} exercises - Array of exercise objects:
 *   { name, isCardio, primary_muscles, secondary_muscles, sets }
 *   Cardio sets must have { durationSeconds: number }.
 *   Strength sets only need to exist (count is used for MET weighting).
 * @param {number} durationSeconds - Total workout duration in seconds
 * @param {number} bodyweightKg - User body weight in kg
 * @returns {number} Estimated kcal burned (rounded integer, minimum 0)
 */
export function estimateCaloriesBurned(exercises, durationSeconds, bodyweightKg) {
  const bw = (Number.isFinite(bodyweightKg) && bodyweightKg > 0)
    ? bodyweightKg
    : DEFAULT_BODYWEIGHT_KG

  const cardioExs = exercises.filter(ex => ex.isCardio)
  const strengthExs = exercises.filter(ex => !ex.isCardio)

  let burned = 0

  // Cardio: per-set MET × duration (cardio is continuous — correct to apply per set)
  let cardioDurationSec = 0
  for (const ex of cardioExs) {
    const met = CARDIO_MET[ex.name] ?? FALLBACK_CARDIO_MET
    for (const set of ex.sets) {
      const dur = set.durationSeconds || 0
      burned += met * bw * (dur / 3600)
      cardioDurationSec += dur
    }
  }

  // Strength: weighted-average MET × (total session time − cardio time).
  // Compendium strength METs are whole-session values (rest periods included),
  // so we apply them to total session duration, not active-only time.
  if (strengthExs.length > 0) {
    const strengthDur = Math.max(0, durationSeconds - cardioDurationSec)
    let totalSets = 0
    let weightedMET = 0
    for (const ex of strengthExs) {
      const setCount = Math.max(1, ex.sets.length)
      const met = getMuscleCountMET(ex)
      weightedMET += met * setCount
      totalSets += setCount
    }
    const avgMET = totalSets > 0 ? weightedMET / totalSets : 4.5
    burned += avgMET * bw * (strengthDur / 3600)
  }

  return Math.max(0, Math.round(burned))
}
