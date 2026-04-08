import {
  LEGACY_STRENGTH_STANDARD_ALIASES,
  STRENGTHLEVEL_EXERCISES,
} from '../data/strengthLevelCatalog'

export const TIER_GROUPS = ['Iron', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Master', 'Grandmaster', 'Elite']
export const TIERS = TIER_GROUPS.flatMap(group => [`${group} I`, `${group} II`, `${group} III`])

export const TIER_COLORS = {
  Unranked: '#52525b',
  Iron: '#71717a',
  Bronze: '#c2773a',
  Silver: '#94a3b8',
  Gold: '#f0b429',
  Platinum: '#2dd4bf',
  Diamond: '#1d4ed8',
  Master: '#059669',
  Grandmaster: '#7c3aed',
  Elite: '#dc2626',
}

const FEMALE_STRENGTH_RATIO = 0.65

export const tierGroup = (tier) => tier.split(' ')[0]
export const tierColor = (tier) => TIER_COLORS[tierGroup(tier)]

function round(value, digits = 4) {
  const rounded = Number(value.toFixed(digits))
  return Object.is(rounded, -0) ? 0 : rounded
}

function midpoint(a, b) {
  return round((a + b) / 2)
}

// The workbook gives us 5 source ranks: Beginner, Novice, Intermediate,
// Advanced, and Elite. LiftLog still uses 9 main rank groups
// (Iron -> Elite), and `expandAnchors()` below splits each group into
// I / II / III for the final 27-tier ladder.
function levelsToAnchors(levels = []) {
  const [beginner, novice, intermediate, advanced, elite] = levels.map(Number)
  return [
    0,
    round(beginner),
    midpoint(beginner, novice),
    round(novice),
    midpoint(novice, intermediate),
    round(intermediate),
    midpoint(intermediate, advanced),
    round(advanced),
    midpoint(advanced, elite),
    round(elite),
  ]
}

function scaleAnchors(anchors, factor) {
  return anchors.map((value, index) => index === 0 ? 0 : round(value * factor))
}

function scaleBodyweightAnchors(anchors, factor) {
  return anchors.map((value, index) => index === 0 ? 0 : round(1 + (value - 1) * factor))
}

function buildCanonicalAnchors(gender) {
  const entries = {}

  for (const exercise of STRENGTHLEVEL_EXERCISES) {
    const maleAnchors = levelsToAnchors(exercise.maleLevels)
    entries[exercise.name] = gender === 'female'
      ? exercise.equipment === 'Bodyweight'
        ? scaleBodyweightAnchors(maleAnchors, FEMALE_STRENGTH_RATIO)
        : scaleAnchors(maleAnchors, FEMALE_STRENGTH_RATIO)
      : maleAnchors
  }

  return entries
}

function applyLegacyAliases(anchorMap) {
  const withAliases = { ...anchorMap }

  for (const [legacyName, canonicalName] of Object.entries(LEGACY_STRENGTH_STANDARD_ALIASES)) {
    if (!withAliases[legacyName] && anchorMap[canonicalName]) {
      withAliases[legacyName] = anchorMap[canonicalName]
    }
  }

  return withAliases
}

export const ANCHORS = {
  male: applyLegacyAliases(buildCanonicalAnchors('male')),
  female: applyLegacyAliases(buildCanonicalAnchors('female')),
}

export function expandAnchors(anchors) {
  const thresholds = []
  for (let i = 0; i < 9; i += 1) {
    const low = anchors[i]
    const step = (anchors[i + 1] - low) / 3
    thresholds.push(round(low, 3))
    thresholds.push(round(low + step, 3))
    thresholds.push(round(low + step * 2, 3))
  }
  return thresholds
}

export function getTierIdx(ratio, thresholds) {
  let idx = 0
  for (let i = 0; i < thresholds.length; i += 1) {
    if (ratio >= thresholds[i]) idx = i
  }
  return idx
}

export function getProgress(ratio, thresholds, tierIdx) {
  if (tierIdx >= TIERS.length - 1) return 100

  const low = thresholds[tierIdx]
  const high = thresholds[tierIdx + 1]
  if (high <= low) return 100

  return Math.min(100, Math.max(0, Math.round(((ratio - low) / (high - low)) * 100)))
}

// Inverse of calculateORM: weight needed at `reps` to hit `targetOrm`
export function weightForOrm(targetOrm, reps) {
  if (reps === 1) return targetOrm
  const factor = (36 / (37 - reps) + 1 + reps / 30) / 2
  return Math.round((targetOrm / factor) * 2) / 2
}
