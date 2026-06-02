import { render } from '@testing-library/react'

import WeightChart from '../../../components/profile/WeightChart.jsx'

function makePoint(date, weight, unit = 'kg') {
  return { id: date, date, weight, unit }
}

describe('WeightChart', () => {
  it('renders the empty-state message when data is missing or empty', () => {
    const { container, rerender } = render(<WeightChart data={[]} />)
    expect(container.textContent).toContain('No weight history yet')
    expect(container.querySelector('svg')).toBeNull()

    rerender(<WeightChart data={null} />)
    expect(container.textContent).toContain('No weight history yet')
  })

  it('renders a single circle and no polyline for one data point', () => {
    const { container } = render(<WeightChart data={[makePoint('2026-05-30', 75)]} />)
    expect(container.querySelector('svg')).toBeTruthy()
    expect(container.querySelectorAll('circle')).toHaveLength(1)
    expect(container.querySelector('polyline')).toBeNull()
    expect(container.querySelector('polygon')).toBeNull()
  })

  it('renders polyline + polygon + multiple circles for multi-point data', () => {
    const data = [
      makePoint('2026-05-26', 75),
      makePoint('2026-05-27', 74.5),
      makePoint('2026-05-28', 74),
      makePoint('2026-05-29', 73.8),
      makePoint('2026-05-30', 73.5),
    ]
    const { container } = render(<WeightChart data={data} />)
    expect(container.querySelector('polyline')).toBeTruthy()
    expect(container.querySelector('polygon')).toBeTruthy()
    expect(container.querySelectorAll('circle')).toHaveLength(5)
  })

  it("uses month+year x-axis labels when span > 365 days (e.g. \"Mar '25\")", () => {
    const data = [
      makePoint('2025-01-01', 80),
      makePoint('2025-04-01', 78),
      makePoint('2025-08-01', 76),
      makePoint('2025-12-01', 74),
      makePoint('2026-06-01', 73),
    ]
    const { container } = render(<WeightChart data={data} />)
    const labels = Array.from(container.querySelectorAll('text'))
      .map(t => t.textContent)
    expect(labels.some(l => /'\d{2}/.test(l))).toBe(true)
  })

  it('uses day+month x-axis labels when span <= 365 days (e.g. "28 Mar")', () => {
    const data = [
      makePoint('2026-05-26', 75),
      makePoint('2026-05-28', 74.5),
      makePoint('2026-05-30', 73.5),
    ]
    const { container } = render(<WeightChart data={data} />)
    const labels = Array.from(container.querySelectorAll('text'))
      .map(t => t.textContent)
    // Day-numeric format like "May 30" (en-US) — month + day, no year tick
    expect(labels.some(l => /^[A-Z][a-z]+ \d+$/.test(l) || /^\d+ [A-Z][a-z]+$/.test(l))).toBe(true)
    // Verify no year-suffix labels appeared (those only show for >365 day spans)
    expect(labels.some(l => /'\d{2}/.test(l))).toBe(false)
  })

  it('renders the goal line + "Goal X" label when showGoal=true and goalWeightKg is set', () => {
    const data = [
      makePoint('2026-05-28', 76),
      makePoint('2026-05-30', 75),
    ]
    const { container } = render(
      <WeightChart data={data} showGoal goalWeightKg={73.5} />
    )
    const labels = Array.from(container.querySelectorAll('text'))
      .map(t => t.textContent)
    expect(labels.some(l => l.startsWith('Goal '))).toBe(true)
  })

  it('does not render the goal line when showGoal=false', () => {
    const data = [makePoint('2026-05-30', 75)]
    const { container } = render(<WeightChart data={data} goalWeightKg={73.5} showGoal={false} />)
    const labels = Array.from(container.querySelectorAll('text'))
      .map(t => t.textContent)
    expect(labels.some(l => l.startsWith('Goal '))).toBe(false)
  })

  it('renders the trend line when showTrend=true with 2+ points', () => {
    const data = [
      makePoint('2026-05-26', 75),
      makePoint('2026-05-27', 74.7),
      makePoint('2026-05-28', 74.4),
      makePoint('2026-05-29', 74.1),
      makePoint('2026-05-30', 73.8),
    ]
    const { container } = render(<WeightChart data={data} showTrend />)
    // Count line elements with a dashed stroke that look like trend lines
    const dashedLines = Array.from(container.querySelectorAll('line'))
      .filter(l => l.getAttribute('stroke-dasharray'))
    expect(dashedLines.length).toBeGreaterThan(0)
  })

  it('renders an "On pace" label when showTrendMode + trend within tolerance', () => {
    const data = [
      makePoint('2026-05-26', 75.0),
      makePoint('2026-05-27', 74.85),
      makePoint('2026-05-28', 74.7),
      makePoint('2026-05-29', 74.55),
      makePoint('2026-05-30', 74.4),
    ]
    const trendModeConfig = {
      rateKgPerWeek: -0.6,
      anchorDate: '2026-05-26',
      anchorWeightKg: 75.0,
    }
    const { container } = render(
      <WeightChart data={data} showTrendMode trendModeConfig={trendModeConfig} />
    )
    const labels = Array.from(container.querySelectorAll('text'))
      .map(t => t.textContent)
    expect(labels.some(l => l === 'On pace' || /ahead|behind/.test(l))).toBe(true)
  })

  it('clamps to default 300px width when ResizeObserver is unavailable / container has 0 width', () => {
    const data = [makePoint('2026-05-30', 75)]
    const { container } = render(<WeightChart data={data} height={130} />)
    const svg = container.querySelector('svg')
    const viewBox = svg.getAttribute('viewBox')
    // viewBox is "0 0 W H" — assert width segment is "300" (fallback)
    expect(viewBox).toBe('0 0 300 130')
  })

  it('applies the kg unit label by default and respects an lbs override', () => {
    const data = [makePoint('2026-05-30', 75)]
    const { container, rerender } = render(<WeightChart data={data} />)
    let labels = Array.from(container.querySelectorAll('text')).map(t => t.textContent)
    expect(labels).toContain('kg')

    rerender(<WeightChart data={data} unit="lbs" />)
    labels = Array.from(container.querySelectorAll('text')).map(t => t.textContent)
    expect(labels).toContain('lbs')
  })
})
