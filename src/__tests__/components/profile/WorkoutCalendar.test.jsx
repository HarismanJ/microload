// Hoisted mocks for supabase chainable + cache helpers

const supabaseMock = vi.hoisted(() => {
  const _responses = {}
  function makeChain(table) {
    const chain = {
      select: vi.fn(() => chain),
      eq:     vi.fn(() => chain),
      not:    vi.fn(() => chain),
      gte:    vi.fn(() => chain),
      lte:    vi.fn(() => chain),
      then:   (res, rej) => Promise.resolve(_responses[table] ?? { data: [], error: null }).then(res, rej),
    }
    return chain
  }
  return { _responses, from: vi.fn(table => makeChain(table)) }
})

const getCachedMock = vi.hoisted(() => vi.fn(() => null))
const setCachedMock = vi.hoisted(() => vi.fn())

vi.mock('../../../lib/supabase', () => ({ supabase: supabaseMock }))
vi.mock('../../../lib/cache', () => ({
  getCached: getCachedMock,
  setCached: setCachedMock,
}))

import { render, fireEvent, act, waitFor } from '@testing-library/react'
import WorkoutCalendar from '../../../components/profile/WorkoutCalendar.jsx'
import { UserProvider } from '../../../context/UserContext.jsx'

const TEST_USER = { id: 'user-1' }

function renderCalendar(props = {}) {
  return render(
    <UserProvider user={TEST_USER}>
      <WorkoutCalendar onDayClick={vi.fn()} {...props} />
    </UserProvider>
  )
}

describe('WorkoutCalendar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getCachedMock.mockReturnValue(null)
    Object.assign(supabaseMock._responses, {
      workout_sessions: { data: [], error: null },
      nutrition_logs:   { data: [], error: null },
      body_weight_logs: { data: [], error: null },
    })
  })

  it('loads month data via 3 parallel Supabase queries when uncached', async () => {
    renderCalendar()
    await act(async () => {})
    await waitFor(() => {
      const tables = supabaseMock.from.mock.calls.map(c => c[0])
      expect(tables).toContain('workout_sessions')
      expect(tables).toContain('nutrition_logs')
      expect(tables).toContain('body_weight_logs')
    })
  })

  it('skips Supabase fetch and uses cached data when available', async () => {
    const today = new Date()
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-15`
    getCachedMock.mockReturnValueOnce({
      dateMap: { [dateStr]: ['session-1'] },
      nutDates: {},
      weightDates: {},
    })

    renderCalendar()
    await act(async () => {})
    expect(supabaseMock.from).not.toHaveBeenCalled()
  })

  it('clicking the prev-month arrow updates the month label', async () => {
    const { container } = renderCalendar()
    await act(async () => {})

    const label = container.querySelector('.cal-month-label').textContent
    const prevButton = container.querySelector('.cal-nav button')

    fireEvent.click(prevButton)
    await act(async () => {})

    const updatedLabel = container.querySelector('.cal-month-label').textContent
    expect(updatedLabel).not.toBe(label)
  })

  it('next-month arrow is disabled when viewing the current month', async () => {
    const { container } = renderCalendar()
    await act(async () => {})

    const navButtons = container.querySelectorAll('.cal-nav button')
    const nextButton = navButtons[navButtons.length - 1]
    expect(nextButton.disabled).toBe(true)
  })

  it('renders a single dot for a cell with one entry type', async () => {
    const today = new Date()
    const targetDay = 15
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`
    getCachedMock.mockReturnValue({
      dateMap: { [dateStr]: ['session-1'] },
      nutDates: {},
      weightDates: {},
    })

    const { container } = renderCalendar()

    await waitFor(() => {
      const cell = Array.from(container.querySelectorAll('.cal-cell'))
        .find(el => el.getAttribute('title')?.startsWith(dateStr))
      expect(cell).toBeTruthy()
      expect(cell.classList.contains('has-entry')).toBe(true)
      expect(cell.querySelectorAll('.cal-dot-workout')).toHaveLength(1)
    })
  })

  it('renders three dots for a cell with workout + nutrition + weight entries', async () => {
    const today = new Date()
    const targetDay = 15
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`
    getCachedMock.mockReturnValue({
      dateMap: { [dateStr]: ['session-1'] },
      nutDates: { [dateStr]: true },
      weightDates: { [dateStr]: true },
    })

    const { container } = renderCalendar()

    await waitFor(() => {
      const cell = Array.from(container.querySelectorAll('.cal-cell'))
        .find(el => el.getAttribute('title')?.startsWith(dateStr))
      expect(cell).toBeTruthy()
      expect(cell.querySelectorAll('.cal-dot')).toHaveLength(3)
    })
  })

  it('renders skeleton cells when visualLoading is true', async () => {
    renderCalendar({ visualLoading: true })
    await act(async () => {})
    // Skeleton cells have the cal-cell-loading class
    expect(document.querySelectorAll('.cal-cell-loading').length).toBeGreaterThan(0)
  })

  it('cardPressable + onCalendarPress fires when the card is clicked but not the nav arrows', async () => {
    const onCalendarPress = vi.fn()
    const { container } = renderCalendar({ compact: true, cardPressable: true, onCalendarPress })
    await act(async () => {})

    // Click the card itself
    fireEvent.click(container.querySelector('.cal-card'))
    expect(onCalendarPress).toHaveBeenCalledTimes(1)

    // Click a nav arrow (event.stopPropagation should prevent card-press)
    onCalendarPress.mockClear()
    fireEvent.click(container.querySelector('.cal-arrow'))
    expect(onCalendarPress).not.toHaveBeenCalled()
  })
})
