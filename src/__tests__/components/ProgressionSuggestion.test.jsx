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
      exerciseId="ex-barbell-row"
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
  beforeEach(() => {
    localStorage.clear()
  })

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

  it('renders first-time standard suggestions', () => {
    renderProgression({
      suggestion: makeSuggestion({
        action: 'first_time',
        suggestedWeightKg: 35,
        suggestedReps: 8,
        reasoning: 'No prior history yet.',
      }),
    })

    expect(screen.getByText('Set 1 · Start')).toBeTruthy()
    expect(screen.getByText('35 × 8')).toBeTruthy()
  })

  it('calls onApply with the kg target and reps', () => {
    const onApply = vi.fn()
    renderProgression({ onApply })

    fireEvent.click(screen.getByText('Apply'))

    expect(onApply).toHaveBeenCalledWith(102.5, 8, expect.any(Object))
  })

  it('converts suggested kg to rounded lbs before applying', () => {
    const onApply = vi.fn()
    const expectedLbs = Math.round(fromKg(102.5, 'lbs') * 10) / 10
    renderProgression({ unitPreference: 'lbs', onApply })

    fireEvent.click(screen.getByText('Apply'))

    expect(onApply).toHaveBeenCalledWith(expectedLbs, 8, expect.any(Object))
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
      exerciseId: 'ex-dumbbell-curl',
      unitPreference: 'lbs',
      onIncrementChange,
      onStartingWeightChange,
    })

    fireEvent.click(screen.getByLabelText('Increment settings'))
    const [incrementInput, startingWeightInput] = screen.getAllByRole('spinbutton')
    fireEvent.change(incrementInput, { target: { value: '7.5' } })
    fireEvent.change(startingWeightInput, { target: { value: '20' } })
    fireEvent.click(screen.getByText('Save'))

    expect(onIncrementChange).toHaveBeenCalledWith('ex-dumbbell-curl', toKg(7.5, 'lbs'))
    expect(onStartingWeightChange).toHaveBeenCalledWith('ex-dumbbell-curl', toKg(20, 'lbs'))
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

  it('renders the bodyweight flip button only when alternates are available', () => {
    const reps = makeSuggestion({
      action: 'increase_reps',
      suggestedWeightKg: 0,
      suggestedReps: 11,
      isBodyweightOnly: true,
    })
    const load = makeSuggestion({
      action: 'increase_weight',
      suggestedWeightKg: 2.5,
      suggestedReps: 8,
      isBodyweightOnly: false,
    })

    renderProgression({
      equipment: 'Bodyweight',
      exerciseId: 'pull-up',
      suggestion: {
        ...reps,
        bodyweightAlternates: { reps, load },
      },
    })

    expect(screen.getByLabelText('Show added-load progression')).toBeTruthy()
  })

  it('does not render the bodyweight flip button for regular weighted suggestions', () => {
    renderProgression()

    expect(screen.queryByLabelText('Show added-load progression')).toBeNull()
    expect(screen.queryByLabelText('Show reps progression')).toBeNull()
  })

  // ── confidenceSignal UI ─────────────────────────────────────────────────────

  describe('confidence row', () => {
    function makeConfidenceSuggestion({ level = 'medium', topReasons = ['Last comparable session was 18 days ago'] } = {}) {
      return makeSuggestion({
        confidenceSignal: {
          level,
          score: level === 'high' ? 0.85 : level === 'medium' ? 0.55 : 0.25,
          topReasons,
          axes: {},
        },
      })
    }

    it('confidence row renders when confidenceSignal is present', () => {
      renderProgression({ suggestion: makeConfidenceSuggestion() })
      expect(screen.getByText('Confidence')).toBeTruthy()
    })

    it('confidence row absent when suggestion has no confidenceSignal', () => {
      renderProgression({ suggestion: makeSuggestion() }) // no confidenceSignal
      expect(screen.queryByText('Confidence')).toBeNull()
    })

    it('four bars render, filled count reflects score (medium = 2 filled)', () => {
      renderProgression({ suggestion: makeConfidenceSuggestion({ level: 'medium' }) })
      const allBars = document.querySelectorAll('.ps-confidence-bar')
      const filledBars = document.querySelectorAll('.ps-confidence-bar--filled')
      expect(allBars).toHaveLength(4)
      expect(filledBars).toHaveLength(2)
    })

    it('filled bars have ps-confidence-bar--filled, unfilled do not', () => {
      renderProgression({ suggestion: makeConfidenceSuggestion({ level: 'medium' }) })
      const filledBars = document.querySelectorAll('.ps-confidence-bar--filled')
      const unfilledBars = document.querySelectorAll('.ps-confidence-bar:not(.ps-confidence-bar--filled)')
      expect(filledBars).toHaveLength(2)
      expect(unfilledBars).toHaveLength(2)
    })

    it('filled bars have data-level matching the confidence level (low = 1 filled)', () => {
      renderProgression({ suggestion: makeConfidenceSuggestion({ level: 'low' }) })
      const filledBars = document.querySelectorAll('.ps-confidence-bar--filled')
      expect(filledBars).toHaveLength(1)
      expect(filledBars[0].dataset.level).toBe('low')
    })

    it('filled bar count and data-level change when level is high (3 filled)', () => {
      renderProgression({ suggestion: makeConfidenceSuggestion({ level: 'high' }) })
      const filledBars = document.querySelectorAll('.ps-confidence-bar--filled')
      expect(filledBars).toHaveLength(3)
      filledBars.forEach(bar => expect(bar.dataset.level).toBe('high'))
    })

    it('(i) button hidden when topReasons is empty', () => {
      renderProgression({ suggestion: makeConfidenceSuggestion({ topReasons: [] }) })
      expect(screen.queryByLabelText('Why this confidence level?')).toBeNull()
    })

    it('(i) button visible when topReasons has items', () => {
      renderProgression({ suggestion: makeConfidenceSuggestion() })
      expect(screen.getByLabelText('Why this confidence level?')).toBeTruthy()
    })

    it('tapping (i) opens popup with score-derived label title (medium score → "Why moderate confidence?")', () => {
      renderProgression({ suggestion: makeConfidenceSuggestion({ level: 'medium' }) })
      fireEvent.click(screen.getByLabelText('Why this confidence level?'))
      expect(screen.getByText('Why moderate confidence?')).toBeTruthy()
    })

    it('popup body renders each topReason as a list item', () => {
      const reasons = ['Last comparable session was 18 days ago', 'Training schedule has been irregular']
      renderProgression({ suggestion: makeConfidenceSuggestion({ topReasons: reasons }) })
      fireEvent.click(screen.getByLabelText('Why this confidence level?'))
      expect(screen.getByText('Last comparable session was 18 days ago')).toBeTruthy()
      expect(screen.getByText('Training schedule has been irregular')).toBeTruthy()
    })

    it('tapping (i) again closes the confidence popup (toggle)', () => {
      renderProgression({ suggestion: makeConfidenceSuggestion() })
      const btn = screen.getByLabelText('Why this confidence level?')
      fireEvent.click(btn)
      expect(screen.getByText('Why moderate confidence?')).toBeTruthy()
      fireEvent.click(btn)
      expect(screen.queryByText('Why moderate confidence?')).toBeNull()
    })

    it('tapping the existing ps-info-btn opens popup in reasoning mode (not confidence mode)', () => {
      renderProgression({ suggestion: makeConfidenceSuggestion() })
      fireEvent.click(screen.getByLabelText('Why this suggestion'))
      // Reasoning body should be visible, confidence title should not
      expect(screen.getByText('Hit the top of the rep range twice.')).toBeTruthy()
      expect(screen.queryByText('Why moderate confidence?')).toBeNull()
    })

    it('opening confidence popup closes reasoning popup', () => {
      renderProgression({ suggestion: makeConfidenceSuggestion() })
      // Open reasoning first
      fireEvent.click(screen.getByLabelText('Why this suggestion'))
      expect(screen.getByText('Hit the top of the rep range twice.')).toBeTruthy()
      // Open confidence
      fireEvent.click(screen.getByLabelText('Why this confidence level?'))
      // Reasoning body gone, confidence title shown
      expect(screen.queryByText('Hit the top of the rep range twice.')).toBeNull()
      expect(screen.getByText('Why moderate confidence?')).toBeTruthy()
    })

    it('opening reasoning popup closes confidence popup', () => {
      renderProgression({ suggestion: makeConfidenceSuggestion() })
      // Open confidence first
      fireEvent.click(screen.getByLabelText('Why this confidence level?'))
      expect(screen.getByText('Why moderate confidence?')).toBeTruthy()
      // Open reasoning
      fireEvent.click(screen.getByLabelText('Why this suggestion'))
      // Confidence title gone, reasoning body shown
      expect(screen.queryByText('Why moderate confidence?')).toBeNull()
      expect(screen.getByText('Hit the top of the rep range twice.')).toBeTruthy()
    })

    it('outside click closes confidence popup', () => {
      renderProgression({ suggestion: makeConfidenceSuggestion() })
      fireEvent.click(screen.getByLabelText('Why this confidence level?'))
      expect(screen.getByText('Why moderate confidence?')).toBeTruthy()
      fireEvent.mouseDown(document.body)
      expect(screen.queryByText('Why moderate confidence?')).toBeNull()
    })
  })

  it('flips from reps to added-load view and applies the visible side', () => {
    const onApply = vi.fn()
    const reps = makeSuggestion({
      action: 'increase_reps',
      suggestedWeightKg: 0,
      suggestedReps: 11,
      isBodyweightOnly: true,
      reasoning: 'Add a rep.',
    })
    const load = makeSuggestion({
      action: 'increase_weight',
      suggestedWeightKg: 2.5,
      suggestedReps: 8,
      isBodyweightOnly: false,
      reasoning: 'Add load.',
    })

    renderProgression({
      equipment: 'Bodyweight',
      exerciseId: 'pull-up',
      onApply,
      suggestion: {
        ...reps,
        bodyweightAlternates: { reps, load },
      },
    })

    expect(screen.getByText('11 reps')).toBeTruthy()
    fireEvent.click(screen.getByText('Apply'))
    expect(onApply).toHaveBeenLastCalledWith(0, 11, expect.any(Object))

    fireEvent.click(screen.getByLabelText('Show added-load progression'))

    expect(screen.getByText('2.5 × 8')).toBeTruthy()
    expect(screen.getByLabelText('Show reps progression')).toBeTruthy()
    fireEvent.click(screen.getByText('Apply'))
    expect(onApply).toHaveBeenLastCalledWith(2.5, 8, expect.any(Object))
  })

  it('persists the selected bodyweight progression side per exercise', () => {
    const reps = makeSuggestion({
      action: 'increase_reps',
      suggestedWeightKg: 0,
      suggestedReps: 11,
      isBodyweightOnly: true,
    })
    const load = makeSuggestion({
      action: 'increase_weight',
      suggestedWeightKg: 2.5,
      suggestedReps: 8,
      isBodyweightOnly: false,
    })

    const { unmount } = renderProgression({
      equipment: 'Bodyweight',
      exerciseId: 'pull-up',
      suggestion: {
        ...reps,
        bodyweightAlternates: { reps, load },
      },
    })

    fireEvent.click(screen.getByLabelText('Show added-load progression'))
    expect(localStorage.getItem('liftlog:bodyweightProgressionMode:pull-up')).toBe('load')

    unmount()

    renderProgression({
      equipment: 'Bodyweight',
      exerciseId: 'pull-up',
      suggestion: {
        ...reps,
        bodyweightAlternates: { reps, load },
      },
    })

    expect(screen.getByText('2.5 × 8')).toBeTruthy()
  })

  it('confidence signal follows the visible alternate, not the parent suggestion', () => {
    // Bug regression: line 85 was reading suggestion?.confidenceSignal instead of
    // visibleSuggestion?.confidenceSignal. With BW alternates, flipping sides should
    // show the alternate's own signal, not the parent suggestion's signal.
    const reps = makeSuggestion({
      action: 'increase_reps',
      suggestedWeightKg: 0,
      suggestedReps: 11,
      isBodyweightOnly: true,
      confidenceSignal: { level: 'medium', score: 0.55, topReasons: [], axes: {} },
    })
    const load = makeSuggestion({
      action: 'increase_weight',
      suggestedWeightKg: 2.5,
      suggestedReps: 8,
      isBodyweightOnly: false,
      confidenceSignal: { level: 'high', score: 0.85, topReasons: [], axes: {} },
    })

    renderProgression({
      equipment: 'Bodyweight',
      exerciseId: 'pull-up',
      suggestion: {
        ...reps,
        // isBodyweightOnly: false → defaultBodyweightSide = 'load', so initial visibleSuggestion = load
        isBodyweightOnly: false,
        // Parent has 'low' — should never be shown once alternates are considered
        confidenceSignal: { level: 'low', score: 0.25, topReasons: ['Parent signal'], axes: {} },
        bodyweightAlternates: { reps, load },
      },
    })

    // Default side is 'load' (score 0.85 → filledBars=3) — should show 3 filled bars
    expect(document.querySelectorAll('.ps-confidence-bar--filled')).toHaveLength(3)

    // Flip to reps side (score 0.55 → filledBars=2) — should show 2 filled bars, not parent's 1
    fireEvent.click(screen.getByLabelText('Show reps progression'))
    expect(document.querySelectorAll('.ps-confidence-bar--filled')).toHaveLength(2)
  })

  it('shows 1.25 kg default increment in settings for bilateral Dumbbell', () => {
    renderProgression({
      equipment: 'Dumbbell',
      unitPreference: 'kg',
      bilateral: true,
      exerciseId: 'ex-db-press',
    })

    fireEvent.click(screen.getByLabelText('Increment settings'))

    const [incrementInput] = screen.getAllByRole('spinbutton')
    // bilateral Dumbbell default = 2.5 kg / 2 = 1.25 kg
    expect(incrementInput.value).toBe('1.25')
  })

  it('shows 2.5 kg default increment in settings for non-bilateral Dumbbell', () => {
    renderProgression({
      equipment: 'Dumbbell',
      unitPreference: 'kg',
      bilateral: false,
      exerciseId: 'ex-db-row',
    })

    fireEvent.click(screen.getByLabelText('Increment settings'))

    const [incrementInput] = screen.getAllByRole('spinbutton')
    // non-bilateral Dumbbell default = standard 2.5 kg
    expect(incrementInput.value).toBe('2.5')
  })
})
