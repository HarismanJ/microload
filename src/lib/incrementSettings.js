const STORAGE_KEY = 'liftlog_increments'
const STARTING_WEIGHT_KEY = 'liftlog_starting_weights'

export function getCustomIncrements() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') } catch { return {} }
}

export function getCustomIncrementKg(exerciseId) {
  const val = getCustomIncrements()[exerciseId]
  return typeof val === 'number' && val > 0 ? val : null
}

export function setCustomIncrementKg(exerciseId, incrementKg) {
  const increments = getCustomIncrements()
  if (incrementKg == null) {
    delete increments[exerciseId]
  } else {
    increments[exerciseId] = incrementKg
  }
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(increments)) } catch { /* ignore */ }
}

export function getCustomStartingWeights() {
  try { return JSON.parse(localStorage.getItem(STARTING_WEIGHT_KEY) || '{}') } catch { return {} }
}

export function setCustomStartingWeightKg(exerciseId, weightKg) {
  const weights = getCustomStartingWeights()
  if (weightKg == null) {
    delete weights[exerciseId]
  } else {
    weights[exerciseId] = weightKg
  }
  try { localStorage.setItem(STARTING_WEIGHT_KEY, JSON.stringify(weights)) } catch { /* ignore */ }
}
