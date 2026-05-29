vi.mock('../../lib/supabase.js', () => ({
  supabase: { from: vi.fn(), rpc: vi.fn() },
}))

import { supabase } from '../../lib/supabase.js'
import {
  loadFriendships,
  searchFriendProfiles,
  sendFriendRequest,
  acceptFriendRequest,
  removeFriendship,
} from '../../lib/friends'

// ─── Query chain builders ────────────────────────────────────────────────────

function makeFriendshipsQuery(result) {
  const b = { select: vi.fn(() => b), or: vi.fn(() => b), order: vi.fn(() => Promise.resolve(result)) }
  return b
}

function makeInsertQuery(result) {
  return { insert: vi.fn(() => Promise.resolve(result)) }
}

function makeUpdateQuery(result) {
  let eqCalls = 0
  const b = {
    update: vi.fn(() => b),
    eq: vi.fn(() => { eqCalls++; return eqCalls < 2 ? b : Promise.resolve(result) }),
  }
  return b
}

function makeDeleteQuery(result) {
  const b = { delete: vi.fn(() => b), eq: vi.fn(() => b), or: vi.fn(() => Promise.resolve(result)) }
  return b
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function friendship(overrides = {}) {
  return {
    id: 'f1',
    requester_id: 'user-a',
    addressee_id: 'user-b',
    status: 'pending',
    created_at: '2026-01-01T00:00:00Z',
    responded_at: null,
    ...overrides,
  }
}

function profile(id, username = 'alice') {
  return { id, username, full_name: null }
}

beforeEach(() => {
  supabase.from.mockReset()
  supabase.rpc.mockReset()
})

// ─── loadFriendships ─────────────────────────────────────────────────────────

describe('loadFriendships', () => {
  it('throws when the friendships query fails', async () => {
    supabase.from.mockReturnValue(
      makeFriendshipsQuery({ data: null, error: new Error('db error') })
    )
    await expect(loadFriendships('user-a')).rejects.toThrow('db error')
  })

  it('returns empty buckets when there are no friendships', async () => {
    supabase.from.mockReturnValue(
      makeFriendshipsQuery({ data: [], error: null })
    )
    const result = await loadFriendships('user-a')
    expect(result).toEqual({ incoming: [], outgoing: [], friends: [], all: [] })
    expect(supabase.from).toHaveBeenCalledTimes(1)
  })

  it('places an accepted row in the friends bucket when user is the requester', async () => {
    const row = friendship({ status: 'accepted', requester_id: 'user-a', addressee_id: 'user-b' })
    supabase.from.mockImplementation(table => {
      if (table === 'friendships') return makeFriendshipsQuery({ data: [row], error: null })
    })
    supabase.rpc.mockResolvedValue({ data: [profile('user-b', 'bob')], error: null })
    const result = await loadFriendships('user-a')
    expect(result.friends).toHaveLength(1)
    expect(result.friends[0].direction).toBe('friend')
    expect(result.friends[0].otherUserId).toBe('user-b')
    expect(result.incoming).toHaveLength(0)
    expect(result.outgoing).toHaveLength(0)
  })

  it('places an accepted row in the friends bucket when user is the addressee', async () => {
    const row = friendship({ status: 'accepted', requester_id: 'user-b', addressee_id: 'user-a' })
    supabase.from.mockImplementation(table => {
      if (table === 'friendships') return makeFriendshipsQuery({ data: [row], error: null })
    })
    supabase.rpc.mockResolvedValue({ data: [profile('user-b', 'bob')], error: null })
    const result = await loadFriendships('user-a')
    expect(result.friends).toHaveLength(1)
    expect(result.friends[0].otherUserId).toBe('user-b')
  })

  it('places a pending row in outgoing when user is the requester', async () => {
    const row = friendship({ status: 'pending', requester_id: 'user-a', addressee_id: 'user-b' })
    supabase.from.mockImplementation(table => {
      if (table === 'friendships') return makeFriendshipsQuery({ data: [row], error: null })
    })
    supabase.rpc.mockResolvedValue({ data: [profile('user-b')], error: null })
    const result = await loadFriendships('user-a')
    expect(result.outgoing).toHaveLength(1)
    expect(result.outgoing[0].direction).toBe('outgoing')
    expect(result.incoming).toHaveLength(0)
  })

  it('places a pending row in incoming when user is the addressee', async () => {
    const row = friendship({ status: 'pending', requester_id: 'user-b', addressee_id: 'user-a' })
    supabase.from.mockImplementation(table => {
      if (table === 'friendships') return makeFriendshipsQuery({ data: [row], error: null })
    })
    supabase.rpc.mockResolvedValue({ data: [profile('user-b')], error: null })
    const result = await loadFriendships('user-a')
    expect(result.incoming).toHaveLength(1)
    expect(result.incoming[0].direction).toBe('incoming')
  })

  it('sorts friends alphabetically by username', async () => {
    const rows = [
      friendship({ id: 'f1', status: 'accepted', requester_id: 'user-a', addressee_id: 'user-z' }),
      friendship({ id: 'f2', status: 'accepted', requester_id: 'user-a', addressee_id: 'user-m' }),
    ]
    supabase.from.mockImplementation(table => {
      if (table === 'friendships') return makeFriendshipsQuery({ data: rows, error: null })
    })
    supabase.rpc.mockResolvedValue({
      data: [profile('user-z', 'zara'), profile('user-m', 'mia')],
      error: null,
    })
    const result = await loadFriendships('user-a')
    expect(result.friends.map(f => f.otherProfile.username)).toEqual(['mia', 'zara'])
  })

  it('sets otherProfile to null when the profile is not returned from the DB', async () => {
    const row = friendship({ status: 'accepted', requester_id: 'user-a', addressee_id: 'user-b' })
    supabase.from.mockImplementation(table => {
      if (table === 'friendships') return makeFriendshipsQuery({ data: [row], error: null })
    })
    supabase.rpc.mockResolvedValue({ data: [], error: null })
    const result = await loadFriendships('user-a')
    expect(result.friends[0].otherProfile).toBeNull()
  })

  it('throws when the public profiles RPC fails', async () => {
    const row = friendship({ status: 'accepted', requester_id: 'user-a', addressee_id: 'user-b' })
    supabase.from.mockImplementation(table => {
      if (table === 'friendships') return makeFriendshipsQuery({ data: [row], error: null })
    })
    supabase.rpc.mockResolvedValue({ data: null, error: new Error('profile error') })
    await expect(loadFriendships('user-a')).rejects.toThrow('profile error')
  })
})

// ─── searchFriendProfiles ────────────────────────────────────────────────────

describe('searchFriendProfiles', () => {
  it('returns [] for an empty string without calling Supabase', async () => {
    expect(await searchFriendProfiles('')).toEqual([])
    expect(supabase.rpc).not.toHaveBeenCalled()
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('returns [] for a whitespace-only string', async () => {
    expect(await searchFriendProfiles('   ')).toEqual([])
    expect(supabase.rpc).not.toHaveBeenCalled()
  })

  it('returns RPC data when the RPC succeeds', async () => {
    const rpcData = [{ id: 'user-b', username: 'bob' }]
    supabase.rpc.mockResolvedValue({ data: rpcData, error: null })
    const result = await searchFriendProfiles('bob')
    expect(result).toEqual(rpcData)
    expect(supabase.rpc).toHaveBeenCalledWith('search_profiles_for_friendship', { p_search: 'bob' })
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('throws when the RPC returns an error', async () => {
    supabase.rpc.mockResolvedValue({ data: null, error: { code: '42501', message: 'permission denied' } })
    await expect(searchFriendProfiles('bob')).rejects.toMatchObject({ message: 'permission denied' })
    expect(supabase.from).not.toHaveBeenCalled()
  })
})

// ─── sendFriendRequest ───────────────────────────────────────────────────────

describe('sendFriendRequest', () => {
  it('resolves cleanly on success', async () => {
    supabase.from.mockReturnValue(makeInsertQuery({ error: null }))
    await expect(sendFriendRequest('user-a', 'user-b')).resolves.toBeUndefined()
  })

  it('throws on DB error', async () => {
    supabase.from.mockReturnValue(makeInsertQuery({ error: new Error('insert failed') }))
    await expect(sendFriendRequest('user-a', 'user-b')).rejects.toThrow('insert failed')
  })
})

// ─── acceptFriendRequest ─────────────────────────────────────────────────────

describe('acceptFriendRequest', () => {
  it('resolves cleanly on success', async () => {
    supabase.from.mockReturnValue(makeUpdateQuery({ error: null }))
    await expect(acceptFriendRequest('f1', 'user-a')).resolves.toBeUndefined()
  })

  it('throws on DB error', async () => {
    supabase.from.mockReturnValue(makeUpdateQuery({ error: new Error('update failed') }))
    await expect(acceptFriendRequest('f1', 'user-a')).rejects.toThrow('update failed')
  })
})

// ─── removeFriendship ────────────────────────────────────────────────────────

describe('removeFriendship', () => {
  it('resolves cleanly on success', async () => {
    supabase.from.mockReturnValue(makeDeleteQuery({ error: null }))
    await expect(removeFriendship('f1', 'user-a')).resolves.toBeUndefined()
  })

  it('throws on DB error', async () => {
    supabase.from.mockReturnValue(makeDeleteQuery({ error: new Error('delete failed') }))
    await expect(removeFriendship('f1', 'user-a')).rejects.toThrow('delete failed')
  })
})
