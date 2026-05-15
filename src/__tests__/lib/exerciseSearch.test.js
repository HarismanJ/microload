import {
  matchesSearchQuery,
  normalizeSearchValue,
  scoreExerciseMatch,
} from '../../lib/exerciseSearch.js'

describe('normalizeSearchValue', () => {
  it('lowercases text and strips punctuation into spaces', () => {
    expect(normalizeSearchValue('Bicep-Curl!!')).toBe('bicep curl')
  })
})

describe('matchesSearchQuery', () => {
  it('treats empty and whitespace-only queries as matches', () => {
    expect(matchesSearchQuery('', 'Bench Press')).toBe(true)
    expect(matchesSearchQuery('   ', 'Bench Press')).toBe(true)
  })

  it('matches multiple query tokens across fields', () => {
    expect(matchesSearchQuery('bench press', 'Bench', 'Press')).toBe(true)
  })

  it('matches compact haystacks with spaces removed', () => {
    expect(matchesSearchQuery('deadlift', 'Dead Lift')).toBe(true)
  })

  it('matches one-character typos within token tolerance', () => {
    expect(matchesSearchQuery('benc', 'Bench Press')).toBe(true)
  })

  it('does not fuzzy-match short tokens or typos beyond tolerance', () => {
    expect(matchesSearchQuery('bn', 'Bench')).toBe(false)
    expect(matchesSearchQuery('zzzz', 'Bench')).toBe(false)
  })
})

describe('scoreExerciseMatch', () => {
  it('scores exact, prefix, contained, and all-token matches by tier', () => {
    expect(scoreExerciseMatch('bench press', { name: 'Bench Press' })).toBe(100)
    expect(scoreExerciseMatch('bench', { name: 'Bench Press' })).toBe(90)
    expect(scoreExerciseMatch('press', { name: 'Bench Press' })).toBe(80)
    expect(scoreExerciseMatch('press bench', { name: 'Bench Press' })).toBe(70)
  })

  it('returns a nonzero fuzzy score for tolerated typos', () => {
    expect(scoreExerciseMatch('benc', { name: 'Bench Press' })).toBeGreaterThan(10)
  })

  it('returns the fallback score when nothing matches', () => {
    expect(scoreExerciseMatch('deadlift', { name: 'Bench Press' })).toBe(10)
  })
})
