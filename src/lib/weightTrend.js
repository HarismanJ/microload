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
