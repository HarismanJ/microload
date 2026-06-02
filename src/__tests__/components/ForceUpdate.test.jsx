import { render, fireEvent } from '@testing-library/react'

import ForceUpdate from '../../components/ForceUpdate.jsx'
import { openAppStore } from '../../lib/appVersion'

vi.mock('../../lib/appVersion', () => ({
  openAppStore: vi.fn(),
}))

describe('ForceUpdate', () => {
  it('renders the title, body text, and CTA button', () => {
    const { container, getByText } = render(<ForceUpdate />)
    expect(getByText('Update Required')).toBeTruthy()
    expect(container.textContent).toContain('A newer version of microload')
    expect(getByText('Update Now')).toBeTruthy()
  })

  it('renders the 5-bar logo SVG (regression guard for visual identity)', () => {
    const { container } = render(<ForceUpdate />)
    const svg = container.querySelector('svg')
    expect(svg).toBeTruthy()
    expect(svg.querySelectorAll('rect')).toHaveLength(5)
  })

  it('clicking the CTA calls openAppStore exactly once', () => {
    const { getByText } = render(<ForceUpdate />)
    fireEvent.click(getByText('Update Now'))
    expect(openAppStore).toHaveBeenCalledTimes(1)
  })

  it('CTA is a button element (focusable + keyboard accessible)', () => {
    const { getByText } = render(<ForceUpdate />)
    expect(getByText('Update Now').tagName).toBe('BUTTON')
  })
})
