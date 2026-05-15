import { detectOvertrain } from '../../lib/overtrain.js'

const NOW = new Date('2026-05-14T12:00:00.000Z')

function makeGroup(key, overrides = {}) {
  return {
    key,
    label: key,
    heatBucket: 1,
    effectiveSets: 0,
    weeklyTarget: 10,
    targetRatio: 0,
    trainedDayCount: 0,
    ...overrides,
  }
}

describe('detectOvertrain', () => {
  it('returns no warning for empty or missing groups', () => {
    expect(detectOvertrain({})).toEqual({
      hasWarning: false,
      severity: null,
      signals: [],
      primarySignal: null,
      goal: null,
    })

    expect(detectOvertrain({ currentWorkload: { groups: [] } })).toMatchObject({
      hasWarning: false,
      severity: null,
      primarySignal: null,
    })
  })

  it('detects high-severity overuse', () => {
    const result = detectOvertrain({
      currentWorkload: {
        groups: [makeGroup('chest', {
          heatBucket: 5,
          targetRatio: 4.5,
          effectiveSets: 45,
          weeklyTarget: 10,
        })],
      },
      now: NOW,
    })

    expect(result).toMatchObject({
      hasWarning: true,
      severity: 'high',
      primarySignal: {
        type: 'overuse',
        severity: 'high',
        key: 'chest',
        targetRatio: 4.5,
      },
    })
  })

  it('detects volume spikes against prior workload', () => {
    const result = detectOvertrain({
      currentWorkload: { groups: [makeGroup('quads', { effectiveSets: 22 })] },
      priorWorkload: { groups: [makeGroup('quads', { effectiveSets: 10 })] },
      now: NOW,
    })

    expect(result).toMatchObject({
      hasWarning: true,
      primarySignal: {
        type: 'volume_spike',
        key: 'quads',
        currentSets: 22,
        priorSets: 10,
      },
    })
  })

  it('detects high volume from a low baseline', () => {
    const result = detectOvertrain({
      currentWorkload: { groups: [makeGroup('lats', { effectiveSets: 12 })] },
      priorWorkload: { groups: [makeGroup('lats', { effectiveSets: 3 })] },
      now: NOW,
    })

    expect(result).toMatchObject({
      hasWarning: true,
      primarySignal: {
        type: 'low_baseline_high_volume',
        severity: 'low',
        key: 'lats',
        currentSets: 12,
        priorSets: 3,
      },
    })
  })

  it('detects high training frequency with a fixed clock', () => {
    const result = detectOvertrain({
      currentWorkload: {
        groups: [makeGroup('hamstrings', {
          trainedDayCount: 5,
          lastTrainedAt: '2026-05-13T16:00:00.000Z',
        })],
      },
      now: NOW,
    })

    expect(result).toMatchObject({
      hasWarning: true,
      severity: 'high',
      primarySignal: {
        type: 'high_frequency',
        severity: 'high',
        key: 'hamstrings',
        trainedDayCount: 5,
        hoursSinceLast: 20,
      },
    })
  })

  it('prioritizes overuse ahead of volume spikes and passes through the goal', () => {
    const result = detectOvertrain({
      currentWorkload: {
        goal: 'hypertrophy',
        groups: [
          makeGroup('chest', { heatBucket: 5, targetRatio: 4.5, effectiveSets: 4 }),
          makeGroup('quads', { effectiveSets: 22 }),
        ],
      },
      priorWorkload: {
        groups: [makeGroup('quads', { effectiveSets: 10 })],
      },
      now: NOW,
    })

    expect(result.goal).toBe('hypertrophy')
    expect(result.primarySignal.type).toBe('overuse')
    expect(result.signals.map(signal => signal.type)).toEqual(['overuse', 'volume_spike'])
  })
})
