import { act, fireEvent, render, screen } from '@testing-library/react'

import PlateCalculator from '../../components/PlateCalculator.jsx'

function renderPlateCalculator(props = {}) {
  const defaultProps = {
    unit: 'kg',
    equipment: 'Barbell',
    currentWeight: 100,
    onConfirm: vi.fn(),
    onClose: vi.fn(),
  }

  return {
    props: { ...defaultProps, ...props },
    ...render(<PlateCalculator {...defaultProps} {...props} />),
  }
}

describe('PlateCalculator', () => {
  it('renders the kg barbell decomposition and confirms the current total', () => {
    const onConfirm = vi.fn()
    renderPlateCalculator({ currentWeight: 100, onConfirm })

    expect(screen.getByRole('dialog', { name: 'Plate Calculator' })).toBeTruthy()
    expect(screen.getByText('20 + (40 × 2) =')).toBeTruthy()
    expect(screen.getByText('Use 100 kg')).toBeTruthy()

    fireEvent.click(screen.getByText('Use 100 kg'))

    expect(onConfirm).toHaveBeenCalledWith(100)
  })

  it('renders pound barbell loads with pound bars and plates', () => {
    renderPlateCalculator({
      unit: 'lbs',
      equipment: 'Barbell',
      currentWeight: 135,
    })

    expect(screen.getByText('45 + (45 × 2) =')).toBeTruthy()
    expect(screen.getByText('Use 135 lbs')).toBeTruthy()
  })

  it('adds and clears per-side plates for a barbell', () => {
    renderPlateCalculator({ currentWeight: 20 })

    expect(screen.getByText('20 + (0 × 2) =')).toBeTruthy()
    expect(screen.getByText('Use 20 kg')).toBeTruthy()
    expect(screen.getByText('No plates added')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: '5' }))

    expect(screen.getByText('20 + (5 × 2) =')).toBeTruthy()
    expect(screen.getByText('Use 30 kg')).toBeTruthy()

    fireEvent.click(screen.getByText('Clear'))

    expect(screen.getByText('No plates added')).toBeTruthy()
    expect(screen.getByText('Use 20 kg')).toBeTruthy()
  })

  it('uses additive selected plates in bodyweight mode', () => {
    const onConfirm = vi.fn()
    renderPlateCalculator({
      equipment: 'Bodyweight',
      currentWeight: 20,
      onConfirm,
    })

    expect(screen.queryByText('Bar')).toBeNull()
    expect(screen.getByText('Add weight')).toBeTruthy()
    expect(screen.getByText('Selected plates')).toBeTruthy()
    expect(screen.getByText('20 =')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: '5' }))

    expect(screen.getByText('25 =')).toBeTruthy()
    fireEvent.click(screen.getByText('Use 25 kg'))

    expect(onConfirm).toHaveBeenCalledWith(25)
  })

  it('supports custom bar weights when calculating and confirming totals', () => {
    const onConfirm = vi.fn()
    renderPlateCalculator({ currentWeight: 0, onConfirm })

    fireEvent.click(screen.getByText('Custom'))
    fireEvent.change(screen.getByPlaceholderText(/Bar weight/), { target: { value: '12' } })
    fireEvent.click(screen.getByRole('button', { name: '5' }))

    expect(screen.getByText('12 + (5 × 2) =')).toBeTruthy()
    fireEvent.click(screen.getByText('Use 22 kg'))

    expect(onConfirm).toHaveBeenCalledWith(22)
  })

  it('disables confirmation for a custom bar above the maximum', () => {
    renderPlateCalculator({ currentWeight: 0 })

    fireEvent.click(screen.getByText('Custom'))
    fireEvent.change(screen.getByPlaceholderText(/Bar weight/), { target: { value: '21' } })

    expect(screen.getByText('Max 20 kg')).toBeTruthy()
    expect(screen.getByText('Use 0 kg').disabled).toBe(true)
  })

  it('calls onClose after the close animation delay', () => {
    vi.useFakeTimers()
    const onClose = vi.fn()

    try {
      renderPlateCalculator({ onClose })

      fireEvent.click(screen.getByLabelText('Close'))
      act(() => {
        vi.advanceTimersByTime(220)
      })

      expect(onClose).toHaveBeenCalledTimes(1)
    } finally {
      vi.useRealTimers()
    }
  })
})
