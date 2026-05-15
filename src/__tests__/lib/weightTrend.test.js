import {
  buildWeightPaceCalorieCoach,
  formatRateForUnit,
  getPresetRate,
} from '../../lib/weightTrend.js'
import { fromKg } from '../../lib/liftMath.js'

function makeLog(date, weight, unit = 'kg') {
  return {
    loggedAt: `${date}T12:00:00.000Z`,
    weight,
    unit,
  }
}

function makeTrendConfig(rateKgPerWeek, anchorDate = '2026-05-01') {
  return {
    rateKgPerWeek,
    anchorDate,
  }
}

function makeWeeklyLogs(weights, startDates = ['2026-05-01', '2026-05-08', '2026-05-15', '2026-05-22']) {
  return weights.map((weight, index) => makeLog(startDates[index], weight))
}

describe('weight trend rate helpers', () => {
  it('looks up preset rates and returns null for unknown presets', () => {
    expect(getPresetRate('moderate_cut')).toBe(-0.5)
    expect(getPresetRate('mystery')).toBeNull()
  })

  it('formats signed rates for kg and lbs', () => {
    expect(formatRateForUnit(-0.5, 'kg')).toBe('−0.5 kg/wk')
    expect(formatRateForUnit(0.25, 'lbs')).toBe('+0.6 lbs/wk')
    expect(formatRateForUnit(0, 'kg')).toBe('±0 kg/wk')
  })
})

describe('buildWeightPaceCalorieCoach setup states', () => {
  it('returns no_pace when pace config is missing or invalid', () => {
    expect(buildWeightPaceCalorieCoach()).toMatchObject({
      status: 'no_pace',
      tone: 'neutral',
    })

    expect(buildWeightPaceCalorieCoach({
      trendModeConfig: makeTrendConfig('fast'),
    })).toMatchObject({
      status: 'no_pace',
      tone: 'neutral',
    })
  })

  it('requires at least four valid weigh-ins', () => {
    const result = buildWeightPaceCalorieCoach({
      trendModeConfig: makeTrendConfig(-0.5),
      logs: makeWeeklyLogs([80, 79.5, 79]),
    })

    expect(result).toMatchObject({
      status: 'needs_data',
      weighInCount: 3,
      targetRateKgPerWeek: -0.5,
    })
    expect(result.spanDays).toBe(14)
  })

  it('requires weigh-ins to span at least seven days', () => {
    const result = buildWeightPaceCalorieCoach({
      trendModeConfig: makeTrendConfig(-0.5),
      logs: [
        makeLog('2026-05-01', 80),
        makeLog('2026-05-02', 79.9),
        makeLog('2026-05-03', 79.8),
        makeLog('2026-05-04', 79.7),
      ],
    })

    expect(result).toMatchObject({
      status: 'needs_data',
      weighInCount: 4,
    })
    expect(result.spanDays).toBe(3)
  })
})

describe('buildWeightPaceCalorieCoach trend outcomes', () => {
  it('reports on_pace when the trend matches the target rate', () => {
    const result = buildWeightPaceCalorieCoach({
      trendModeConfig: makeTrendConfig(-0.5),
      dailyCalorieGoal: 2200.4,
      logs: makeWeeklyLogs([80, 79.5, 79, 78.5]),
    })

    expect(result).toMatchObject({
      status: 'on_pace',
      tone: 'success',
      adjustmentKcal: 0,
      recommendedCalories: 2200,
      weighInCount: 4,
      spanDays: 21,
    })
    expect(result.actualRateKgPerWeek).toBeCloseTo(-0.5)
    expect(result.rateGapKgPerWeek).toBeCloseTo(0)
  })

  it('treats a small rate gap as on pace', () => {
    const result = buildWeightPaceCalorieCoach({
      trendModeConfig: makeTrendConfig(-0.5),
      dailyCalorieGoal: 2200,
      logs: makeWeeklyLogs([80, 79.58, 79.16, 78.74]),
    })

    expect(result).toMatchObject({
      status: 'on_pace',
      adjustmentKcal: 0,
      recommendedCalories: 2200,
    })
    expect(Math.abs(result.rateGapKgPerWeek)).toBeLessThan(0.1)
  })

  it('recommends a deficit when a cut is losing too slowly', () => {
    const result = buildWeightPaceCalorieCoach({
      trendModeConfig: makeTrendConfig(-0.5),
      dailyCalorieGoal: 2000,
      logs: makeWeeklyLogs([80, 79.7, 79.4, 79.1]),
    })

    expect(result).toMatchObject({
      status: 'deficit',
      tone: 'deficit',
      adjustmentKcal: -225,
      recommendedCalories: 1775,
    })
    expect(result.instruction).toContain('Reduce by about 225 kcal/day')
  })

  it('recommends a surplus when a bulk is gaining too slowly', () => {
    const result = buildWeightPaceCalorieCoach({
      trendModeConfig: makeTrendConfig(0.5),
      dailyCalorieGoal: 2000,
      logs: makeWeeklyLogs([80, 80.35, 80.7, 81.05]),
    })

    expect(result).toMatchObject({
      status: 'surplus',
      tone: 'surplus',
      adjustmentKcal: 175,
      recommendedCalories: 2175,
    })
    expect(result.instruction).toContain('Add about 175 kcal/day')
  })

  it('caps large daily adjustments at 250 kcal in magnitude', () => {
    const result = buildWeightPaceCalorieCoach({
      trendModeConfig: makeTrendConfig(-0.75),
      dailyCalorieGoal: 2000,
      logs: makeWeeklyLogs([80, 80, 80, 80]),
    })

    expect(result).toMatchObject({
      status: 'deficit',
      adjustmentKcal: -250,
      recommendedCalories: 1750,
    })
  })
})

describe('buildWeightPaceCalorieCoach log normalization', () => {
  it('ignores pre-anchor and invalid logs, and converts pound logs before regression', () => {
    const result = buildWeightPaceCalorieCoach({
      trendModeConfig: makeTrendConfig(-0.5),
      dailyCalorieGoal: 2200,
      logs: [
        makeLog('2026-04-24', 200),
        { loggedAt: 'not-a-date', weight: 80, unit: 'kg' },
        makeLog('2026-05-01', fromKg(80, 'lbs'), 'lbs'),
        makeLog('2026-05-08', fromKg(79.5, 'lbs'), 'lbs'),
        makeLog('2026-05-15', fromKg(79, 'lbs'), 'lbs'),
        makeLog('2026-05-22', fromKg(78.5, 'lbs'), 'lbs'),
        makeLog('2026-05-29', 'heavy'),
      ],
    })

    expect(result).toMatchObject({
      status: 'on_pace',
      weighInCount: 4,
      adjustmentKcal: 0,
    })
    expect(result.actualRateKgPerWeek).toBeCloseTo(-0.5)
  })
})
