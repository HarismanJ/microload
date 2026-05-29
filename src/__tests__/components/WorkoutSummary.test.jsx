import { render, screen } from '@testing-library/react'

import WorkoutSummary from '../../components/WorkoutSummary.jsx'

describe('WorkoutSummary training volume', () => {
  it('shows working/drop set counts and separates effective volume from load moved', () => {
    render(
      <WorkoutSummary
        onDismiss={vi.fn()}
        summary={{
          durationSeconds: 1200,
          caloriesBurned: 0,
          totalSets: 3,
          totalWorkingSets: 3,
          totalDropSets: 1,
          totalVolume: 900,
          totalLoadVolume: 1000,
          unit: 'kg',
          exercises: [
            {
              name: 'Bench Press',
              sets: [
                { weight: 100, reps: 5, unit: 'kg', setType: 'normal' },
                { weight: 80, reps: 5, unit: 'kg', setType: 'dropset' },
              ],
            },
          ],
        }}
      />,
    )

    expect(screen.getByText('3 + 1')).toBeTruthy()
    expect(screen.getByText('Working + Drops')).toBeTruthy()
    expect(screen.getByText('Effective Vol (kg)')).toBeTruthy()
    expect(screen.getByText('Load Moved (kg)')).toBeTruthy()
    expect(screen.getByText('Bench Press')).toBeTruthy()
  })
})

describe('WorkoutSummary battle recap', () => {
  it('renders weighted metric point labels and not-scored highlights', () => {
    render(
      <WorkoutSummary
        onDismiss={vi.fn()}
        summary={{
          durationSeconds: 0,
          totalSets: 0,
          totalVolume: 0,
          unit: 'kg',
          exercises: [],
          battleOnly: true,
          battle: {
            status: 'finished',
            winner: 'you',
            verdict: 'You won 64-36 on battle metrics',
            points: { you: 64, opponent: 36 },
            scoreTotal: 100,
            battleModeLabel: 'Hybrid',
            opponentName: 'Rival',
            metrics: [
              {
                id: 'strength_volume_bw',
                label: 'Strength Volume / BW',
                available: true,
                yourValue: 12.34,
                opponentValue: 9.87,
                display: 'x BW volume',
                effectiveWeight: 35,
                winner: 'you',
              },
              {
                id: 'cardio_met_minutes',
                label: 'Cardio MET-Minutes',
                available: true,
                yourValue: 180,
                opponentValue: 120,
                display: 'MET-min',
                effectiveWeight: 20,
                winner: 'you',
              },
              {
                id: 'cardio_density',
                label: 'Cardio Density',
                available: false,
                yourValue: null,
                opponentValue: null,
                display: 'MET-min / min',
                unavailableText: 'Needs completed cardio from both lifters',
              },
            ],
            yourHighlights: [
              { type: 'pr', title: 'Bench Press PR', body: '100 kg estimated 1RM' },
            ],
            opponentHighlights: [
              { type: 'effort', title: 'Long steady effort', body: '30 minutes held' },
            ],
          },
        }}
      />,
    )

    expect(screen.getByText('Hybrid Head To Head')).toBeTruthy()
    expect(screen.getByText('Weighted score out of 100')).toBeTruthy()
    expect(screen.getByText((text) => /x BW volume\s+.\s+35 pts/.test(text))).toBeTruthy()
    expect(screen.getByText((text) => /MET-min\s+.\s+20 pts/.test(text))).toBeTruthy()
    expect(screen.getByText('Needs completed cardio from both lifters')).toBeTruthy()
    expect(screen.getByText('Not scored')).toBeTruthy()
    expect(screen.getByText('Bench Press PR')).toBeTruthy()
    expect(screen.getByText('100 kg estimated 1RM')).toBeTruthy()
    expect(screen.getByText('Long steady effort')).toBeTruthy()
    expect(screen.getByText('30 minutes held')).toBeTruthy()
  })
})

describe('WorkoutSummary bodyweight-missing banner', () => {
  const baseStrengthSummary = {
    durationSeconds: 600,
    totalSets: 1,
    totalWorkingSets: 1,
    totalVolume: 100,
    unit: 'kg',
    exercises: [
      {
        name: 'Bench Press',
        sets: [{ weight: 100, reps: 5, unit: 'kg', setType: 'normal' }],
      },
    ],
  }

  it('renders the warning when bodyweight is missing on a strength session', () => {
    render(
      <WorkoutSummary
        onDismiss={vi.fn()}
        summary={{ ...baseStrengthSummary, bodyweightMissing: true }}
      />,
    )
    expect(screen.getByText('Bodyweight must be entered to see ranks.')).toBeTruthy()
  })

  it('does not render the warning when bodyweight is set', () => {
    render(
      <WorkoutSummary
        onDismiss={vi.fn()}
        summary={{ ...baseStrengthSummary, bodyweightMissing: false }}
      />,
    )
    expect(screen.queryByText('Bodyweight must be entered to see ranks.')).toBeNull()
  })

  it('does not render the warning on a cardio-only session even when bodyweight is missing', () => {
    render(
      <WorkoutSummary
        onDismiss={vi.fn()}
        summary={{
          ...baseStrengthSummary,
          bodyweightMissing: true,
          exercises: [
            {
              name: 'Treadmill',
              isCardio: true,
              sets: [{ durationSeconds: 600 }],
            },
          ],
        }}
      />,
    )
    expect(screen.queryByText('Bodyweight must be entered to see ranks.')).toBeNull()
  })

  it('does not render the warning in battle-only mode', () => {
    render(
      <WorkoutSummary
        onDismiss={vi.fn()}
        summary={{
          ...baseStrengthSummary,
          bodyweightMissing: true,
          battleOnly: true,
          battle: {
            status: 'finished',
            winner: 'you',
            verdict: 'You won',
            points: { you: 60, opponent: 40 },
            scoreTotal: 100,
            battleModeLabel: 'Hybrid',
            opponentName: 'Rival',
            metrics: [],
          },
        }}
      />,
    )
    expect(screen.queryByText('Bodyweight must be entered to see ranks.')).toBeNull()
  })
})
