import WeightChart from './WeightChart'
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

        {filteredWeightLogs.length > 0 && (
          <div className="body-stats-chart-header">
            <div className="ex-period-toggle">
              {['1w', '1m', '1y', 'all'].map(period => (
                <button
                  key={period}
                  className={`ex-period-btn ${weightPeriod === period ? 'active' : ''}`}
                  onClick={() => onPeriodChange(period)}
                >
                  {period === 'all' ? 'All' : period === '1w' ? '1W' : period === '1m' ? '1M' : '1Y'}
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
      </div>
    </div>
  )
}
