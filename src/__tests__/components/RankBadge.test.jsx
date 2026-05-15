import { render } from '@testing-library/react'

import RankBadge from '../../components/RankBadge.jsx'
import { TIER_COLORS, TIER_GROUPS } from '../../lib/strengthStandards.js'

function svgUsesColor(svg, color) {
  return Array.from(svg.querySelectorAll('*')).some((node) => {
    const fill = node.getAttribute('fill') || ''
    const stroke = node.getAttribute('stroke') || ''
    return fill.includes(color) || stroke.includes(color)
  })
}

describe('RankBadge', () => {
  it('renders an svg badge for every supported tier group', () => {
    for (const tier of ['Unranked', ...TIER_GROUPS]) {
      const { container, unmount } = render(<RankBadge tier={tier} />)
      const wrapper = container.firstChild
      const svg = container.querySelector('svg')

      expect(wrapper).toBeTruthy()
      expect(svg).toBeTruthy()
      expect(svg.getAttribute('viewBox')).toBe('0 0 48 48')

      unmount()
    }
  })

  it('applies the default and custom size styles to the wrapper', () => {
    const { container, rerender } = render(<RankBadge tier="Gold" />)

    expect(container.firstChild.style.width).toBe('44px')
    expect(container.firstChild.style.height).toBe('44px')
    expect(container.firstChild.style.flexShrink).toBe('0')

    rerender(<RankBadge tier="Gold" size={18} />)

    expect(container.firstChild.style.width).toBe('18px')
    expect(container.firstChild.style.height).toBe('18px')
    expect(container.firstChild.style.flexShrink).toBe('0')
  })

  it('passes tier colors into representative badge svgs', () => {
    for (const tier of ['Unranked', 'Gold', 'Elite']) {
      const { container, unmount } = render(<RankBadge tier={tier} />)
      const svg = container.querySelector('svg')

      expect(svgUsesColor(svg, TIER_COLORS[tier])).toBe(true)

      unmount()
    }
  })

  it('renders nothing for unsupported tier strings', () => {
    const { container, rerender } = render(<RankBadge tier="Unknown" />)

    expect(container.firstChild).toBeNull()

    rerender(<RankBadge tier="Gold II" />)

    expect(container.firstChild).toBeNull()
  })
})
