import { render, fireEvent } from '@testing-library/react'

import RestTimePicker from '../../components/RestWheelPicker.jsx'

function getButtons(container) {
  const [minsPlus, minsMinus, secsPlus, secsMinus] = container.querySelectorAll('.rtp-btn')
  return { minsPlus, minsMinus, secsPlus, secsMinus }
}

function getDisplay(container) {
  const [minsEl, secsEl] = container.querySelectorAll('.rtp-val')
  return { mins: minsEl.textContent, secs: secsEl.textContent }
}

describe('RestTimePicker', () => {
  it('displays minutes and zero-padded seconds for value=65 (1:05)', () => {
    const { container } = render(<RestTimePicker value={65} onChange={vi.fn()} />)
    const { mins, secs } = getDisplay(container)
    expect(mins).toBe('1')
    expect(secs).toBe('05')
    // labels render in expected positions
    const labels = Array.from(container.querySelectorAll('.rtp-label')).map(el => el.textContent)
    expect(labels).toEqual(['min', 'sec'])
  })

  it('clicking + on minutes increments by 60 and calls onChange', () => {
    const onChange = vi.fn()
    const { container } = render(<RestTimePicker value={60} onChange={onChange} />)
    fireEvent.click(getButtons(container).minsPlus)
    expect(onChange).toHaveBeenCalledWith(120)
  })

  it('clicking − on minutes at value=60 clamps to 0 (not negative)', () => {
    const onChange = vi.fn()
    const { container } = render(<RestTimePicker value={60} onChange={onChange} />)
    fireEvent.click(getButtons(container).minsMinus)
    expect(onChange).toHaveBeenCalledWith(0)
  })

  it('clicking + on seconds from 55s carries to the next minute (1:00)', () => {
    const onChange = vi.fn()
    const { container } = render(<RestTimePicker value={55} onChange={onChange} />)
    fireEvent.click(getButtons(container).secsPlus)
    expect(onChange).toHaveBeenCalledWith(60)
  })

  it('clicking − on seconds from 1:00 borrows from the previous minute (0:55)', () => {
    const onChange = vi.fn()
    const { container } = render(<RestTimePicker value={60} onChange={onChange} />)
    fireEvent.click(getButtons(container).secsMinus)
    expect(onChange).toHaveBeenCalledWith(55)
  })

  it('clicking − on seconds from 1:05 decrements within the same minute (1:00)', () => {
    const onChange = vi.fn()
    const { container } = render(<RestTimePicker value={65} onChange={onChange} />)
    fireEvent.click(getButtons(container).secsMinus)
    expect(onChange).toHaveBeenCalledWith(60)
  })

  it('clicking + on minutes past restSecondsMax (3600) clamps to the cap', () => {
    const onChange = vi.fn()
    const { container } = render(<RestTimePicker value={3595} onChange={onChange} />)
    fireEvent.click(getButtons(container).minsPlus)
    // 59:55 + 1 min = 60:55 → 3655s → clamped to 3600
    expect(onChange).toHaveBeenCalledWith(3600)
  })

  it('seconds display snaps to 5s boundaries (value=62 → 1:00)', () => {
    const { container } = render(<RestTimePicker value={62} onChange={vi.fn()} />)
    const { secs } = getDisplay(container)
    // Math.round((62 % 60) / 5) * 5 = round(0.4)*5 = 0
    expect(secs).toBe('00')
  })

  it('renders exactly 4 control buttons (minsUp, minsDown, secsUp, secsDown)', () => {
    const { container } = render(<RestTimePicker value={0} onChange={vi.fn()} />)
    expect(container.querySelectorAll('.rtp-btn')).toHaveLength(4)
  })
})
