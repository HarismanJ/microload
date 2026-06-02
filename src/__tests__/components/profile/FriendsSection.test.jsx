// Hoisted mocks for supabase realtime channel + friends/battles libs

const supabaseMock = vi.hoisted(() => {
  const channelStub = {
    on: vi.fn(),
    subscribe: vi.fn(() => channelStub),
  }
  // Make .on chainable to itself
  channelStub.on.mockReturnValue(channelStub)
  return {
    channel: vi.fn(() => channelStub),
    removeChannel: vi.fn(),
    _channelStub: channelStub,
  }
})

const loadFriendshipsMock = vi.hoisted(() => vi.fn(async () => ({ incoming: [], outgoing: [], friends: [], all: [] })))
const removeFriendshipMock = vi.hoisted(() => vi.fn(async () => undefined))
const searchFriendProfilesMock = vi.hoisted(() => vi.fn(async () => []))
const sendFriendRequestMock = vi.hoisted(() => vi.fn(async () => undefined))
const acceptFriendRequestMock = vi.hoisted(() => vi.fn(async () => undefined))
const loadHeadToHeadByOpponentMock = vi.hoisted(() => vi.fn(async () => ({})))

vi.mock('../../../lib/supabase', () => ({ supabase: supabaseMock }))
vi.mock('../../../lib/friends', () => ({
  loadFriendships:       loadFriendshipsMock,
  removeFriendship:      removeFriendshipMock,
  searchFriendProfiles:  searchFriendProfilesMock,
  sendFriendRequest:     sendFriendRequestMock,
  acceptFriendRequest:   acceptFriendRequestMock,
}))
vi.mock('../../../lib/battles', () => ({
  BATTLE_MODES:               ['strength', 'hybrid', 'cardio'],
  getBattleModeLabel:         vi.fn(mode => mode === 'strength' ? 'Strength' : mode === 'hybrid' ? 'Hybrid' : 'Cardio'),
  loadHeadToHeadByOpponent:   loadHeadToHeadByOpponentMock,
}))

import { render, fireEvent, screen, waitFor, act } from '@testing-library/react'
import FriendsSection from '../../../components/profile/FriendsSection.jsx'

function renderSection(overrides = {}) {
  return render(
    <FriendsSection
      userId="user-1"
      username="alice"
      profileLoaded={true}
      onChallenge={vi.fn()}
      onViewProfile={vi.fn()}
      workoutActive={false}
      {...overrides}
    />
  )
}

