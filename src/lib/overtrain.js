const SEVERITY_RANK = { low: 1, moderate: 2, high: 3 }

function maxSeverity(a, b) {
  if (!a) return b
  if (!b) return a
  return SEVERITY_RANK[a] >= SEVERITY_RANK[b] ? a : b
}

function overuseSeverity(targetRatio) {
  if (targetRatio >= 4.0) return 'high'
  if (targetRatio >= 3.0) return 'moderate'
  return 'low'
}

function spikeSeverity(spikePct) {
  if (spikePct > 1.25) return 'high'
  if (spikePct > 0.75) return 'moderate'
  return 'low'
}

function lowBaselineSeverity(currentSets) {
  if (currentSets >= 22) return 'high'
  if (currentSets >= 16) return 'moderate'
  return 'low'
}

function highFreqSeverity(trainedDayCount, hoursSinceLast) {
  if (trainedDayCount >= 5 && hoursSinceLast < 24) return 'high'
  if (trainedDayCount >= 5 && hoursSinceLast < 36) return 'moderate'
  return 'low'
}

function detectOverusedMuscles(groups) {
  const results = []
  for (const group of groups) {
    if (group.heatBucket !== 5) continue
    results.push({
      type: 'overuse',
      severity: overuseSeverity(group.targetRatio),
      key: group.key,
      label: group.label,
      targetRatio: group.targetRatio,
      effectiveSets: group.effectiveSets,
      weeklyTarget: group.weeklyTarget,
    })
  }
  return results
}

function detectVolumeSignals(currentGroups, priorGroups) {
  if (!currentGroups?.length) return []
  const priorByKey = Object.fromEntries((priorGroups || []).map(g => [g.key, g]))
  const results = []

  for (const cur of currentGroups) {
    const currentSets = cur.effectiveSets ?? 0
    if (currentSets < 8) continue

    const prior = priorByKey[cur.key]
    const priorSets = prior?.effectiveSets ?? 0

    if (priorSets >= 4 && currentSets > priorSets * 1.5) {
      const spikePct = (currentSets - priorSets) / priorSets
      results.push({
        type: 'volume_spike',
        severity: spikeSeverity(spikePct),
        key: cur.key,
        label: cur.label,
        currentSets,
        priorSets,
        spikePct,
      })
    } else if (priorSets < 4 && currentSets >= 12) {
      results.push({
        type: 'low_baseline_high_volume',
        severity: lowBaselineSeverity(currentSets),
        key: cur.key,
        label: cur.label,
        currentSets,
        priorSets,
      })
    }
  }
  return results
}

function detectHighFrequencyMuscles(groups, now) {
  const nowMs = now instanceof Date ? now.getTime() : Number(now)
  const results = []

  for (const group of groups) {
    if (!group.lastTrainedAt || group.trainedDayCount < 4) continue
    const hoursSinceLast = (nowMs - new Date(group.lastTrainedAt).getTime()) / 3_600_000
    if (hoursSinceLast >= 36) continue
    results.push({
      type: 'high_frequency',
      severity: highFreqSeverity(group.trainedDayCount, hoursSinceLast),
      key: group.key,
      label: group.label,
      trainedDayCount: group.trainedDayCount,
      hoursSinceLast: Math.round(hoursSinceLast),
    })
  }
  return results
}

const SIGNAL_PRIORITY = ['overuse', 'volume_spike', 'low_baseline_high_volume', 'high_frequency']

export function detectOvertrain({ currentWorkload, priorWorkload, now = new Date() }) {
  const currentGroups = currentWorkload?.groups || []
  const priorGroups = priorWorkload?.groups || []
  const goal = currentWorkload?.goal || null

  const overuse = detectOverusedMuscles(currentGroups)
  const volume = detectVolumeSignals(currentGroups, priorGroups)
  const highFreq = detectHighFrequencyMuscles(currentGroups, now)

  const allSignals = [...overuse, ...volume, ...highFreq]

  if (!allSignals.length) {
    return { hasWarning: false, severity: null, signals: [], primarySignal: null, goal }
  }

  const severity = allSignals.reduce((acc, s) => maxSeverity(acc, s.severity), null)

  const primarySignal = SIGNAL_PRIORITY.reduce((found, type) => {
    if (found) return found
    return allSignals.find(s => s.type === type) ?? null
  }, null)

  return { hasWarning: true, severity, signals: allSignals, primarySignal, goal }
}
