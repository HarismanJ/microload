import { render, screen, waitFor } from '@testing-library/react'

vi.mock('../../lib/supabase.js', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}))

vi.mock('../../context/UserContext', () => ({
  useCurrentUserId: vi.fn(() => 'self-user'),
}))

vi.mock('../../data/exercises.js', () => ({
  fetchExercises: vi.fn(() => Promise.resolve([])),
}))

vi.mock('../../data/rankStates.js', () => ({
  fetchExerciseRankStates: vi.fn(() => Promise.resolve({ rows: [], missingTable: false })),
  mapExerciseRankStates: vi.fn(() => new Map()),
}))

vi.mock('react-body-highlighter', () => ({
  default: () => <div data-testid="muscle-model" />,
}))

vi.mock('../../lib/strengthStandards.js', () => ({
  TIERS: ['Unranked', 'Iron'],
  TIER_COLORS: { Unranked: '#999', Iron: '#aaa' },
  tierGroup: vi.fn(tier => tier),
  tierColor: vi.fn(() => '#999'),
  expandAnchors: vi.fn(anchors => anchors),
  getTierIdx: vi.fn(() => 0),
  getProgress: vi.fn(() => 0),
  getAnchors: vi.fn(() => Promise.resolve({ male: {}, female: {} })),
  anchorsOrNull: vi.fn(() => ({ male: {}, female: {} })),
}))

vi.mock('../../lib/rollingRanks.js', () => ({
  ACTIVE_RANK_MODE: 'active',
  ALL_TIME_RANK_MODE: 'all_time',
  applyInactivityDecay: vi.fn(score => ({ score })),
  getContinuousTierScore: vi.fn(() => 0),
  inferRatioFromScore: vi.fn(() => 0),
  resolveTierFromScore: vi.fn(() => ({ tier: 'Unranked', tierIdx: -1, progress: 0, isMax: false, nextTier: null })),
}))

import FriendProfileDetail from '../../components/profile/FriendProfileDetail.jsx'
import { supabase } from '../../lib/supabase.js'

function makeQuery(result) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => Promise.resolve(result)),
    not: vi.fn(() => builder),
    gte: vi.fn(() => Promise.resolve(result)),
    single: vi.fn(() => Promise.resolve(result)),
  }
  return builder
}

describe('FriendProfileDetail profile privacy', () => {
  beforeEach(() => {
    supabase.from.mockReset()
    supabase.rpc.mockReset()
  })

  it('loads non-owner profile calculation fields through get_friend_rank_profile', async () => {
    supabase.rpc.mockImplementation((name) => {
      if (name === 'get_friend_rank_profile') {
        return Promise.resolve({
          data: [{
            id: 'friend-user',
            username: 'friend',
            full_name: 'Friend User',
            unit_preference: 'kg',
            gender: 'male',
            bodyweight: 82,
          }],
          error: null,
        })
      }
      return Promise.resolve({ data: null, error: new Error(`Unexpected RPC: ${name}`) })
    })

    supabase.from.mockImplementation((table) => {
      if (table === 'profiles') {
        return makeQuery({
          data: {
            id: 'self-user',
            username: 'self',
            full_name: 'Self User',
            unit_preference: 'kg',
            gender: 'male',
            bodyweight: 80,
          },
          error: null,
        })
      }
      return makeQuery({ data: [], error: null })
    })

    render(<FriendProfileDetail friendId="friend-user" onBack={vi.fn()} />)

    expect(await screen.findByText('Friend User')).toBeTruthy()
    await waitFor(() => {
      expect(supabase.rpc).toHaveBeenCalledWith('get_friend_rank_profile', { p_profile_id: 'friend-user' })
    })
    expect(supabase.from).not.toHaveBeenCalledWith('profiles', expect.anything())
  })
})
