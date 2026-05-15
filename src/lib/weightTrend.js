import { convertWeight } from './liftMath'

export const WEIGHT_TREND_PRESETS = [
  { key: 'aggressive_cut',  label: 'Aggressive Cut',  rateKgPerWeek: -0.75 },
  { key: 'moderate_cut',    label: 'Moderate Cut',    rateKgPerWeek: -0.50 },
  { key: 'slow_cut',        label: 'Slow Cut',        rateKgPerWeek: -0.25 },
  { key: 'maintenance',     label: 'Maintenance',     rateKgPerWeek:  0    },
  { key: 'lean_bulk',       label: 'Lean Bulk',       rateKgPerWeek: +0.25 },
  { key: 'aggressive_bulk', label: 'Aggressive Bulk', rateKgPerWeek: +0.50 },
  { key: 'custom',          label: 'Custom',          rateKgPerWeek:  null },
]

export function getPresetRate(key) {
  return WEIGHT_TREND_PRESETS.find(p => p.key === key)?.rateKgPerWeek ?? null
}

const KG_TO_LBS = 2.20462

export function formatRateForUnit(rateKgPerWeek, unit) {
  if (rateKgPerWeek === null) return null
  const rate = unit === 'lbs' ? rateKgPerWeek * KG_TO_LBS : rateKgPerWeek
  const decimals = unit === 'lbs' ? 1 : 2
  const formatted = Math.abs(rate).toFixed(decimals).replace(/\.?0+$/, '')
  const sign = rate > 0 ? '+' : rate < 0 ? '−' : '±'
  return `${sign}${formatted} ${unit}/wk`
}

const KCAL_PER_KG = 7700
const MS_PER_DAY = 86400000
const MIN_COACH_WEIGH_INS = 4
const MIN_COACH_SPAN_DAYS = 7
const RATE_DEAD_ZONE_KG_PER_WEEK = 0.1
const MAX_DAILY_CALORIE_ADJUSTMENT = 250
const CALORIE_ADJUSTMENT_STEP = 25

function getWeightLogTimeMs(log) {
  const value = log?.loggedAt || log?.logged_at || (log?.date ? `${log.date}T12:00:00` : null)
  if (!value) return null
  const ms = new Date(value).getTime()
  return Number.isFinite(ms) ? ms : null
}

function linearRegression(points) {
  const n = points.length
  if (n < 2) return null

  let sx = 0
  let sy = 0
  let sxy = 0
  let sx2 = 0

  for (const { x, y } of points) {
    sx += x
    sy += y
    sxy += x * y
    sx2 += x * x
  }

  const denom = n * sx2 - sx * sx
  if (denom === 0) return null

  const slope = (n * sxy - sx * sy) / denom
  return {
    slope,
    intercept: (sy - slope * sx) / n,
  }
}

