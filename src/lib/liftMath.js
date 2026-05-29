const KG_TO_LBS = 2.20462
const LBS_TO_KG = 0.453592
export const MAX_REPS = 9999
export const MAX_WEIGHT = 9999
const MAX_BODYWEIGHT_EXTERNAL_KG = 999
export const DEFAULT_BODYWEIGHT_KG = 170 * LBS_TO_KG

export function fmtCompact(n) {
  if (n < 10000) return String(n)
  if (n < 1000000) {
    const k = n / 1000
    return (Number.isInteger(k) ? k.toFixed(0) : k.toFixed(1)) + 'k'
  }
  const m = n / 1000000
  return (Number.isInteger(m) ? m.toFixed(0) : m.toFixed(1)) + 'M'
}

export function toKg(value, unit = 'kg') {
  return unit === 'lbs' ? value * LBS_TO_KG : value
}

export function fromKg(value, unit = 'kg') {
  return unit === 'lbs' ? value * KG_TO_LBS : value
}

export function convertWeight(value, fromUnit = 'kg', toUnit = 'kg') {
  if (value === null || value === undefined) return value
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return value
  if (fromUnit === toUnit) return numeric
  return fromKg(toKg(numeric, fromUnit), toUnit)
}

export function getProfileBodyweightKg(profile, fallback = null) {
  if (profile?.bodyweight === null || profile?.bodyweight === undefined) return fallback
  return profile.unit_preference === 'lbs'
    ? toKg(profile.bodyweight, 'lbs')
    : profile.bodyweight
}

export function getWeightInputMax(equipment, unit = 'kg') {
  return equipment === 'Bodyweight'
    ? fromKg(MAX_BODYWEIGHT_EXTERNAL_KG, unit)
    : MAX_WEIGHT
}

export function getWeightInputMin(equipment, unit = 'kg', bodyweightKg = null) {
  if (equipment !== 'Bodyweight') return 0
  const resolvedBodyweightKg = bodyweightKg ?? DEFAULT_BODYWEIGHT_KG
  return -fromKg(resolvedBodyweightKg, unit)
}

export function isRepsWithinInputRange(reps) {
  return Number.isInteger(reps) && reps >= 1 && reps <= MAX_REPS
}

export function isWeightWithinInputRange(weight, {
  equipment,
  unit = 'kg',
  bodyweightKg = null,
} = {}) {
  if (!Number.isFinite(weight)) return false

  const max = getWeightInputMax(equipment, unit)
  if (weight > max) return false

  if (equipment === 'Bodyweight') {
    return weight >= getWeightInputMin(equipment, unit, bodyweightKg)
  }

  return weight >= 0
}

export function getEffectiveLoadKg(weight, unit = 'kg', equipment, bodyweightKg = null) {
  const externalKg = toKg(Number(weight) || 0, unit)
  if (equipment === 'Bodyweight') {
    const resolvedBodyweightKg = bodyweightKg ?? DEFAULT_BODYWEIGHT_KG
    return Math.max(0, resolvedBodyweightKg + externalKg)
  }
  return Math.max(0, externalKg)
}

export function getSetVolumeKg({
  weight,
  reps,
  unit = 'kg',
  equipment,
  bodyweightKg = null,
}) {
  const resolvedReps = Math.max(0, Number(reps) || 0)
  return getEffectiveLoadKg(weight, unit, equipment, bodyweightKg) * resolvedReps
}

export function getSetVolumeInUnit(set, targetUnit = 'kg') {
  return fromKg(getSetVolumeKg(set), targetUnit)
}

export function getSetTrainingVolumeFactor(set = {}) {
  if (set?.is_warmup || set?.setType === 'warmup' || set?.set_type === 'warmup') return 0
  const setType = set?.setType ?? set?.set_type ?? 'normal'
  if (setType === 'warmup') return 0
  if (setType === 'dropset') return 0.5
  return 1
}

export function getSetTrainingVolumeKg(set) {
  return getSetVolumeKg(set) * getSetTrainingVolumeFactor(set)
}

export function getSetTrainingVolumeInUnit(set, targetUnit = 'kg') {
  return fromKg(getSetTrainingVolumeKg(set), targetUnit)
}
