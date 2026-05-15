import { useState } from 'react'
import WeightChart from './WeightChart'
import { CHART_PERIOD_OPTIONS, getChartPeriodLabel } from '../../lib/chartPeriods'
import { WEIGHT_TREND_PRESETS, buildWeightPaceCalorieCoach, formatRateForUnit } from '../../lib/weightTrend'
import { convertWeight } from '../../lib/liftMath'
import '../../styles/Profile.css'

function linearRegressionMs(pts) {
  const n = pts.length
  if (n < 2) return null
  let sx = 0, sy = 0, sxy = 0, sx2 = 0
  for (const { x, y } of pts) {
    sx += x; sy += y; sxy += x * y; sx2 += x * x
  }
  const d = n * sx2 - sx * sx
  if (d === 0) return null
  const slope = (n * sxy - sx * sy) / d
  const intercept = (sy - slope * sx) / n
  return { slope, intercept }
}

function etaDateLabel(ms) {
  if (!Number.isFinite(ms)) return null
  const d = new Date(ms)
  if (isNaN(d.getTime())) return null
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function BodyWeightDetail({
  onBack,
  currentWeight,
  activeUnit,
  inputValue,
  onInputChange,
  onUnitChange,
  onLog,
  saving,
  error,
  weightPeriod,
  onPeriodChange,
  hasWeightLogs,
  weightLogs = [],
  filteredWeightLogs,
  chartHeight = 250,
  recentWeightLogs,
  displayWeight,
  deleteTargetId,
  onToggleDelete,
  deleteError,
  deletingId,
  onDeleteWeightLog,
  formatWeightLogLabel,
  showTrend = false,
  onToggleTrend,
  goalWeightKg = null,
  goalInput = '',
  onGoalInputChange,
  onSaveGoal,
  goalSaving = false,
  showGoal = false,
  onToggleGoal,
  trendModeInput = '',
  onTrendModeInputChange,
  trendRateInput = '',
  onTrendRateInputChange,
  onSaveTrendMode,
  trendModeSaving = false,
  trendModeConfig = null,
  showTrendMode = false,
  onToggleTrendMode,
  trendDatePickerOpen = false,
  trendDatePickerValue = '',
  onTrendDateChange,
  onTrendDateConfirm,
  onTrendDateCancel,
  dailyCalorieGoal = null,
  weightAllLoading = false,
}) {
  const [renderedAtMs] = useState(() => Date.now())
  // Goal ETA computations
  let paceEta = null
  let trendEta = null

  if (goalWeightKg !== null) {
    // Pace ETA: when the orange pace line reaches goalWeightKg
    if (trendModeConfig) {
      const { rateKgPerWeek, anchorDate, anchorWeightKg } = trendModeConfig
      const anchorMs = new Date(anchorDate + 'T12:00:00').getTime()
      if (
        Number.isFinite(anchorMs) &&
        Number.isFinite(anchorWeightKg) &&
        Number.isFinite(rateKgPerWeek) &&
        rateKgPerWeek !== 0
      ) {
        const weeksNeeded = (goalWeightKg - anchorWeightKg) / rateKgPerWeek
        if (weeksNeeded >= 0) {
          const targetMs = anchorMs + weeksNeeded * 7 * 86400000
          const label = etaDateLabel(targetMs)
          if (label) paceEta = { label, isPast: targetMs < renderedAtMs }
        }
      }
    }

    // Trend ETA should use the full weight history, not the selected chart period.
    const etaTrendLogs = weightLogs.length >= 2 ? weightLogs : filteredWeightLogs
    if (etaTrendLogs.length >= 2) {
      const pts = etaTrendLogs
        .map(log => ({
          x: new Date(log.loggedAt || log.date + 'T12:00:00').getTime(),
          y: convertWeight(log.weight, log.unit || activeUnit, 'kg'),
        }))
        .filter(p => Number.isFinite(p.x) && Number.isFinite(p.y))
        .sort((a, b) => a.x - b.x)
      if (pts.length >= 2) {
        const reg = linearRegressionMs(pts)
        if (reg && reg.slope !== 0) {
          const latestKg = pts[pts.length - 1].y
          const trendTowardGoal =
            (goalWeightKg < latestKg && reg.slope < 0) ||
            (goalWeightKg > latestKg && reg.slope > 0)
          if (trendTowardGoal) {
            const targetMs = (goalWeightKg - reg.intercept) / reg.slope
            const label = etaDateLabel(targetMs)
            if (label) trendEta = { label, isPast: targetMs < renderedAtMs }
          }
        }
      }
    }
  }

  const paceCoach = buildWeightPaceCalorieCoach({
    logs: weightLogs,
    trendModeConfig,
    dailyCalorieGoal,
  })
  const showPaceCoach = trendModeConfig !== null && paceCoach.status !== 'no_pace'
  const actualRateLabel = Number.isFinite(paceCoach.actualRateKgPerWeek)
    ? formatRateForUnit(paceCoach.actualRateKgPerWeek, activeUnit)
    : null
  const targetRateLabel = Number.isFinite(paceCoach.targetRateKgPerWeek)
    ? formatRateForUnit(paceCoach.targetRateKgPerWeek, activeUnit)
    : null

  return (
    <div className="day-detail body-weight-detail">
      <div className="day-detail-header">
        <button className="day-detail-back-btn" onClick={onBack}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>
        <div>
          <div className="day-detail-date">Body Weight</div>
          <div className="day-detail-meta">Track new weigh-ins and review your recent trend.</div>
        </div>
      </div>

      <div className="body-stats-card body-weight-detail-card">
        <div className="body-stats-header">
          <div className="body-stats-title">Current Weight</div>
          {currentWeight !== null && currentWeight !== undefined && (
            <div className="body-stats-current">
              {currentWeight} <span className="body-stats-unit">{activeUnit}</span>
            </div>
          )}
        </div>

        <div className="body-stats-log-row body-stats-log-row-detail">
          <input
            className="body-stats-input"
            type="number"
            min={activeUnit === 'lbs' ? '44.1' : '20'}
            max={activeUnit === 'lbs' ? '1322.8' : '600'}
            step="0.1"
            inputMode="decimal"
            placeholder={activeUnit === 'lbs' ? 'e.g. 175' : 'e.g. 80'}
            value={inputValue}
            onChange={(event) => onInputChange(event.target.value)}
          />
          <div className="ex-period-toggle body-stats-unit-toggle" role="tablist" aria-label="Weight unit">
            {['kg', 'lbs'].map(unit => (
              <button
                key={unit}
                type="button"
                className={`ex-period-btn ${activeUnit === unit ? 'active' : ''}`}
                onClick={() => onUnitChange(unit)}
              >
                {unit}
              </button>
            ))}
          </div>
          <button className="body-stats-save-btn" onClick={onLog} disabled={saving || !inputValue}>
            {saving ? 'Saving…' : 'Log'}
          </button>
        </div>

        {error && <div className="body-stats-history-error">{error}</div>}

        <div className="body-stats-goal-row">
          <span className="body-stats-goal-label">Goal</span>
          <input
            className="body-stats-input body-stats-goal-input"
            type="number"
            min={activeUnit === 'lbs' ? '44.1' : '20'}
            max={activeUnit === 'lbs' ? '1322.8' : '600'}
            step="0.1"
            inputMode="decimal"
            placeholder={activeUnit === 'lbs' ? 'e.g. 160' : 'e.g. 72'}
            value={goalInput}
            onChange={(e) => onGoalInputChange(e.target.value)}
          />
          <span className="body-stats-goal-unit">{activeUnit}</span>
          <button
            className="body-stats-save-btn"
            onClick={onSaveGoal}
            disabled={goalSaving || !goalInput}
          >
            {goalSaving ? 'Saving…' : goalWeightKg !== null ? 'Update' : 'Set'}
          </button>
        </div>

        <div className="body-stats-goal-row">
          <span className="body-stats-goal-label">Pace</span>
          <select
            className="body-stats-input body-stats-pace-select"
            value={trendModeInput}
            onChange={(e) => onTrendModeInputChange(e.target.value)}
          >
            <option value="">None</option>
            {WEIGHT_TREND_PRESETS.map(({ key, label, rateKgPerWeek }) => {
              const rate = formatRateForUnit(rateKgPerWeek, activeUnit)
              return (
                <option key={key} value={key}>
                  {rate ? `${label} (${rate})` : label}
                </option>
              )
            })}
          </select>
          {trendModeInput === 'custom' && (
            <input
              className="body-stats-input body-stats-pace-rate-input"
              type="number"
              step="0.05"
              inputMode="decimal"
              placeholder={activeUnit === 'lbs' ? 'lbs/wk' : 'kg/wk'}
              min={activeUnit === 'lbs' ? -11 : -5}
              max={activeUnit === 'lbs' ? 11 : 5}
              value={trendRateInput}
              onChange={(e) => onTrendRateInputChange(e.target.value)}
            />
          )}
          <button
            className="body-stats-save-btn"
            onClick={onSaveTrendMode}
            disabled={trendModeSaving || (trendModeInput === 'custom' && !trendRateInput)}
          >
            {trendModeSaving ? 'Saving…' : trendModeConfig ? 'Update' : 'Set'}
          </button>
        </div>

        {(paceEta !== null || trendEta !== null) && (
          <div className="bw-eta-block">
            <div className="bw-eta-title">Goal ETA</div>
            <div className="bw-eta-stats">
              {paceEta !== null && (
                <div className="bw-eta-stat">
                  <span className="bw-eta-label">At pace</span>
                  <span className={`bw-eta-value ${paceEta.isPast ? 'bw-eta-value--past' : 'bw-eta-value--pace'}`}>
                    {paceEta.label}
                  </span>
                </div>
              )}
              {trendEta !== null && (
                <div className="bw-eta-stat">
                  <span className="bw-eta-label">At trend</span>
                  <span className={`bw-eta-value ${trendEta.isPast ? 'bw-eta-value--past' : 'bw-eta-value--trend'}`}>
                    {trendEta.label}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {showPaceCoach && (
          <div className={`bw-coach-card bw-coach-card--${paceCoach.tone}`}>
            <div className="bw-coach-top">
              <div>
                <div className="bw-coach-title">{paceCoach.title}</div>
                <div className="bw-coach-summary">{paceCoach.summary}</div>
              </div>
              {paceCoach.recommendedCalories !== null && paceCoach.adjustmentKcal !== 0 && (
                <div className="bw-coach-target">{paceCoach.recommendedCalories}<span> kcal</span></div>
              )}
            </div>
            <div className="bw-coach-instruction">{paceCoach.instruction}</div>
            <div className="bw-coach-metrics">
              {targetRateLabel && <span>Pace {targetRateLabel}</span>}
              {actualRateLabel && <span>Trend {actualRateLabel}</span>}
              {paceCoach.status === 'needs_data' && <span>{paceCoach.weighInCount || 0} weigh-ins</span>}
            </div>
          </div>
        )}

        {hasWeightLogs && (
          <div className="body-stats-chart-header">
            <div className="bw-chart-toggles">
              {trendModeConfig && (
                <label className="bw-trend-toggle">
                  <input type="checkbox" checked={showTrendMode} onChange={onToggleTrendMode} />
                  Pace
                </label>
              )}
              {goalWeightKg !== null && (
                <label className="bw-trend-toggle">
                  <input type="checkbox" checked={showGoal} onChange={onToggleGoal} />
                  Goal
                </label>
              )}
              <label className="bw-trend-toggle">
                <input type="checkbox" checked={showTrend} onChange={onToggleTrend} />
                Trend
              </label>
            </div>
            <div className="ex-period-toggle">
              {CHART_PERIOD_OPTIONS.map(({ value }) => (
                <button
                  key={value}
                  className={`ex-period-btn ${weightPeriod === value ? 'active' : ''}`}
                  onClick={() => onPeriodChange(value)}
                >
                  {getChartPeriodLabel(value)}
                </button>
              ))}
            </div>
          </div>
        )}

        {filteredWeightLogs.length > 0 ? (
          <div className={`body-stats-chart-wrap${weightAllLoading ? ' bw-chart-loading' : ''}`}>
            {weightAllLoading && <div className="bw-chart-spinner-overlay"><span className="bw-period-spinner" aria-label="Loading" /></div>}
            <WeightChart
              data={filteredWeightLogs}
              unit={activeUnit}
              height={chartHeight}
              tickCount={5}
              showTrend={showTrend}
              goalWeightKg={goalWeightKg}
              showGoal={showGoal}
              trendModeConfig={trendModeConfig}
              showTrendMode={showTrendMode}
            />
          </div>
        ) : (
          <div className="chart-empty">No data in this period</div>
        )}

        {recentWeightLogs.length > 0 && (
          <div className="body-stats-history">
            <div className="body-stats-history-title">Recent Logs</div>
            <div className="body-stats-history-list">
              {recentWeightLogs.map(log => (
                <div key={log.id} className="body-stats-history-item">
                  <div className="body-stats-history-main">
                    <div>
                      <div className="body-stats-history-weight">
                        {displayWeight(log)} <span className="body-stats-history-unit">{activeUnit}</span>
                      </div>
                      <div className="body-stats-history-date">{formatWeightLogLabel(log.loggedAt)}</div>
                    </div>
                    <button
                      className="body-stats-history-delete"
                      onClick={() => onToggleDelete(deleteTargetId === log.id ? null : log.id)}
                      disabled={Boolean(deletingId)}
                    >
                      {deleteTargetId === log.id ? 'Cancel' : 'Delete'}
                    </button>
                  </div>

                  {deleteTargetId === log.id && (
                    <div className="body-stats-history-confirm">
                      <div className="body-stats-history-confirm-text">
                        Delete this weigh-in? Your current bodyweight will update to the newest remaining entry.
                      </div>
                      {deleteError && <div className="body-stats-history-error">{deleteError}</div>}
                      <div className="body-stats-history-actions">
                        <button
                          className="body-stats-history-cancel"
                          onClick={() => onToggleDelete(null)}
                          disabled={Boolean(deletingId)}
                        >
                          Keep log
                        </button>
                        <button
                          className="body-stats-history-confirm-btn"
                          onClick={() => onDeleteWeightLog(log.id)}
                          disabled={deletingId === log.id}
                        >
                          {deletingId === log.id ? 'Deleting…' : 'Delete forever'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      {trendDatePickerOpen && (
        <div className="bw-date-picker-overlay" onClick={onTrendDateCancel}>
          <div className="bw-date-picker-modal" onClick={e => e.stopPropagation()}>
            <div className="bw-date-picker-title">Pace start date</div>
            <div className="bw-date-picker-sub">The orange line will start from this date and weight.</div>
            <input
              type="date"
              className="bw-date-picker-input"
              value={trendDatePickerValue}
              max={new Date().toISOString().slice(0, 10)}
              onChange={e => onTrendDateChange(e.target.value)}
            />
            <div className="bw-date-picker-actions">
              <button className="bw-date-picker-cancel" onClick={onTrendDateCancel}>Cancel</button>
              <button
                className="bw-date-picker-confirm"
                onClick={() => onTrendDateConfirm(trendDatePickerValue)}
                disabled={!trendDatePickerValue || trendModeSaving}
              >
                {trendModeSaving ? 'Saving…' : 'Set pace'}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}
