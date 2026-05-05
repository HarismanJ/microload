import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useFocusTrap } from '../../lib/useFocusTrap'
import { supabase } from '../../lib/supabase'
import { BATTLE_MODES, getBattleModeLabel, loadHeadToHeadByOpponent } from '../../lib/battles'
import LoadingSpinner from '../LoadingSpinner'
import {
  acceptFriendRequest,
  loadFriendships,
  removeFriendship,
  searchFriendProfiles,
  sendFriendRequest,
} from '../../lib/friends'
import { VALIDATION_LIMITS } from '../../lib/inputValidation'

const FRIENDS_REALTIME_REFRESH_DEBOUNCE_MS = 120
const FRIENDS_FOREGROUND_REFRESH_DEBOUNCE_MS = 180
const FRIENDS_FALLBACK_POLL_MS = 60 * 1000

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

export default function FriendsSection({ userId, username, profileLoaded = false, onChallenge, onViewProfile, workoutActive = false }) {
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
  const [battleModeFriendship, setBattleModeFriendship] = useState(null)
  const battleModeModalRef = useRef(null)
  useFocusTrap(battleModeModalRef, { active: !!battleModeFriendship, onEscape: () => setBattleModeFriendship(null) })
  const friendsRefreshTimerRef = useRef(null)
  const friendsFallbackPollRef = useRef(null)
  const friendsRealtimeHealthyRef = useRef(true)
  const hasUsername = Boolean(username?.trim())
  const missingUsername = profileLoaded && !hasUsername
  const canSearchForFriends = profileLoaded && hasUsername

  const clearScheduledFriendsRefresh = useCallback(() => {
    if (!friendsRefreshTimerRef.current) return
    clearTimeout(friendsRefreshTimerRef.current)
    friendsRefreshTimerRef.current = null
  }, [friendsRefreshTimerRef])

  const clearFriendsFallbackPoll = useCallback(() => {
    if (!friendsFallbackPollRef.current) return
    clearInterval(friendsFallbackPollRef.current)
    friendsFallbackPollRef.current = null
  }, [friendsFallbackPollRef])

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

  const scheduleFriendsRefresh = useCallback(({ delayMs = 0, silent = true } = {}) => {
    if (!userId) return

    clearScheduledFriendsRefresh()

    if (delayMs <= 0) {
      refreshFriends({ silent })
      return
    }

    friendsRefreshTimerRef.current = setTimeout(() => {
      friendsRefreshTimerRef.current = null
      refreshFriends({ silent })
    }, delayMs)
  }, [clearScheduledFriendsRefresh, refreshFriends, userId])

  const restartFriendsFallbackPoll = useCallback(() => {
    clearFriendsFallbackPoll()
    if (!userId || friendsRealtimeHealthyRef.current) return

    friendsFallbackPollRef.current = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
      scheduleFriendsRefresh({ silent: true })
    }, FRIENDS_FALLBACK_POLL_MS)
  }, [
    clearFriendsFallbackPoll,
    scheduleFriendsRefresh,
    userId,
  ])

  useEffect(() => {
    refreshFriends()
  }, [refreshFriends])

  useEffect(() => {
    if (!userId) {
      clearScheduledFriendsRefresh()
      clearFriendsFallbackPoll()
      friendsRealtimeHealthyRef.current = true
      return undefined
    }

    friendsRealtimeHealthyRef.current = true

    const scheduleRealtimeRefresh = () => {
      scheduleFriendsRefresh({
        delayMs: FRIENDS_REALTIME_REFRESH_DEBOUNCE_MS,
        silent: true,
      })
    }

    const scheduleForegroundRefresh = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
      scheduleFriendsRefresh({
        delayMs: FRIENDS_FOREGROUND_REFRESH_DEBOUNCE_MS,
        silent: true,
      })
    }

    const handleVisibilityChange = () => {
      if (typeof document === 'undefined' || document.visibilityState !== 'visible') return
      scheduleForegroundRefresh()
    }

    const handleChannelStatus = (status) => {
      if (status === 'SUBSCRIBED') {
        const wasHealthy = friendsRealtimeHealthyRef.current
        friendsRealtimeHealthyRef.current = true
        clearFriendsFallbackPoll()
        if (!wasHealthy) {
          scheduleFriendsRefresh({ silent: true })
        }
        return
      }

      if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR' || status === 'CLOSED') {
        friendsRealtimeHealthyRef.current = false
        restartFriendsFallbackPoll()
      }
    }

    const channel = supabase
      .channel(`friendships-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'friendships', filter: `requester_id=eq.${userId}` },
        scheduleRealtimeRefresh
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'friendships', filter: `addressee_id=eq.${userId}` },
        scheduleRealtimeRefresh
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'workout_rooms', filter: `challenger_id=eq.${userId}` },
        scheduleRealtimeRefresh
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'workout_rooms', filter: `challenged_id=eq.${userId}` },
        scheduleRealtimeRefresh
      )
      .subscribe(handleChannelStatus)

    if (typeof window !== 'undefined') {
      window.addEventListener('focus', scheduleForegroundRefresh)
    }
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange)
    }

    return () => {
      clearScheduledFriendsRefresh()
      clearFriendsFallbackPoll()
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', scheduleForegroundRefresh)
      }
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange)
      }
      supabase.removeChannel(channel)
    }
  }, [
    clearFriendsFallbackPoll,
    clearScheduledFriendsRefresh,
    restartFriendsFallbackPoll,
    scheduleFriendsRefresh,
    userId,
  ])

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
  }, [canSearchForFriends, relationByUserId, search, userId])

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
      await acceptFriendRequest(friendship.id, userId)
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
      await removeFriendship(friendship.id, userId)
      await refreshFriends()
      setNotice(label)
    } catch (err) {
      setError(getFriendlyFriendsError(err, 'Could not update that friendship.'))
    } finally {
      setActionKey('')
    }
  }

  async function handleChallenge(friendship, battleMode) {
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
        await onChallenge(friendship, battleMode)
        setNotice(`${getBattleModeLabel(battleMode)} challenge sent to ${getDisplayName(friendship.otherProfile)}.`)
      } else {
        setNotice(`Challenge button added for ${getDisplayName(friendship.otherProfile)}. Battle setup is the next piece to wire in.`)
      }
      setBattleModeFriendship(null)
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
          maxLength={VALIDATION_LIMITS.searchMaxLength}
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
              maxLength={VALIDATION_LIMITS.searchMaxLength}
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
                      onClick={() => setBattleModeFriendship(friendship)}
                      disabled={actionKey === `challenge-${friendship.id}` || !username || !friendship.otherProfile?.username || workoutActive}
                    >
                      {actionKey === `challenge-${friendship.id}`
                        ? 'Sending...'
                        : workoutActive
                          ? 'Finish workout first'
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
      {battleModeFriendship && (
        <div className="friends-battle-mode-overlay" onClick={() => setBattleModeFriendship(null)}>
          <div className="friends-battle-mode-modal" onClick={event => event.stopPropagation()} ref={battleModeModalRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="battle-mode-title">
            <div className="friends-battle-mode-kicker">Choose Battle</div>
            <div id="battle-mode-title" className="friends-battle-mode-title">
              {`Challenge ${getDisplayName(battleModeFriendship.otherProfile)}`}
            </div>
            <div className="friends-battle-mode-options">
              {BATTLE_MODES.map(mode => (
                <button
                  key={mode}
                  type="button"
                  className="friends-battle-mode-option"
                  onClick={() => handleChallenge(battleModeFriendship, mode)}
                  disabled={actionKey === `challenge-${battleModeFriendship.id}`}
                >
                  <span>{getBattleModeLabel(mode)}</span>
                  <small>
                    {mode === 'strength'
                      ? 'Lifting volume and shared strength'
                      : mode === 'cardio'
                        ? 'Cardio time and intensity'
                        : 'Strength plus cardio balance'}
                  </small>
                </button>
              ))}
            </div>
            <button
              type="button"
              className="friends-battle-mode-cancel"
              onClick={() => setBattleModeFriendship(null)}
              disabled={actionKey === `challenge-${battleModeFriendship.id}`}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
