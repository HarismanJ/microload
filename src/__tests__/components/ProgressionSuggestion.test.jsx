import { fireEvent, render, screen } from '@testing-library/react'

import ProgressionSuggestion from '../../components/ProgressionSuggestion.jsx'
import { fromKg, getWeightInputMax, toKg } from '../../lib/liftMath.js'
import { getWeightIncrement } from '../../lib/progressiveOverload.js'

function makeSuggestion(overrides = {}) {
  return {
    action: 'increase_weight',
    activeSetIndex: 0,
    suggestedWeightKg: 102.5,
    suggestedReps: 8,
    reasoning: 'Hit the top of the rep range twice.',
    isBodyweightOnly: false,
    ...overrides,
  }
}

function renderProgression(props = {}) {
  return render(
    <ProgressionSuggestion
      suggestion={makeSuggestion()}
      unitPreference="kg"
      equipment="Barbell"
      onIncrementChange={vi.fn()}
      onStartingWeightChange={vi.fn()}
      {...props}
    />,
  )
}

function roundedDefaultIncrement(equipment, unit) {
  return String(Math.round(fromKg(getWeightIncrement(equipment, unit), unit) * 100) / 100)
}

describe('ProgressionSuggestion', () => {
  it('renders nothing for a null suggestion', () => {
    const { container } = renderProgression({ suggestion: null })

    expect(container.firstChild).toBeNull()
  })

  it('renders nothing for an unknown action', () => {
    const { container } = renderProgression({
      suggestion: makeSuggestion({ action: 'unknown_action' }),
    })

    expect(container.firstChild).toBeNull()
  })

  it('renders increase-weight copy, target, and reasoning popup', () => {
    renderProgression()

    expect(screen.getByText('Set 1 · Microload')).toBeTruthy()
    expect(screen.getByText('102.5 × 8')).toBeTruthy()

    fireEvent.click(screen.getByLabelText('Why this suggestion'))

    expect(screen.getByText('Hit the top of the rep range twice.')).toBeTruthy()
  })

  it('calls onApply with the kg target and reps', () => {
    const onApply = vi.fn()
    renderProgression({ onApply })

    fireEvent.click(screen.getByText('Apply'))

    expect(onApply).toHaveBeenCalledWith(102.5, 8)
  })

  it('converts suggested kg to rounded lbs before applying', () => {
    const onApply = vi.fn()
    const expectedLbs = Math.round(fromKg(102.5, 'lbs') * 10) / 10
    renderProgression({ unitPreference: 'lbs', onApply })

    fireEvent.click(screen.getByText('Apply'))

    expect(onApply).toHaveBeenCalledWith(expectedLbs, 8)
  })

  it('opens settings with default increment values and closes on outside click', () => {
    renderProgression()

    fireEvent.click(screen.getByLabelText('Increment settings'))

    expect(screen.getByText('Settings · Barbell')).toBeTruthy()
    const inputs = screen.getAllByRole('spinbutton')
    expect(inputs).toHaveLength(2)
    expect(inputs[0].value).toBe(roundedDefaultIncrement('Barbell', 'kg'))
    expect(inputs[1].value).toBe('0')

    fireEvent.mouseDown(document.body)

    expect(screen.queryByText('Settings · Barbell')).toBeNull()
  })

  it('saves valid custom increment and starting weight settings', () => {
    const onIncrementChange = vi.fn()
    const onStartingWeightChange = vi.fn()
    renderProgression({
      equipment: 'Dumbbell',
      unitPreference: 'lbs',
      onIncrementChange,
      onStartingWeightChange,
    })

    fireEvent.click(screen.getByLabelText('Increment settings'))
    const [incrementInput, startingWeightInput] = screen.getAllByRole('spinbutton')
    fireEvent.change(incrementInput, { target: { value: '7.5' } })
    fireEvent.change(startingWeightInput, { target: { value: '20' } })
    fireEvent.click(screen.getByText('Save'))

    expect(onIncrementChange).toHaveBeenCalledWith('Dumbbell', toKg(7.5, 'lbs'))
    expect(onStartingWeightChange).toHaveBeenCalledWith('Dumbbell', toKg(20, 'lbs'))
    expect(screen.queryByText('Settings · Dumbbell')).toBeNull()
  })

  it('shows an increment validation error without saving callbacks', () => {
    const onIncrementChange = vi.fn()
    const onStartingWeightChange = vi.fn()
    renderProgression({ onIncrementChange, onStartingWeightChange })

    fireEvent.click(screen.getByLabelText('Increment settings'))
    const [incrementInput] = screen.getAllByRole('spinbutton')
    fireEvent.change(incrementInput, { target: { value: '0.1' } })
    fireEvent.click(screen.getByText('Save'))

    expect(screen.getByText('Min 0.25kg')).toBeTruthy()
    expect(onIncrementChange).not.toHaveBeenCalled()
    expect(onStartingWeightChange).not.toHaveBeenCalled()
  })

  it('shows a starting-weight max error without saving callbacks', () => {
    const onIncrementChange = vi.fn()
    const onStartingWeightChange = vi.fn()
    const maxBodyweightStart = getWeightInputMax('Bodyweight', 'kg')
    renderProgression({
      equipment: 'Bodyweight',
      onIncrementChange,
      onStartingWeightChange,
    })

    fireEvent.click(screen.getByLabelText('Increment settings'))
    const [incrementInput, startingWeightInput] = screen.getAllByRole('spinbutton')
    fireEvent.change(incrementInput, { target: { value: '2.5' } })
    fireEvent.change(startingWeightInput, { target: { value: String(maxBodyweightStart + 1) } })
    fireEvent.click(screen.getByText('Save'))

    expect(screen.getByText(`Max ${maxBodyweightStart}kg`)).toBeTruthy()
    expect(onIncrementChange).not.toHaveBeenCalled()
    expect(onStartingWeightChange).not.toHaveBeenCalled()
  })
})