function roundToStep(value, step) {
  return Math.round(value / step) * step
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function normalizeWeightLogsSinceAnchor(logs, anchorDate) {
  const anchorMs = anchorDate ? new Date(`${anchorDate}T00:00:00`).getTime() : null

  return (logs || [])
    .map(log => {
      const ms = getWeightLogTimeMs(log)
      const weight = Number(log?.weight)
      if (!Number.isFinite(ms) || !Number.isFinite(weight)) return null
      return {
        ms,
        weightKg: convertWeight(weight, log?.unit || 'kg', 'kg'),
      }
    })
    .filter(log => log && Number.isFinite(log.weightKg) && (!Number.isFinite(anchorMs) || log.ms >= anchorMs))
    .sort((a, b) => a.ms - b.ms)
}

export function buildWeightPaceCalorieCoach({
  logs = [],
  trendModeConfig = null,
  dailyCalorieGoal = null,
} = {}) {
  if (!trendModeConfig) {
    return {
      status: 'no_pace',
      tone: 'neutral',
      title: 'Pace Coach',
      summary: 'Set a pace to get calorie guidance from your weight trend.',
      instruction: '',
    }
  }

  const targetRateKgPerWeek = Number(trendModeConfig.rateKgPerWeek)
  if (!Number.isFinite(targetRateKgPerWeek)) {
    return {
      status: 'no_pace',
      tone: 'neutral',
      title: 'Pace Coach',
      summary: 'Set a pace to get calorie guidance from your weight trend.',
      instruction: '',
    }
  }

  const normalizedLogs = normalizeWeightLogsSinceAnchor(logs, trendModeConfig.anchorDate)
  const first = normalizedLogs[0]
  const last = normalizedLogs.at(-1)
  const spanDays = first && last ? (last.ms - first.ms) / MS_PER_DAY : 0

  if (normalizedLogs.length < MIN_COACH_WEIGH_INS || spanDays < MIN_COACH_SPAN_DAYS) {
    return {
      status: 'needs_data',
      tone: 'neutral',
      title: 'Pace Coach',
      summary: 'Keep logging weigh-ins to calibrate your calorie target.',
      instruction: `Needs ${MIN_COACH_WEIGH_INS}+ weigh-ins across at least ${MIN_COACH_SPAN_DAYS} days.`,
      targetRateKgPerWeek,
      weighInCount: normalizedLogs.length,
      spanDays,
    }
  }

  const startMs = first.ms
  const points = normalizedLogs.map(log => ({
    x: (log.ms - startMs) / MS_PER_DAY,
    y: log.weightKg,
  }))
  const regression = linearRegression(points)
  if (!regression || !Number.isFinite(regression.slope)) {
    return {
      status: 'needs_data',
      tone: 'neutral',
      title: 'Pace Coach',
      summary: 'Keep logging weigh-ins to calibrate your calorie target.',
      instruction: 'Needs more spread between weigh-ins.',
      targetRateKgPerWeek,
      weighInCount: normalizedLogs.length,
      spanDays,
    }
  }

  const actualRateKgPerWeek = regression.slope * 7
  const rateGapKgPerWeek = targetRateKgPerWeek - actualRateKgPerWeek
  const rawDailyAdjustment = (rateGapKgPerWeek * KCAL_PER_KG) / 7

  if (Math.abs(rateGapKgPerWeek) < RATE_DEAD_ZONE_KG_PER_WEEK || Math.abs(rawDailyAdjustment) < CALORIE_ADJUSTMENT_STEP) {
    return {
      status: 'on_pace',
      tone: 'success',
      title: 'Pace Coach',
      summary: 'Your trend is close to your pace line.',
      instruction: 'Keep your daily calories steady this week.',
      targetRateKgPerWeek,
      actualRateKgPerWeek,
      rateGapKgPerWeek,
      adjustmentKcal: 0,
      recommendedCalories: Number.isFinite(Number(dailyCalorieGoal)) ? Math.round(Number(dailyCalorieGoal)) : null,
      weighInCount: normalizedLogs.length,
      spanDays,
    }
  }

  const adjustmentKcal = roundToStep(
    clamp(rawDailyAdjustment, -MAX_DAILY_CALORIE_ADJUSTMENT, MAX_DAILY_CALORIE_ADJUSTMENT),
    CALORIE_ADJUSTMENT_STEP
  )
  const calorieGoal = Number(dailyCalorieGoal)
  const recommendedCalories = Number.isFinite(calorieGoal) && calorieGoal > 0
    ? Math.max(1, Math.round(calorieGoal + adjustmentKcal))
    : null
  const isSurplus = adjustmentKcal > 0

  return {
    status: isSurplus ? 'surplus' : 'deficit',
    tone: isSurplus ? 'surplus' : 'deficit',
    title: 'Pace Coach',
    summary: 'Your trend is drifting from your pace line.',
    instruction: isSurplus
      ? `Add about ${Math.abs(adjustmentKcal)} kcal/day this week.`
      : `Reduce by about ${Math.abs(adjustmentKcal)} kcal/day this week.`,
    targetRateKgPerWeek,
    actualRateKgPerWeek,
    rateGapKgPerWeek,
    adjustmentKcal,
    recommendedCalories,
    weighInCount: normalizedLogs.length,
    spanDays,
  }
}
