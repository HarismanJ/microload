import { render } from '@testing-library/react'

import TierProgressBar from '../../components/TierProgressBar.jsx'

describe('TierProgressBar', () => {
  it('renders nothing when currentTier is falsy', () => {
    const { container } = render(<TierProgressBar progress={50} color="#fff" />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when currentTier is an empty string', () => {
    const { container } = render(<TierProgressBar currentTier="" progress={50} color="#fff" />)
    expect(container.firstChild).toBeNull()
  })

  it('renders the full row with badges, fill, notch, and percentage for a mid-tier progress', () => {
    const { container } = render(
      <TierProgressBar
        currentTier="Bronze I"
        nextTier="Bronze II"
        progress={50}
        color="#ff0000"
      />
    )

    const row = container.querySelector('.tier-progress-row')
    expect(row).toBeTruthy()
    expect(row.style.getPropertyValue('--tier-color')).toBe('#ff0000')

    const badges = container.querySelectorAll('.tier-progress-badge')
    expect(badges).toHaveLength(2)
    // Each badge should contain a RankBadge svg
    expect(badges[0].querySelector('svg')).toBeTruthy()
    expect(badges[1].querySelector('svg')).toBeTruthy()

    const fill = container.querySelector('.tier-progress-fill')
    expect(fill).toBeTruthy()
    expect(fill.style.width).toBe('50%')

    const notch = container.querySelector('.tier-progress-notch')
    expect(notch).toBeTruthy()
    expect(notch.style.left).toBe('50%')

    expect(container.querySelector('.tier-progress-pct').textContent).toBe('50%')
    expect(container.querySelector('.tier-progress-max')).toBeNull()
  })

  it('omits the notch when progress is 0', () => {
    const { container } = render(
      <TierProgressBar currentTier="Bronze I" nextTier="Bronze II" progress={0} color="#fff" />
    )

    expect(container.querySelector('.tier-progress-notch')).toBeNull()
    expect(container.querySelector('.tier-progress-fill').style.width).toBe('0%')
    expect(container.querySelector('.tier-progress-pct').textContent).toBe('0%')
  })

  it('omits the notch when progress is 100 (but not isMax)', () => {
    const { container } = render(
      <TierProgressBar currentTier="Bronze I" nextTier="Bronze II" progress={100} color="#fff" />
    )

    expect(container.querySelector('.tier-progress-notch')).toBeNull()
    expect(container.querySelector('.tier-progress-fill').style.width).toBe('100%')
    expect(container.querySelector('.tier-progress-pct').textContent).toBe('100%')
  })

  it('clamps negative progress to 0 and omits the notch', () => {
    const { container } = render(
      <TierProgressBar currentTier="Bronze I" nextTier="Bronze II" progress={-25} color="#fff" />
    )

    expect(container.querySelector('.tier-progress-fill').style.width).toBe('0%')
    expect(container.querySelector('.tier-progress-notch')).toBeNull()
    expect(container.querySelector('.tier-progress-pct').textContent).toBe('0%')
  })

  it('clamps overshoot progress to 100 and omits the notch', () => {
    const { container } = render(
      <TierProgressBar currentTier="Bronze I" nextTier="Bronze II" progress={250} color="#fff" />
    )

    expect(container.querySelector('.tier-progress-fill').style.width).toBe('100%')
    expect(container.querySelector('.tier-progress-notch')).toBeNull()
    expect(container.querySelector('.tier-progress-pct').textContent).toBe('100%')
  })

  it('rounds fractional progress values', () => {
    const { container } = render(
      <TierProgressBar currentTier="Bronze I" nextTier="Bronze II" progress={49.7} color="#fff" />
    )

    expect(container.querySelector('.tier-progress-fill').style.width).toBe('50%')
    expect(container.querySelector('.tier-progress-pct').textContent).toBe('50%')
  })

  it('defaults progress to 0 when undefined', () => {
    const { container } = render(
      <TierProgressBar currentTier="Bronze I" nextTier="Bronze II" color="#fff" />
    )

    expect(container.querySelector('.tier-progress-fill').style.width).toBe('0%')
    expect(container.querySelector('.tier-progress-notch')).toBeNull()
    expect(container.querySelector('.tier-progress-pct').textContent).toBe('0%')
  })

  it('renders the MAX pill instead of the next-tier badge when isMax is true', () => {
    const { container } = render(
      <TierProgressBar currentTier="Elite I" progress={50} color="#fff" isMax />
    )

    const max = container.querySelector('.tier-progress-max')
    expect(max).toBeTruthy()
    expect(max.textContent).toBe('MAX')
    // Only the current-tier badge is rendered when isMax is true
    expect(container.querySelectorAll('.tier-progress-badge')).toHaveLength(1)
    // No notch when isMax
    expect(container.querySelector('.tier-progress-notch')).toBeNull()
    // Percentage label is forced to 100%
    expect(container.querySelector('.tier-progress-pct').textContent).toBe('100%')
    // Fill is 100% regardless of the progress prop
    expect(container.querySelector('.tier-progress-fill').style.width).toBe('100%')
  })

  it('renders an empty next-tier badge slot when nextTier is omitted and isMax is false', () => {
    const { container } = render(
      <TierProgressBar currentTier="Bronze I" progress={50} color="#fff" />
    )

    const badges = container.querySelectorAll('.tier-progress-badge')
    expect(badges).toHaveLength(2)
    // Current-tier badge has an svg child; the empty next-tier slot does not.
    expect(badges[0].querySelector('svg')).toBeTruthy()
    expect(badges[1].querySelector('svg')).toBeNull()
  })

  it('respects a custom badgeSize on both rendered RankBadges', () => {
    const { container } = render(
      <TierProgressBar
        currentTier="Bronze I"
        nextTier="Bronze II"
        progress={50}
        color="#fff"
        badgeSize={24}
      />
    )

    const badgeWrappers = container.querySelectorAll('.tier-progress-badge')
    // Both inner svg wrappers should be sized to 24
    expect(badgeWrappers[0].firstChild.style.width).toBe('24px')
    expect(badgeWrappers[0].firstChild.style.height).toBe('24px')
    expect(badgeWrappers[1].firstChild.style.width).toBe('24px')
    expect(badgeWrappers[1].firstChild.style.height).toBe('24px')
  })
})
