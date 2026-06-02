import { render, fireEvent } from '@testing-library/react'

import BodyWeightDetail from '../../../components/profile/BodyWeightDetail.jsx'

// Default props — almost everything is a no-op handler that the test can spy on
function defaultProps(overrides = {}) {
  return {
    onBack: vi.fn(),
    currentWeight: null,
    activeUnit: 'kg',
    inputValue: '',
    onInputChange: vi.fn(),
    onUnitChange: vi.fn(),
    onLog: vi.fn(),
    saving: false,
    error: '',
    weightPeriod: 'all',
    onPeriodChange: vi.fn(),
    hasWeightLogs: false,
    weightLogs: [],
    filteredWeightLogs: [],
    chartHeight: 250,
    recentWeightLogs: [],
    displayWeight: log => log.weight,
    deleteTargetId: null,
    onToggleDelete: vi.fn(),
    deleteError: '',
    deletingId: null,
    onDeleteWeightLog: vi.fn(),
    formatWeightLogLabel: stamp => String(stamp).slice(0, 10),
    showTrend: false,
    onToggleTrend: vi.fn(),
    goalWeightKg: null,
    goalInput: '',
    onGoalInputChange: vi.fn(),
    onSaveGoal: vi.fn(),
    goalSaving: false,
    showGoal: false,
    onToggleGoal: vi.fn(),
    trendModeInput: '',
    onTrendModeInputChange: vi.fn(),
    trendRateInput: '',
    onTrendRateInputChange: vi.fn(),
    onSaveTrendMode: vi.fn(),
    trendModeSaving: false,
    trendModeConfig: null,
    showTrendMode: false,
    onToggleTrendMode: vi.fn(),
    trendDatePickerOpen: false,
    trendDatePickerValue: '',
    onTrendDateChange: vi.fn(),
    onTrendDateConfirm: vi.fn(),
    onTrendDateCancel: vi.fn(),
    dailyCalorieGoal: null,
    weightAllLoading: false,
    ...overrides,
  }
}

describe('BodyWeightDetail', () => {
  it('renders the header and current weight when provided', () => {
    const { container } = render(
      <BodyWeightDetail {...defaultProps({ currentWeight: 75 })} />
    )
    expect(container.textContent).toContain('Body Weight')
    expect(container.querySelector('.body-stats-current').textContent).toContain('75')
  })

  it('omits the current-weight block when currentWeight is null', () => {
    const { container } = render(<BodyWeightDetail {...defaultProps()} />)
    expect(container.querySelector('.body-stats-current')).toBeNull()
  })

  it('Log button is disabled when inputValue is empty', () => {
    const { getByText } = render(<BodyWeightDetail {...defaultProps()} />)
    expect(getByText('Log').disabled).toBe(true)
  })

  it('Log button is enabled when inputValue is set, and clicking it calls onLog', () => {
    const onLog = vi.fn()
    const { getByText } = render(
      <BodyWeightDetail {...defaultProps({ inputValue: '75', onLog })} />
    )
    const button = getByText('Log')
    expect(button.disabled).toBe(false)
    fireEvent.click(button)
    expect(onLog).toHaveBeenCalledTimes(1)
  })

  it('shows the saving state on the Log button when saving=true', () => {
    const { getByText } = render(
      <BodyWeightDetail {...defaultProps({ inputValue: '75', saving: true })} />
    )
    expect(getByText('Saving…')).toBeTruthy()
  })

  it('renders the error message when error is set', () => {
    const { container } = render(
      <BodyWeightDetail {...defaultProps({ error: 'Out of range' })} />
    )
    expect(container.querySelector('.body-stats-history-error').textContent).toBe('Out of range')
  })

  it('clicking the unit toggle calls onUnitChange with the new unit', () => {
    const onUnitChange = vi.fn()
    const { getByText } = render(<BodyWeightDetail {...defaultProps({ onUnitChange })} />)
    fireEvent.click(getByText('lbs'))
    expect(onUnitChange).toHaveBeenCalledWith('lbs')
  })

  it('back button calls onBack', () => {
    const onBack = vi.fn()
    const { container } = render(<BodyWeightDetail {...defaultProps({ onBack })} />)
    fireEvent.click(container.querySelector('.day-detail-back-btn'))
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('renders the recent logs list and reacts to the delete toggle', () => {
    const onToggleDelete = vi.fn()
    const log = { id: 'log-1', weight: 75, unit: 'kg', loggedAt: '2026-05-30T12:00:00Z' }
    const { container, getByText } = render(
      <BodyWeightDetail
        {...defaultProps({ recentWeightLogs: [log], onToggleDelete })}
      />
    )
    expect(container.querySelector('.body-stats-history')).toBeTruthy()
    fireEvent.click(getByText('Delete'))
    expect(onToggleDelete).toHaveBeenCalledWith('log-1')
  })

  it('shows the confirm panel and triggers onDeleteWeightLog when target matches', () => {
    const onDeleteWeightLog = vi.fn()
    const log = { id: 'log-1', weight: 75, unit: 'kg', loggedAt: '2026-05-30T12:00:00Z' }
    const { container, getByText } = render(
      <BodyWeightDetail
        {...defaultProps({
          recentWeightLogs: [log],
          deleteTargetId: 'log-1',
          onDeleteWeightLog,
        })}
      />
    )
    expect(container.querySelector('.body-stats-history-confirm')).toBeTruthy()
    fireEvent.click(getByText('Delete forever'))
    expect(onDeleteWeightLog).toHaveBeenCalledWith('log-1')
  })

  it('renders "No data in this period" when filteredWeightLogs is empty', () => {
    const { container } = render(<BodyWeightDetail {...defaultProps()} />)
    expect(container.textContent).toContain('No data in this period')
  })

  it('shows the chart toggles (Trend) when hasWeightLogs is true', () => {
    const { container } = render(
      <BodyWeightDetail {...defaultProps({ hasWeightLogs: true })} />
    )
    expect(container.querySelector('.bw-chart-toggles')).toBeTruthy()
    expect(container.textContent).toContain('Trend')
  })

  it('renders the trend-date picker overlay when trendDatePickerOpen is true', () => {
    const { container } = render(
      <BodyWeightDetail {...defaultProps({ trendDatePickerOpen: true })} />
    )
    expect(container.querySelector('.bw-date-picker-modal')).toBeTruthy()
    expect(container.textContent).toContain('Pace start date')
  })

  it('custom pace input allows a leading minus + digits and strips everything else', () => {
    const onTrendRateInputChange = vi.fn()
    const { container } = render(
      <BodyWeightDetail {...defaultProps({ trendModeInput: 'custom', onTrendRateInputChange })} />
    )
    const input = container.querySelector('.body-stats-pace-rate-input')
    expect(input).toBeTruthy()

    // Negative is allowed (for a cut)
    fireEvent.change(input, { target: { value: '-0.5' } })
    expect(onTrendRateInputChange).toHaveBeenLastCalledWith('-0.5')

    // Letters, 'e', '+', and extra dots are stripped; one leading minus + one dot kept
    fireEvent.change(input, { target: { value: '-1.2.3abce+' } })
    expect(onTrendRateInputChange).toHaveBeenLastCalledWith('-1.23')

    // A minus that isn't leading is dropped
    fireEvent.change(input, { target: { value: '1-2' } })
    expect(onTrendRateInputChange).toHaveBeenLastCalledWith('12')
  })
})
