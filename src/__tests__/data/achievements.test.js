import { ACHIEVEMENTS } from '../../data/achievements.js'

function namesFor(id) {
  return ACHIEVEMENTS.find(a => a.id === id)?.matchNames
}

describe('strength achievement exercise matching', () => {
  it('uses strict exercise name lists for plate achievements', () => {
    expect(namesFor('bench_1p')).toEqual([
      'bench press',
      'paused bench press',
      'close grip bench press',
      'wide grip bench press',
      'smith machine bench press',
      'incline bench press',
    ])

    expect(namesFor('squat_1p')).toEqual([
      'squat',
      'front squat',
      'pause squat',
      'safety bar squat',
    ])

    expect(namesFor('dl_2p')).toEqual([
      'deadlift',
      'sumo deadlift',
      'pause deadlift',
      'deficit deadlift',
      'hex bar deadlift',
    ])

    expect(namesFor('ohp_1p')).toEqual([
      'military press',
      'shoulder press',
    ])
  })
})
