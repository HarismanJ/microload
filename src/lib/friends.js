import { supabase } from './supabase'

function sortByDateDesc(a, b) {
  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
}

function displayName(profile) {
  return profile?.full_name || profile?.username || 'Unknown user'
}

async function fetchProfilesByIds(ids) {
  if (!ids.length) return {}

  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, full_name')
    .in('id', ids)

  if (error) throw error

  return Object.fromEntries((data ?? []).map(profile => [profile.id, profile]))
}

export async function loadFriendships(userId) {
  const { data: friendships, error } = await supabase
    .from('friendships')
    .select('id, requester_id, addressee_id, status, created_at, responded_at')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
    .order('created_at', { ascending: false })

  if (error) throw error

  const rows = friendships ?? []
  const otherIds = [...new Set(rows.map(row => (row.requester_id === userId ? row.addressee_id : row.requester_id)))]
  const profilesById = await fetchProfilesByIds(otherIds)

  const normalized = rows.map(row => {
    const isRequester = row.requester_id === userId
    const otherUserId = isRequester ? row.addressee_id : row.requester_id

    return {
      ...row,
      direction: row.status === 'accepted' ? 'friend' : isRequester ? 'outgoing' : 'incoming',
      otherUserId,
      otherProfile: profilesById[otherUserId] ?? null,
    }
  })

  return {
    incoming: normalized.filter(row => row.direction === 'incoming').sort(sortByDateDesc),
    outgoing: normalized.filter(row => row.direction === 'outgoing').sort(sortByDateDesc),
    friends: normalized.filter(row => row.direction === 'friend').sort((a, b) => {
      return displayName(a.otherProfile).localeCompare(displayName(b.otherProfile))
    }),
    all: normalized,
  }
}

export async function searchFriendProfiles(searchTerm, currentUserId) {
  const term = searchTerm.trim()
  if (!term) return []

  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, full_name')
    .ilike('username', `%${term}%`)
    .neq('id', currentUserId)
    .order('username', { ascending: true })
    .limit(8)

  if (error) throw error
  return data ?? []
}

export async function sendFriendRequest(requesterId, addresseeId) {
  const { error } = await supabase
    .from('friendships')
    .insert({ requester_id: requesterId, addressee_id: addresseeId })

  if (error) throw error
}

export async function acceptFriendRequest(friendshipId) {
  const { error } = await supabase
    .from('friendships')
    .update({ status: 'accepted', responded_at: new Date().toISOString() })
    .eq('id', friendshipId)

  if (error) throw error
}

export async function removeFriendship(friendshipId) {
  const { error } = await supabase
    .from('friendships')
    .delete()
    .eq('id', friendshipId)

  if (error) throw error
}
