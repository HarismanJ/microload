import WeightChart from './WeightChart'
import { CHART_PERIOD_OPTIONS, getChartPeriodLabel } from '../../lib/chartPeriods'
import { WEIGHT_TREND_PRESETS, formatRateForUnit } from '../../lib/weightTrend'
import '../../styles/Profile.css'

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
}) {
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
          <div className="body-stats-chart-wrap">
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
