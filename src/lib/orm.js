import { DEFAULT_BODYWEIGHT_KG, fromKg, toKg } from './liftMath'

export const ESTIMATED_ORM_REP_CAP = 30

export function calculateORM(weight, reps) {
  if (reps === 1) return weight
  const brzycki = weight * (36 / (37 - reps))
  const epley = weight * (1 + reps / 30)
  return Math.round((brzycki + epley) / 2 * 10) / 10
}

export function calculateSetEstimatedOrm({
  weight,
  reps,
  unit = 'kg',
  equipment,
  bodyweightKg = null,
} = {}) {
  const parsedWeight = Number(weight)
  const parsedReps = Number(reps)

  if (
    !Number.isFinite(parsedWeight) ||
    !Number.isFinite(parsedReps) ||
    parsedReps <= 0 ||
    parsedReps > ESTIMATED_ORM_REP_CAP
  ) {
    return null
  }

  if (equipment !== 'Bodyweight') {
    return calculateORM(parsedWeight, parsedReps)
  }

  const resolvedBodyweightKg = Number.isFinite(bodyweightKg) && bodyweightKg > 0
    ? bodyweightKg
    : DEFAULT_BODYWEIGHT_KG
  const externalKg = toKg(parsedWeight, unit)
  const totalLoadKg = Math.max(0, resolvedBodyweightKg + externalKg)
  const totalOrmKg = calculateORM(totalLoadKg, parsedReps)
  const addedLoadEquivalentKg = totalOrmKg - resolvedBodyweightKg

  return Math.round(fromKg(addedLoadEquivalentKg, unit) * 10) / 10
}
