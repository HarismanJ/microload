import { useState, useEffect, useEffectEvent, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { getCached, setCached } from '../../lib/cache'
import '../../styles/Profile.css'

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DOT_LEVELS_BY_ENTRY_COUNT = {
  1: [2],
  2: [1, 3],
  3: [1, 2, 3],
}

function buildGrid(year, month) {
  const firstDow = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < firstDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  return cells
}

export default function WorkoutCalendar({
  onDayClick,
  compact = false,
  initialMonth = null,
  onMonthChange = null,
  onCalendarPress = null,
  variant = 'default',
  cardPressable = false,
  visualLoading = false,
  refreshKey = 0,
  onInitialLoadComplete = null,
}) {
  const today = new Date()
  const startingMonth = initialMonth
    ? new Date(new Date(initialMonth).getFullYear(), new Date(initialMonth).getMonth(), 1)
    : new Date(today.getFullYear(), today.getMonth(), 1)
  const [month, setMonth] = useState(startingMonth)
  const [dateMap, setDateMap] = useState({})  // 'YYYY-MM-DD' → sessionIds[]
  const [nutDates, setNutDates] = useState({}) // 'YYYY-MM-DD' → true
  const [weightDates, setWeightDates] = useState({}) // 'YYYY-MM-DD' → true
  const [loading, setLoading] = useState(true)
  const initialLoadReportedRef = useRef(false)

  async function loadMonth() {
    setLoading(true)
    const year = month.getFullYear()
    const m = month.getMonth()
    const cacheKey = `cal_${year}-${String(m + 1).padStart(2, '0')}`

    const cached = getCached(cacheKey)
    if (cached) {
      setDateMap(cached.dateMap)
      setNutDates(cached.nutDates)
      setWeightDates(cached.weightDates || {})
      setLoading(false)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    const start = new Date(year, m, 1).toISOString()
    const end   = new Date(year, m + 1, 0, 23, 59, 59).toISOString()
    const startDate = `${year}-${String(m+1).padStart(2,'0')}-01`
    const endDate   = `${year}-${String(m+1).padStart(2,'0')}-${String(new Date(year, m+1, 0).getDate()).padStart(2,'0')}`

    const [{ data: sessions }, { data: nutLogs }, { data: weightLogs }] = await Promise.all([
      supabase
        .from('workout_sessions')
        .select('id, started_at')
        .eq('user_id', user.id)
        .not('finished_at', 'is', null)
        .gte('started_at', start)
        .lte('started_at', end),
      supabase
        .from('nutrition_logs')
        .select('log_date')
        .eq('user_id', user.id)
        .gte('log_date', startDate)
        .lte('log_date', endDate),
      supabase
        .from('body_weight_logs')
        .select('logged_at')
        .eq('user_id', user.id)
        .gte('logged_at', start)
        .lte('logged_at', end),
    ])

    const map = {}
    sessions?.forEach(s => {
      const d = new Date(s.started_at)
      const date = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
      if (!map[date]) map[date] = []
      map[date].push(s.id)
    })

    const nmap = {}
    nutLogs?.forEach(l => { nmap[l.log_date] = true })
    const wmap = {}
    weightLogs?.forEach(l => {
      const d = new Date(l.logged_at)
      const date = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
      wmap[date] = true
    })

    setCached(cacheKey, { dateMap: map, nutDates: nmap, weightDates: wmap })
    setDateMap(map)
    setNutDates(nmap)
    setWeightDates(wmap)
    setLoading(false)
  }

  const loadMonthLatest = useEffectEvent(() => { loadMonth() })

  useEffect(() => {
    const timer = setTimeout(() => { loadMonthLatest() }, 0)
    return () => clearTimeout(timer)
  }, [month, refreshKey])

  useEffect(() => {
    if (!initialMonth) return

    const nextMonth = new Date(new Date(initialMonth).getFullYear(), new Date(initialMonth).getMonth(), 1)
    if (Number.isNaN(nextMonth.getTime())) return

    setMonth(current => (
      current.getFullYear() === nextMonth.getFullYear() && current.getMonth() === nextMonth.getMonth()
        ? current
        : nextMonth
    ))
  }, [initialMonth])

  useEffect(() => {
    onMonthChange?.(month)
  }, [month, onMonthChange])

  useEffect(() => {
    if (loading || initialLoadReportedRef.current) return
    initialLoadReportedRef.current = true
    onInitialLoadComplete?.()
  }, [loading, onInitialLoadComplete, initialLoadReportedRef])

  function prevMonth() { setMonth(d => new Date(d.getFullYear(), d.getMonth() - 1, 1)) }
  function nextMonth() { setMonth(d => new Date(d.getFullYear(), d.getMonth() + 1, 1)) }

  const year  = month.getFullYear()
  const m     = month.getMonth()
  const cells = buildGrid(year, m)
  const weekRows = Math.max(1, Math.ceil(cells.length / 7))
  const isHeatmap = compact && variant === 'heatmap'
  const isHybrid = compact && variant === 'hybrid'
  const isCardPressable = compact && cardPressable && !!onCalendarPress
  const isVisuallyLoading = loading || visualLoading

  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}` // already local (new Date() is local)
  const isFuture = (d) => new Date(year, m, d) > today

  return (
    <div
      className={`cal-card ${compact ? 'cal-card-compact' : ''} ${isHeatmap ? 'cal-card-heatmap' : ''} ${isHybrid ? 'cal-card-hybrid' : ''} ${isCardPressable ? 'cal-card-pressable' : ''} ${isVisuallyLoading ? 'cal-card-loading' : ''}`}
      style={compact ? { '--cal-week-rows': weekRows } : undefined}
      onClick={isCardPressable ? () => onCalendarPress?.() : undefined}
      aria-busy={isVisuallyLoading}
    >
      <div
        className="cal-nav"
        onClick={isCardPressable ? (event) => event.stopPropagation() : undefined}
      >
        <button
          className={`cal-arrow ${compact ? 'cal-arrow-compact' : ''}`}
          onClick={(event) => {
            event.stopPropagation()
            prevMonth()
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <span className="cal-month-label">{MONTHS[m]} {year}</span>
        <button
          className={`cal-arrow ${compact ? 'cal-arrow-compact' : ''}`}
          onClick={(event) => {
            event.stopPropagation()
            nextMonth()
          }}
          disabled={year === today.getFullYear() && m >= today.getMonth()}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </button>
      </div>

      <div
        className={`cal-body ${compact && onCalendarPress && !isCardPressable ? 'cal-body-pressable' : ''} ${isVisuallyLoading ? 'cal-body-loading' : ''}`}
        onClick={!isCardPressable ? () => onCalendarPress?.() : undefined}
      >
        {!isHeatmap && (
          <div className="cal-day-headers">
            {DAYS.map((d, i) => <div key={i} className="cal-day-header">{d}</div>)}
          </div>
        )}

        <div className="cal-grid">
          {cells.map((day, i) => {
            if (!day) return <div key={i} className="cal-cell empty" />

            const dateStr    = `${year}-${String(m+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
            const isToday    = dateStr === todayStr
            const future     = isFuture(day)

            if (isVisuallyLoading) {
              return (
                <div
                  key={i}
                  className={`cal-cell cal-cell-loading ${isToday ? 'today' : ''} ${future ? 'future' : ''}`}
                  style={{ '--cal-load-delay': `${(i % 7) * 70}ms` }}
                  aria-hidden="true"
                >
                  {!isHeatmap ? (
                    <>
                      <span className="cal-day-num cal-day-num-loading" />
                      <div className="cal-dots cal-dots-loading">
                        <span className="cal-dot cal-dot-loading" />
                        <span className="cal-dot cal-dot-loading" />
                        <span className="cal-dot cal-dot-loading" />
                      </div>
                    </>
                  ) : (
                    <div className="cal-heat-indicators cal-heat-indicators-loading" aria-hidden="true">
                      <span className="cal-heat-indicator cal-heat-indicator-loading" />
                      <span className="cal-heat-indicator cal-heat-indicator-loading" />
                      <span className="cal-heat-indicator cal-heat-indicator-loading" />
                    </div>
                  )}
                </div>
              )
            }

            const hasWorkout = !!dateMap[dateStr]
            const hasNut     = !!nutDates[dateStr]
            const hasWeight  = !!weightDates[dateStr]
            const hasData    = hasWorkout || hasNut || hasWeight
            const entryCount = Number(hasWorkout) + Number(hasNut) + Number(hasWeight)
            const dotLevels = DOT_LEVELS_BY_ENTRY_COUNT[entryCount] || []

            return (
              <div
                key={i}
                className={`cal-cell ${hasData ? 'has-entry' : ''} ${isToday ? 'today' : ''} ${future ? 'future' : ''} ${(isHeatmap || isHybrid) ? `heat-${entryCount}` : ''}`}
                style={{ '--cal-cell-delay': `${(i % 7) * 32}ms` }}
                onClick={(event) => {
                  if (!isCardPressable && !future && hasData) {
                    event.stopPropagation()
                    onDayClick(dateMap[dateStr] || [], dateStr)
                  }
                }}
                title={`${dateStr}${hasWorkout ? ' · Workout' : ''}${hasNut ? ' · Nutrition' : ''}${hasWeight ? ' · Weight' : ''}`}
              >
                {!isHeatmap ? (
                  <>
                    <span className="cal-day-num">{day}</span>
                    <div className={`cal-dots ${compact ? 'cal-dots-gradient' : ''}`}>
                      {compact
                        ? dotLevels.map((level, dotIndex) => (
                            <div
                              key={`${dateStr}-dot-${dotIndex}`}
                              className={`cal-dot cal-dot-gradient cal-dot-gradient-${level}`}
                            />
                          ))
                        : (
                            <>
                              {hasWorkout && <div className="cal-dot cal-dot-workout" />}
                              {hasNut     && <div className="cal-dot cal-dot-nut" />}
                              {hasWeight  && <div className="cal-dot cal-dot-weight" />}
                            </>
                          )}
                    </div>
                  </>
                ) : (
                  <div className="cal-heat-indicators" aria-hidden="true">
                    <span className={`cal-heat-indicator cal-heat-indicator-workout ${hasWorkout ? 'active' : ''}`} />
                    <span className={`cal-heat-indicator cal-heat-indicator-nut ${hasNut ? 'active' : ''}`} />
                    <span className={`cal-heat-indicator cal-heat-indicator-weight ${hasWeight ? 'active' : ''}`} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {!compact && (
        <div className="cal-legend">
          <span className="cal-legend-item">
            <span className="cal-legend-dot cal-dot-workout" />
            Workout entry
          </span>
          <span className="cal-legend-item">
            <span className="cal-legend-dot cal-dot-nut" />
            Nutrition entry
          </span>
          <span className="cal-legend-item">
            <span className="cal-legend-dot cal-dot-weight" />
            Weight entry
          </span>
        </div>
      )}
    </div>
  )
}
