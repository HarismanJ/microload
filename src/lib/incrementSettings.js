const STORAGE_KEY = 'liftlog_increments'
const STARTING_WEIGHT_KEY = 'liftlog_starting_weights'

export function getCustomIncrements() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') } catch { return {} }
}

export function getCustomIncrementKg(equipment) {
  const val = getCustomIncrements()[equipment]
  return typeof val === 'number' && val > 0 ? val : null
}

export function setCustomIncrementKg(equipment, incrementKg) {
  const increments = getCustomIncrements()
  if (incrementKg == null) {
    delete increments[equipment]
  } else {
    increments[equipment] = incrementKg
  }
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(increments)) } catch { /* ignore */ }
}

export function getCustomStartingWeights() {
  try { return JSON.parse(localStorage.getItem(STARTING_WEIGHT_KEY) || '{}') } catch { return {} }
}

export function setCustomStartingWeightKg(equipment, weightKg) {
  const weights = getCustomStartingWeights()
  if (weightKg == null) {
    delete weights[equipment]
  } else {
    weights[equipment] = weightKg
  }
  try { localStorage.setItem(STARTING_WEIGHT_KEY, JSON.stringify(weights)) } catch { /* ignore */ }
}
