import { filterByChartPeriod, getChartPeriodLabel } from '../../lib/chartPeriods.js'

describe('chart period helpers', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-14T12:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('filters one-week data and excludes invalid dates', () => {
    const items = [
      { id: 'recent', date: '2026-05-10T12:00:00.000Z' },
      { id: 'old', date: '2026-05-01T12:00:00.000Z' },
      { id: 'bad', date: 'not-a-date' },
    ]

    expect(filterByChartPeriod(items, '1w', item => item.date)).toEqual([items[0]])
  })

  it('returns all items for all or unknown periods', () => {
    const items = [{ date: 'bad' }, { date: '2026-01-01' }]
    expect(filterByChartPeriod(items, 'all', item => item.date)).toBe(items)
    expect(filterByChartPeriod(items, 'unknown', item => item.date)).toBe(items)
  })

  it('resolves known and fallback labels', () => {
    expect(getChartPeriodLabel('1w')).toBe('1W')
    expect(getChartPeriodLabel('unknown')).toBe('All')
  })

  it('filters month, quarter, and year ranges', () => {
    const items = [
      { id: 'month', date: '2026-04-20T12:00:00.000Z' },
      { id: 'quarter', date: '2026-03-01T12:00:00.000Z' },
      { id: 'year', date: '2025-08-01T12:00:00.000Z' },
      { id: 'older', date: '2024-01-01T12:00:00.000Z' },
    ]

    expect(filterByChartPeriod(items, '1m', item => item.date).map(item => item.id)).toEqual(['month'])
    expect(filterByChartPeriod(items, '3m', item => item.date).map(item => item.id)).toEqual(['month', 'quarter'])
    expect(filterByChartPeriod(items, '1y', item => item.date).map(item => item.id)).toEqual(['month', 'quarter', 'year'])
  })
})