describe('FriendsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // The channel mock returns chainable .on chains, then .subscribe accepts a status callback
    supabaseMock._channelStub.on.mockReturnValue(supabaseMock._channelStub)
    supabaseMock._channelStub.subscribe.mockImplementation(() => supabaseMock._channelStub)
    loadFriendshipsMock.mockResolvedValue({ incoming: [], outgoing: [], friends: [], all: [] })
    loadHeadToHeadByOpponentMock.mockResolvedValue({})
  })

  it('disables search and shows the hint when username is missing', async () => {
    const { container } = renderSection({ username: '' })
    await act(async () => {})

    const input = container.querySelector('.friends-search-input')
    expect(input.disabled).toBe(true)
    expect(container.textContent).toContain('Add a username in Edit Profile so friends can find you')
  })

  it('does not call searchFriendProfiles when the query is < 2 chars', async () => {
    const { container } = renderSection()
    await act(async () => {})

    const input = container.querySelector('.friends-search-input')
    fireEvent.change(input, { target: { value: 'b' } })
    await act(async () => { await new Promise(r => setTimeout(r, 300)) })

    expect(searchFriendProfilesMock).not.toHaveBeenCalled()
  })

  it('calls searchFriendProfiles after the 250ms debounce when query >= 2 chars', async () => {
    searchFriendProfilesMock.mockResolvedValueOnce([
      { id: 'user-2', username: 'bob', full_name: 'Bob B' },
    ])
    const { container } = renderSection()
    await act(async () => {})

    const input = container.querySelector('.friends-search-input')
    fireEvent.change(input, { target: { value: 'bob' } })
    await act(async () => { await new Promise(r => setTimeout(r, 300)) })

    expect(searchFriendProfilesMock).toHaveBeenCalledWith('bob')
  })

  it('successful sendFriendRequest renders the success notice', async () => {
    searchFriendProfilesMock.mockResolvedValueOnce([
      { id: 'user-2', username: 'bob', full_name: 'Bob B' },
    ])
    const { container } = renderSection()
    await act(async () => {})

    fireEvent.change(container.querySelector('.friends-search-input'), { target: { value: 'bob' } })
    await act(async () => { await new Promise(r => setTimeout(r, 300)) })

    const addBtn = await screen.findByText('Add')
    await act(async () => { fireEvent.click(addBtn) })

    expect(sendFriendRequestMock).toHaveBeenCalledWith('user-1', 'user-2')
    await waitFor(() => {
      expect(screen.getByText(/Friend request sent to/)).toBeTruthy()
    })
  })

  it('duplicate-key error (23505) renders the "already have pending" message', async () => {
    const dupError = Object.assign(new Error('duplicate key'), { code: '23505' })
    sendFriendRequestMock.mockRejectedValueOnce(dupError)
    searchFriendProfilesMock.mockResolvedValueOnce([
      { id: 'user-2', username: 'bob', full_name: 'Bob B' },
    ])
    const { container } = renderSection()
    await act(async () => {})

    fireEvent.change(container.querySelector('.friends-search-input'), { target: { value: 'bob' } })
    await act(async () => { await new Promise(r => setTimeout(r, 300)) })

    const addBtn = await screen.findByText('Add')
    await act(async () => { fireEvent.click(addBtn) })

    await waitFor(() => {
      expect(screen.getByText(/already have a pending request/)).toBeTruthy()
    })
  })

  it('rate-limit error (P0001) for friend_request renders the rate-limit message', async () => {
    const rateError = Object.assign(
      new Error('Rate limit exceeded for friend_request'),
      { code: 'P0001' }
    )
    sendFriendRequestMock.mockRejectedValueOnce(rateError)
    searchFriendProfilesMock.mockResolvedValueOnce([
      { id: 'user-2', username: 'bob', full_name: 'Bob B' },
    ])
    const { container } = renderSection()
    await act(async () => {})

    fireEvent.change(container.querySelector('.friends-search-input'), { target: { value: 'bob' } })
    await act(async () => { await new Promise(r => setTimeout(r, 300)) })

    const addBtn = await screen.findByText('Add')
    await act(async () => { fireEvent.click(addBtn) })

    await waitFor(() => {
      expect(screen.getByText(/sent a lot of friend requests recently/)).toBeTruthy()
    })
  })

  it('accept-request flow calls acceptFriendRequest and surfaces the notice', async () => {
    loadFriendshipsMock.mockResolvedValueOnce({
      incoming: [{
        id: 'f-1',
        otherUserId: 'user-2',
        otherProfile: { username: 'bob', full_name: 'Bob B' },
        status: 'pending',
        direction: 'incoming',
      }],
      outgoing: [],
      friends: [],
      all: [{ otherUserId: 'user-2' }],
    })

    renderSection()
    await act(async () => {})

    const acceptBtn = await screen.findByText('Accept')
    await act(async () => { fireEvent.click(acceptBtn) })

    expect(acceptFriendRequestMock).toHaveBeenCalledWith('f-1', 'user-1')
  })

  it('decline-request flow calls removeFriendship for the incoming row', async () => {
    loadFriendshipsMock.mockResolvedValueOnce({
      incoming: [{
        id: 'f-1',
        otherUserId: 'user-2',
        otherProfile: { username: 'bob', full_name: 'Bob B' },
        status: 'pending',
        direction: 'incoming',
      }],
      outgoing: [],
      friends: [],
      all: [{ otherUserId: 'user-2' }],
    })

    renderSection()
    await act(async () => {})

    const declineBtn = await screen.findByText('Decline')
    await act(async () => { fireEvent.click(declineBtn) })

    expect(removeFriendshipMock).toHaveBeenCalledWith('f-1', 'user-1')
  })

  it('challenge button is disabled when workoutActive=true', async () => {
    loadFriendshipsMock.mockResolvedValueOnce({
      incoming: [],
      outgoing: [],
      friends: [{
        id: 'f-1',
        otherUserId: 'user-2',
        otherProfile: { username: 'bob', full_name: 'Bob B' },
        status: 'accepted',
        direction: 'friend',
      }],
      all: [{ otherUserId: 'user-2' }],
    })

    const { container } = renderSection({ workoutActive: true })
    await act(async () => {})

    // When workoutActive=true the label flips to "Finish workout first" and is disabled
    await screen.findByText('Finish workout first')
    const challengeBtn = container.querySelector('.friends-primary-btn')
    expect(challengeBtn.disabled).toBe(true)
    expect(challengeBtn.textContent).toBe('Finish workout first')
  })

  it('challenge button opens the battle-mode modal which dispatches onChallenge with the chosen mode', async () => {
    const onChallenge = vi.fn().mockResolvedValue(undefined)
    loadFriendshipsMock.mockResolvedValueOnce({
      incoming: [],
      outgoing: [],
      friends: [{
        id: 'f-1',
        otherUserId: 'user-2',
        otherProfile: { username: 'bob', full_name: 'Bob B' },
        status: 'accepted',
        direction: 'friend',
      }],
      all: [{ otherUserId: 'user-2' }],
    })

    renderSection({ onChallenge })
    await act(async () => {})

    const challengeBtn = await screen.findByText(/Challenge/i)
    await act(async () => { fireEvent.click(challengeBtn) })

    // Modal opens (rendered via a portal into document.body, not inside container)
    expect(document.body.querySelector('.friends-battle-mode-modal')).toBeTruthy()

    // Click the "Strength" battle mode option
    const strengthBtn = screen.getByText('Strength')
    await act(async () => { fireEvent.click(strengthBtn) })

    expect(onChallenge).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'f-1', otherUserId: 'user-2' }),
      'strength'
    )
  })
})
