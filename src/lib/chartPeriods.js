export const CHART_PERIOD_OPTIONS = [
  { value: '1w', label: '1W', days: 7 },
  { value: '1m', label: '1M', days: 30 },
  { value: '3m', label: '3M', days: 90 },
  { value: '1y', label: '1Y', days: 365 },
  { value: 'all', label: 'All', days: null },
]

export const DEFAULT_HOME_WEIGHT_PERIOD = '1m'

const CHART_PERIOD_DAYS = Object.fromEntries(
  CHART_PERIOD_OPTIONS
    .filter(option => Number.isFinite(option.days))
    .map(option => [option.value, option.days])
)

export function getChartPeriodLabel(period) {
  return CHART_PERIOD_OPTIONS.find(option => option.value === period)?.label || 'All'
}

export function filterByChartPeriod(items = [], period = 'all', getDate) {
  if (period === 'all') return items

  const maxAgeDays = CHART_PERIOD_DAYS[period]
  if (!Number.isFinite(maxAgeDays)) return items

  const now = Date.now()

  return items.filter(item => {
    const rawDate = getDate(item)
    const date = rawDate instanceof Date ? rawDate : new Date(rawDate)
    if (Number.isNaN(date.getTime())) return false
    return (now - date.getTime()) / 86400000 <= maxAgeDays
  })
}
