export const PLATE_SIZES_KG  = [1.25, 2.5, 5, 10, 20, 25]
export const PLATE_SIZES_LBS = [2.5, 5, 10, 25, 35, 45]

export const BAR_OPTIONS_KG = [
  { label: 'Standard', weight: 20 },
  { label: "Women's",  weight: 15 },
  { label: 'EZ Bar',   weight: 10 },
]

export const BAR_OPTIONS_LBS = [
  { label: 'Standard', weight: 45 },
  { label: "Women's",  weight: 35 },
  { label: 'EZ Bar',   weight: 25 },
]

// Equipment types that use plates and should show the plate icon
export const PLATE_EQUIPMENT = new Set(['Barbell', 'EZ Bar', 'Smith Machine', 'Plate Loaded'])

// Default bar option index per equipment type
export const DEFAULT_BAR_INDEX = {
  'Barbell':       0,
  'Smith Machine': 0,
  'EZ Bar':        2,
  'Plate Loaded':  0,
}

/** Total weight = bar + 2 × sum of plates per side */
export function platesToWeight(barWeight, platesPerSide) {
  return barWeight + 2 * platesPerSide.reduce((s, p) => s + p, 0)
}

/**
 * Snap a target weight (in kg) to the nearest achievable plate combination
 * for the given equipment and unit preference.
 *
 * Strategy:
 *   1. Convert target from kg to display unit.
 *   2. Use the default bar for this equipment.
 *   3. Find the per-side plate load = (target - bar) / 2.
 *   4. Round per-side load DOWN to the nearest achievable combination
 *      (largest plates first, greedy). "Down" ensures we never suggest
 *      more weight than intended when the target sits between combinations.
 *   5. Return bar + 2 × snapped per-side as kg.
 *
 * Returns the original targetKg unchanged if equipment is not plate-based
 * or if the target is below the bare bar weight.
 */
export function snapToPlates(targetKg, unit, equipment) {
  if (!PLATE_EQUIPMENT.has(equipment)) return targetKg

  const barOptions = unit === 'lbs' ? BAR_OPTIONS_LBS : BAR_OPTIONS_KG
  const plateSizes = unit === 'lbs' ? PLATE_SIZES_LBS : PLATE_SIZES_KG
  const LBS_TO_KG = 0.453592

  // Convert target to display unit for snapping
  const targetDisplay = unit === 'lbs' ? targetKg / LBS_TO_KG : targetKg

  const barIdx = DEFAULT_BAR_INDEX[equipment] ?? 0
  const barWeight = barOptions[barIdx].weight

  if (targetDisplay <= barWeight) return unit === 'lbs' ? barWeight * LBS_TO_KG : barWeight

  const sorted = [...plateSizes].sort((a, b) => b - a)
  const smallest = sorted[sorted.length - 1]
  let remaining = (targetDisplay - barWeight) / 2
  let perSide = 0

  for (const p of sorted) {
    while (remaining >= p) {
      perSide += p
      remaining -= p
    }
  }

  // Round up: if any remainder left, add the smallest plate per side
  if (remaining > 0.001) perSide += smallest

  const snappedDisplay = barWeight + 2 * perSide
  return unit === 'lbs' ? snappedDisplay * LBS_TO_KG : snappedDisplay
}

/**
 * Greedy decomposition of totalWeight into a bar + plates per side.
 * Returns { barIndex, platesPerSide: number[] } sorted largest-first.
 * If totalWeight is less than the smallest bar, returns barIndex 0 with no plates.
 */
export function weightToPlates(totalWeight, unit, equipment = 'Barbell') {
  const barOptions  = unit === 'lbs' ? BAR_OPTIONS_LBS  : BAR_OPTIONS_KG
  const plateSizes  = unit === 'lbs' ? PLATE_SIZES_LBS  : PLATE_SIZES_KG
  const defaultIdx  = DEFAULT_BAR_INDEX[equipment] ?? 0

  // Pick the default bar for this equipment; fall back to 0 if total is too small
  const barIndex = totalWeight >= barOptions[defaultIdx].weight ? defaultIdx : 0
  const barWeight = barOptions[barIndex].weight
  const tolerance = 0.01

  let remaining = (totalWeight - barWeight) / 2
  if (remaining < 0) return { barIndex, platesPerSide: [] }

  const plates = []
  const sorted = [...plateSizes].sort((a, b) => b - a)
  for (const p of sorted) {
    while (remaining >= p - tolerance) {
      plates.push(p)
      remaining -= p
    }
  }

  return { barIndex, platesPerSide: plates }
}
