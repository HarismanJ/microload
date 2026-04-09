import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { loadHeadToHeadByOpponent } from '../../lib/battles'
import LoadingSpinner from '../LoadingSpinner'
import {
  acceptFriendRequest,
  loadFriendships,
  removeFriendship,
  searchFriendProfiles,
  sendFriendRequest,
} from '../../lib/friends'

function getDisplayName(profile) {
  return profile?.full_name || profile?.username || 'Unknown user'
}

function getUsername(profile) {
  return profile?.username ? `@${profile.username}` : 'No username yet'
}

function getFriendlyFriendsError(err, fallback) {
  const message = err?.message || ''
  if (message.toLowerCase().includes('failed to fetch')) {
    return 'Your connection dropped for a moment. Please try again.'
  }
  return message || fallback
}

export default function FriendsSection({ userId, username, profileLoaded = false, onChallenge, onViewProfile }) {
  const [overview, setOverview] = useState({ incoming: [], outgoing: [], friends: [], all: [] })
  const [headToHead, setHeadToHead] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [friendFilter, setFriendFilter] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState([])
  const [searchError, setSearchError] = useState('')
  const [actionKey, setActionKey] = useState('')
  const [notice, setNotice] = useState('')
  const hasUsername = Boolean(username?.trim())
  const missingUsername = profileLoaded && !hasUsername
  const canSearchForFriends = profileLoaded && hasUsername

  const refreshFriends = useCallback(async ({ silent = false } = {}) => {
    if (!userId) return

    if (!silent) {
      setLoading(true)
      setError('')
    }

    try {
      const next = await loadFriendships(userId)
      setOverview(next)

      const friendIds = next.friends.map(friendship => friendship.otherUserId)
      const nextHeadToHead = await loadHeadToHeadByOpponent(userId, friendIds)
      setHeadToHead(nextHeadToHead)
      return true
    } catch (err) {
      if (!silent) {
        setError(getFriendlyFriendsError(err, 'Could not load your friends right now.'))
      }
      return false
    } finally {
      if (!silent) setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    refreshFriends()
  }, [refreshFriends])

  useEffect(() => {
    const interval = setInterval(() => refreshFriends({ silent: true }), 15000)
    return () => clearInterval(interval)
  }, [refreshFriends])

  useEffect(() => {
    if (!userId) return undefined

    const channel = supabase
      .channel(`friendships-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'friendships', filter: `requester_id=eq.${userId}` },
        () => { refreshFriends({ silent: true }) }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'friendships', filter: `addressee_id=eq.${userId}` },
        () => { refreshFriends({ silent: true }) }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'workout_rooms', filter: `challenger_id=eq.${userId}` },
        () => { refreshFriends({ silent: true }) }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'workout_rooms', filter: `challenged_id=eq.${userId}` },
        () => { refreshFriends({ silent: true }) }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [refreshFriends, userId])

  const relationByUserId = useMemo(() => {
    return new Map(overview.all.map(row => [row.otherUserId, row]))
  }, [overview.all])

  const filteredFriends = useMemo(() => {
    const term = friendFilter.trim().toLowerCase()
    if (!term) return overview.friends

    return overview.friends.filter(friendship => {
      const full = friendship.otherProfile?.full_name?.toLowerCase() || ''
      const handle = friendship.otherProfile?.username?.toLowerCase() || ''
      return full.includes(term) || handle.includes(term)
    })
  }, [friendFilter, overview.friends])

  useEffect(() => {
    if (!canSearchForFriends) {
      setSearchResults([])
      setSearchError('')
      setSearching(false)
      return
    }

    const term = search.trim()

    if (!term) {
      setSearchResults([])
      setSearchError('')
      setSearching(false)
      return
    }

    if (term.length < 2) {
      setSearchResults([])
      setSearchError('')
      setSearching(false)
      return
    }

    let cancelled = false
    const timer = setTimeout(async () => {
      setSearching(true)
      setSearchError('')

      try {
        const results = await searchFriendProfiles(term, userId)
        if (!cancelled) {
          setSearchResults(results.filter(profile => !relationByUserId.has(profile.id)))
        }
      } catch (err) {
        if (!cancelled) {
          setSearchResults([])
          setSearchError(err.message || 'Could not search for users right now.')
        }
      } finally {
        if (!cancelled) setSearching(false)
      }
    }, 250)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [canSearchForFriends, search, userId, relationByUserId])

  async function handleSendRequest(profile) {
    if (!canSearchForFriends) {
      setSearchError('You need to add a username before you can search for or add friends.')
      return
    }

    const key = `send-${profile.id}`
    setActionKey(key)
    setNotice('')
    setSearchError('')

    try {
      await sendFriendRequest(userId, profile.id)
      const refreshed = await refreshFriends()
      setSearchResults(results => results.filter(result => result.id !== profile.id))
      setNotice(
        refreshed
          ? `Friend request sent to ${getDisplayName(profile)}.`
          : `Friend request sent to ${getDisplayName(profile)}. Your list will refresh when the connection settles.`
      )
    } catch (err) {
      const message = err.code === '23505'
        ? 'You already have a pending request or friendship with that user.'
        : getFriendlyFriendsError(err, 'Could not send that friend request.')
      setSearchError(message)
    } finally {
      setActionKey('')
    }
  }

  async function handleAccept(friendship) {
    const key = `accept-${friendship.id}`
    setActionKey(key)
    setNotice('')
    setError('')

    try {
      await acceptFriendRequest(friendship.id)
      await refreshFriends()
      setNotice(`You and ${getDisplayName(friendship.otherProfile)} are now friends.`)
    } catch (err) {
      setError(getFriendlyFriendsError(err, 'Could not accept that request.'))
    } finally {
      setActionKey('')
    }
  }

  async function handleRemove(friendship, label) {
    const key = `remove-${friendship.id}`
    setActionKey(key)
    setNotice('')
    setError('')

    try {
      await removeFriendship(friendship.id)
      await refreshFriends()
      setNotice(label)
    } catch (err) {
      setError(getFriendlyFriendsError(err, 'Could not update that friendship.'))
    } finally {
      setActionKey('')
    }
  }

  async function handleChallenge(friendship) {
    if (!username || !friendship.otherProfile?.username) {
      setError('Both friends need usernames before a battle can start.')
      setNotice('')
      return
    }

    const key = `challenge-${friendship.id}`
    setActionKey(key)
    setError('')
    setNotice('')

    try {
      if (onChallenge) {
        await onChallenge(friendship)
        setNotice(`Challenge sent to ${getDisplayName(friendship.otherProfile)}.`)
      } else {
        setNotice(`Challenge button added for ${getDisplayName(friendship.otherProfile)}. Battle setup is the next piece to wire in.`)
      }
    } catch (err) {
      const message = err.code === '23505'
        ? 'You already have a pending battle invite with that friend.'
        : err.code === 'missing_username'
          ? 'Both friends need usernames before a battle can start.'
        : getFriendlyFriendsError(err, 'Could not send that battle invite.')
      setError(message)
    } finally {
      setActionKey('')
    }
  }

  return (
    <div className="friends-card">
      <div className="friends-card-header">
        <div>
          <div className="friends-card-title">Friends</div>
          <div className="friends-card-subtitle">
            {username
              ? `Friends can find you at @${username}`
              : missingUsername
                ? 'Add a username in Edit Profile so friends can find you'
                : 'Loading your friend profile...'}
          </div>
        </div>
        <div className="friends-card-count">{overview.friends.length} total</div>
      </div>

      <div className="friends-search">
        <input
          className="friends-search-input"
          placeholder={
            canSearchForFriends
              ? 'Search by username'
              : missingUsername
                ? 'Add a username to unlock friend search'
                : 'Loading your profile...'
          }
          value={search}
          onChange={event => setSearch(event.target.value)}
          disabled={!canSearchForFriends}
        />
      </div>
      {missingUsername && (
        <div className="friends-search-hint">
          You need to enter a username in Edit Profile before you can search for friends.
        </div>
      )}

      {notice && <div className="friends-notice">{notice}</div>}
      {error && <div className="friends-error">{error}</div>}
      {searchError && <div className="friends-error">{searchError}</div>}

      {canSearchForFriends && search.trim().length >= 2 && (
        <div className="friends-search-results friends-scroll-panel">
          {searching && <div className="friends-empty">Searching...</div>}
          {!searching && searchResults.length === 0 && !searchError && (
            <div className="friends-empty">No available users found for that username.</div>
          )}
          {!searching && searchResults.map(profile => (
            <div key={profile.id} className="friends-person-row">
              <div>
                <div className="friends-person-name">{getDisplayName(profile)}</div>
                <div className="friends-person-handle">{getUsername(profile)}</div>
              </div>
              <button
                className="friends-action-btn"
                onClick={() => handleSendRequest(profile)}
                disabled={actionKey === `send-${profile.id}`}
              >
                {actionKey === `send-${profile.id}` ? 'Sending...' : 'Add'}
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="friends-groups">
        <div className="friends-group">
          <div className="friends-group-title">Incoming Requests</div>
          <div className="friends-scroll-panel">
            {loading ? (
              <div className="friends-empty"><LoadingSpinner size="md" /></div>
            ) : overview.incoming.length === 0 ? (
              <div className="friends-empty">No incoming requests.</div>
            ) : (
              overview.incoming.map(friendship => (
                <div key={friendship.id} className="friends-person-row friends-person-row-stack">
                  <div>
                    <div className="friends-person-name">{getDisplayName(friendship.otherProfile)}</div>
                    <div className="friends-person-handle">{getUsername(friendship.otherProfile)}</div>
                  </div>
                  <div className="friends-row-actions">
                    <button
                      className="friends-primary-btn"
                      onClick={() => handleAccept(friendship)}
                      disabled={actionKey === `accept-${friendship.id}`}
                    >
                      {actionKey === `accept-${friendship.id}` ? 'Accepting...' : 'Accept'}
                    </button>
                    <button
                      className="friends-secondary-btn"
                      onClick={() => handleRemove(friendship, 'Friend request declined.')}
                      disabled={actionKey === `remove-${friendship.id}`}
                    >
                      {actionKey === `remove-${friendship.id}` ? 'Removing...' : 'Decline'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="friends-group">
          <div className="friends-group-title">Sent Requests</div>
          <div className="friends-scroll-panel">
            {loading ? (
              <div className="friends-empty"><LoadingSpinner size="md" /></div>
            ) : overview.outgoing.length === 0 ? (
              <div className="friends-empty">No pending requests sent.</div>
            ) : (
              overview.outgoing.map(friendship => (
                <div key={friendship.id} className="friends-person-row friends-person-row-stack">
                  <div>
                    <div className="friends-person-name">{getDisplayName(friendship.otherProfile)}</div>
                    <div className="friends-person-handle">{getUsername(friendship.otherProfile)}</div>
                  </div>
                  <button
                    className="friends-secondary-btn"
                    onClick={() => handleRemove(friendship, 'Friend request cancelled.')}
                    disabled={actionKey === `remove-${friendship.id}`}
                  >
                    {actionKey === `remove-${friendship.id}` ? 'Removing...' : 'Cancel request'}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="friends-group">
          <div className="friends-group-head">
            <div className="friends-group-title">Your Friends</div>
            <input
              className="friends-list-search-input"
              placeholder="Filter friends"
              value={friendFilter}
              onChange={event => setFriendFilter(event.target.value)}
            />
          </div>
          <div className="friends-scroll-panel friends-scroll-panel-friends">
            {loading ? (
              <div className="friends-empty"><LoadingSpinner size="md" /></div>
            ) : overview.friends.length === 0 ? (
              <div className="friends-empty">No friends yet.</div>
            ) : filteredFriends.length === 0 ? (
              <div className="friends-empty">No friends match that search.</div>
            ) : (
              filteredFriends.map(friendship => {
                const tracker = headToHead[friendship.otherUserId]

                return (
                <div key={friendship.id} className="friends-person-row friends-person-row-stack">
                  <div>
                    <div className="friends-person-name">{getDisplayName(friendship.otherProfile)}</div>
                    <div className="friends-person-handle">{getUsername(friendship.otherProfile)}</div>
                    {tracker?.total > 0 ? (
                      <div className="friends-headtohead">
                        <div className="friends-headtohead-label">Head to Head</div>
                        <div className="friends-headtohead-record">
                          <span className="friends-headtohead-pill friends-headtohead-pill-win">{tracker.wins}W</span>
                          <span className="friends-headtohead-pill friends-headtohead-pill-loss">{tracker.losses}L</span>
                          <span className="friends-headtohead-pill friends-headtohead-pill-tie">{tracker.ties}T</span>
                        </div>
                      </div>
                    ) : (
                      <div className="friends-person-record-empty">No battles yet.</div>
                    )}
                    {(!username || !friendship.otherProfile?.username) && (
                      <div className="friends-person-hint">Battles require usernames for both friends.</div>
                    )}
                  </div>
                  <div className="friends-row-actions">
                    <button
                      className="friends-secondary-btn"
                      onClick={() => onViewProfile?.(friendship.otherProfile)}
                    >
                      View Profile
                    </button>
                    <button
                      className="friends-primary-btn"
                      onClick={() => handleChallenge(friendship)}
                      disabled={actionKey === `challenge-${friendship.id}` || !username || !friendship.otherProfile?.username}
                    >
                      {actionKey === `challenge-${friendship.id}`
                        ? 'Sending...'
                        : !username || !friendship.otherProfile?.username
                          ? 'Need usernames'
                          : 'Challenge'}
                    </button>
                    <button
                      className="friends-secondary-btn"
                      onClick={() => handleRemove(friendship, 'Friend removed.')}
                      disabled={actionKey === `remove-${friendship.id}`}
                    >
                      {actionKey === `remove-${friendship.id}` ? 'Removing...' : 'Remove'}
                    </button>
                  </div>
                </div>
              )})
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
