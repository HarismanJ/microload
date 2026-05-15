import { render, screen } from '@testing-library/react'

import WorkoutSummary from '../../components/WorkoutSummary.jsx'

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
