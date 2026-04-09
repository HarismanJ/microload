import { supabase } from './supabase'
import { calculateORM } from './orm'
import { DEFAULT_BODYWEIGHT_KG, getSetVolumeKg, toKg } from './liftMath'

const BATTLE_HEAD_TO_HEAD_TABLE = 'battle_head_to_head'

async function fetchProfilesByIds(ids) {
  if (!ids.length) return {}

  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, full_name, bodyweight, unit_preference')
    .in('id', ids)

  if (error) throw error

  return Object.fromEntries((data ?? []).map(profile => [profile.id, profile]))
}

function resolveBattleBodyweights(profilesById, userId, opponentId) {
  const readKg = (profile) => {
    if (!profile || profile.bodyweight === null || profile.bodyweight === undefined) return null
    const raw = Number(profile.bodyweight)
    if (!Number.isFinite(raw) || raw <= 0) return null
    return profile.unit_preference === 'lbs'
      ? toKg(raw, 'lbs')
      : raw
  }

  const userBw = readKg(profilesById[userId])
  const opponentBw = readKg(profilesById[opponentId])

  if (userBw && opponentBw) {
    return { [userId]: userBw, [opponentId]: opponentBw, fallback: false }
  }

  if (userBw || opponentBw) {
    const shared = userBw || opponentBw
    return { [userId]: shared, [opponentId]: shared, fallback: true }
  }

  return { [userId]: DEFAULT_BODYWEIGHT_KG, [opponentId]: DEFAULT_BODYWEIGHT_KG, fallback: true }
}

function compareMetric(yourValue, opponentValue) {
  if (yourValue === null || opponentValue === null) return null
  if (Math.abs(yourValue - opponentValue) <= 0.01) return 'tie'
  return yourValue > opponentValue ? 'you' : 'opponent'
}

function isMissingBattleHeadToHeadTable(error) {
  const code = error?.code || ''
  const message = error?.message?.toLowerCase?.() || ''
  return (
    code === '42P01'
    || (message.includes('battle_head_to_head') && message.includes('does not exist'))
  )
}

function createEmptyHeadToHeadSummary() {
  return {
    wins: 0,
    losses: 0,
    ties: 0,
    total: 0,
    lastBattleAt: null,
    lastOutcome: null,
  }
}

function normalizeStoredHeadToHeadRow(row) {
  return {
    wins: Number(row?.wins) || 0,
    losses: Number(row?.losses) || 0,
    ties: Number(row?.ties) || 0,
    total: Number(row?.total) || 0,
    lastBattleAt: row?.last_battle_at || null,
    lastOutcome: row?.last_outcome || null,
  }
}

async function loadStoredHeadToHeadSummaries(userId, opponentIds) {
  if (!userId || !opponentIds?.length) {
    return { rowsByOpponent: {}, missingTable: false }
  }

  const { data, error } = await supabase
    .from(BATTLE_HEAD_TO_HEAD_TABLE)
    .select('opponent_id, wins, losses, ties, total, last_battle_at, last_outcome')
    .eq('user_id', userId)
    .in('opponent_id', opponentIds)

  if (error) {
    if (isMissingBattleHeadToHeadTable(error)) {
      return { rowsByOpponent: {}, missingTable: true }
    }
    throw error
  }

  const rowsByOpponent = {}
  for (const row of data ?? []) {
    if (!row?.opponent_id) continue
    rowsByOpponent[row.opponent_id] = normalizeStoredHeadToHeadRow(row)
  }

  return { rowsByOpponent, missingTable: false }
}

async function upsertHeadToHeadSummaries(userId, summariesByOpponent = {}) {
  const payload = Object.entries(summariesByOpponent)
    .filter(([opponentId]) => Boolean(opponentId))
    .map(([opponentId, summary]) => ({
      user_id: userId,
      opponent_id: opponentId,
      wins: Number(summary?.wins) || 0,
      losses: Number(summary?.losses) || 0,
      ties: Number(summary?.ties) || 0,
      total: Number(summary?.total) || 0,
      last_battle_at: summary?.lastBattleAt || null,
      last_outcome: summary?.lastOutcome || null,
    }))

  if (!userId || payload.length === 0) {
    return { missingTable: false }
  }

  const { error } = await supabase
    .from(BATTLE_HEAD_TO_HEAD_TABLE)
    .upsert(payload, { onConflict: 'user_id,opponent_id' })

  if (error) {
    if (isMissingBattleHeadToHeadTable(error)) {
      return { missingTable: true }
    }
    throw error
  }

  return { missingTable: false }
}

async function findPendingBattleInviteBetween(userA, userB) {
  const { data, error } = await supabase
    .from('battle_invites')
    .select('id, challenger_id, challenged_id, status, room_id, created_at, responded_at')
    .eq('status', 'pending')
    .or(`and(challenger_id.eq.${userA},challenged_id.eq.${userB}),and(challenger_id.eq.${userB},challenged_id.eq.${userA})`)
    .order('created_at', { ascending: false })
    .limit(1)

  if (error) throw error
  return data?.[0] ?? null
}

export async function createBattleInvite(challengerId, challengedId) {
  const profilesById = await fetchProfilesByIds([challengerId, challengedId])
  const challenger = profilesById[challengerId]
  const challenged = profilesById[challengedId]

  if (!challenger?.username || !challenged?.username) {
    const error = new Error('Both users need usernames before a battle can start.')
    error.code = 'missing_username'
    throw error
  }

  const existingPending = await findPendingBattleInviteBetween(challengerId, challengedId)
  if (existingPending) {
    return { ...existingPending, reused: true }
  }

  const { data, error } = await supabase
    .from('battle_invites')
    .insert({
      challenger_id: challengerId,
      challenged_id: challengedId,
    })
    .select('id, challenger_id, challenged_id, status, room_id, created_at, responded_at')
    .single()

  if (error) throw error
  return data
}

export async function loadPendingBattleInvite(userId) {
  const { data, error } = await supabase
    .from('battle_invites')
    .select('id, challenger_id, challenged_id, status, room_id, created_at, responded_at')
    .eq('challenged_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)

  if (error) throw error

  const invite = data?.[0]
  if (!invite) return null

  const profilesById = await fetchProfilesByIds([invite.challenger_id])

  return {
    ...invite,
    challengerProfile: profilesById[invite.challenger_id] ?? null,
  }
}

export async function loadLatestDeclinedBattleInvite(userId) {
  const { data, error } = await supabase
    .from('battle_invites')
    .select('id, challenger_id, challenged_id, status, room_id, created_at, responded_at')
    .eq('challenger_id', userId)
    .eq('status', 'declined')
    .not('responded_at', 'is', null)
    .order('responded_at', { ascending: false })
    .limit(1)

  if (error) throw error

  const invite = data?.[0]
  if (!invite) return null

  const profilesById = await fetchProfilesByIds([invite.challenged_id])

  return {
    ...invite,
    challengedProfile: profilesById[invite.challenged_id] ?? null,
  }
}

async function loadHeadToHeadByOpponentLegacy(userId, opponentIds) {
  if (!userId || !opponentIds?.length) return {}

  const pairClauses = opponentIds.flatMap(opponentId => [
    `and(challenger_id.eq.${userId},challenged_id.eq.${opponentId})`,
    `and(challenger_id.eq.${opponentId},challenged_id.eq.${userId})`,
  ])

  const { data, error } = await supabase
    .from('workout_rooms')
    .select('id, challenger_id, challenged_id, finalized_at, ended_at, created_at, status')
    .or(pairClauses.join(','))
    .in('status', ['finished', 'cancelled'])
    .not('finalized_at', 'is', null)
    .order('finalized_at', { ascending: false })

  if (error) throw error

  const opponentIdSet = new Set(opponentIds)
  const relevantRooms = (data ?? []).filter(room => {
    const opponentId = room.challenger_id === userId ? room.challenged_id : room.challenger_id
    return opponentIdSet.has(opponentId)
  })

  if (!relevantRooms.length) return {}

  const recaps = await Promise.all(relevantRooms.map(async (room) => {
    const recap = await loadBattleRecap(room.id, userId)
    return { room, recap }
  }))

  const headToHead = {}

  for (const { room, recap } of recaps) {
    if (!recap || recap.status === 'waiting') continue

    const opponentId = room.challenger_id === userId ? room.challenged_id : room.challenger_id
    const existing = headToHead[opponentId] || {
      wins: 0,
      losses: 0,
      ties: 0,
      total: 0,
      lastBattleAt: null,
      lastOutcome: null,
    }

    existing.total += 1
    if (recap.winner === 'you') existing.wins += 1
    else if (recap.winner === 'opponent') existing.losses += 1
    else existing.ties += 1

    if (!existing.lastBattleAt) {
      existing.lastBattleAt = room.finalized_at || room.ended_at || room.created_at || null
      existing.lastOutcome = recap.winner === 'you'
        ? 'win'
        : recap.winner === 'opponent'
          ? 'loss'
          : 'tie'
    }

    headToHead[opponentId] = existing
  }

  return headToHead
}

async function rebuildHeadToHeadSummaries(userId, opponentIds) {
  const uniqueOpponentIds = [...new Set((opponentIds || []).filter(Boolean))]
  if (!userId || uniqueOpponentIds.length === 0) {
    return { summaries: {}, missingTable: false }
  }

  const legacyHeadToHead = await loadHeadToHeadByOpponentLegacy(userId, uniqueOpponentIds)
  const rebuilt = Object.fromEntries(
    uniqueOpponentIds.map(opponentId => [
      opponentId,
      legacyHeadToHead[opponentId] || createEmptyHeadToHeadSummary(),
    ])
  )

  const { missingTable } = await upsertHeadToHeadSummaries(userId, rebuilt)
  return { summaries: rebuilt, missingTable }
}

export async function loadHeadToHeadByOpponent(userId, opponentIds) {
  const uniqueOpponentIds = [...new Set((opponentIds || []).filter(Boolean))]
  if (!userId || uniqueOpponentIds.length === 0) return {}

  const stored = await loadStoredHeadToHeadSummaries(userId, uniqueOpponentIds)
  if (stored.missingTable) {
    return loadHeadToHeadByOpponentLegacy(userId, uniqueOpponentIds)
  }

  const missingOpponentIds = uniqueOpponentIds.filter(opponentId => !(opponentId in stored.rowsByOpponent))
  if (!missingOpponentIds.length) {
    return stored.rowsByOpponent
  }

  const { summaries: rebuilt } = await rebuildHeadToHeadSummaries(userId, missingOpponentIds)
  return {
    ...stored.rowsByOpponent,
    ...rebuilt,
  }
}

export async function loadActiveBattleRoom(userId) {
  const { data, error } = await supabase
    .from('workout_rooms')
    .select('id, invite_id, challenger_id, challenged_id, status, created_at, ended_at')
    .or(`challenger_id.eq.${userId},challenged_id.eq.${userId}`)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)

  if (error) throw error

  const room = data?.[0]
  if (!room) return null

  const { data: myLatestEvent, error: eventError } = await supabase
    .from('workout_room_events')
    .select('event_type, created_at')
    .eq('room_id', room.id)
    .eq('user_id', userId)
    .in('event_type', ['workout_finished', 'workout_cancelled', 'workout_stale'])
    .order('created_at', { ascending: false })
    .limit(1)

  if (eventError) throw eventError
  const latestType = myLatestEvent?.[0]?.event_type
  if (latestType === 'workout_finished' || latestType === 'workout_cancelled' || latestType === 'workout_stale') {
    return null
  }

  const opponentId = room.challenger_id === userId ? room.challenged_id : room.challenger_id
  const profilesById = await fetchProfilesByIds([opponentId])

  return {
    ...room,
    opponentId,
    opponentProfile: profilesById[opponentId] ?? null,
  }
}

export async function loadUnseenBattleResult(userId) {
  const { data, error } = await supabase
    .from('workout_rooms')
    .select('id, challenger_id, challenged_id, status, created_at, ended_at, finalized_at, challenger_seen_result_at, challenged_seen_result_at')
    .in('status', ['finished', 'cancelled'])
    .not('finalized_at', 'is', null)
    .or(
      `and(challenger_id.eq.${userId},challenger_seen_result_at.is.null),and(challenged_id.eq.${userId},challenged_seen_result_at.is.null)`
    )
    .order('finalized_at', { ascending: false })
    .limit(1)

  if (error) throw error

  const room = data?.[0]
  if (!room) return null

  await syncHeadToHeadSummaryForRoom(room.id, userId)
  return loadBattleRecap(room.id, userId)
}

export async function markBattleResultSeen(roomId, userId) {
  const { data: room, error: roomError } = await supabase
    .from('workout_rooms')
    .select('id, challenger_id, challenged_id')
    .eq('id', roomId)
    .single()

  if (roomError) throw roomError
  if (!room) return

  const seenAt = new Date().toISOString()
  const updates = room.challenger_id === userId
    ? { challenger_seen_result_at: seenAt }
    : room.challenged_id === userId
      ? { challenged_seen_result_at: seenAt }
      : null

  if (!updates) return

  const { error } = await supabase
    .from('workout_rooms')
    .update(updates)
    .eq('id', roomId)

  if (error) throw error
}

export async function respondToBattleInvite(invite, action) {
  if (action === 'declined') {
    const { error } = await supabase
      .from('battle_invites')
      .update({
        status: 'declined',
        responded_at: new Date().toISOString(),
      })
      .eq('id', invite.id)

    if (error) throw error
    return null
  }

  const { data: room, error: roomError } = await supabase
    .from('workout_rooms')
    .insert({
      invite_id: invite.id,
      challenger_id: invite.challenger_id,
      challenged_id: invite.challenged_id,
    })
    .select('id, invite_id, challenger_id, challenged_id, status, created_at, ended_at')
    .single()

  if (roomError) throw roomError

  const { error: inviteError } = await supabase
    .from('battle_invites')
    .update({
      status: 'accepted',
      responded_at: new Date().toISOString(),
      room_id: room.id,
    })
    .eq('id', invite.id)

  if (inviteError) throw inviteError

  return room
}

export async function publishWorkoutRoomEvent(roomId, userId, eventType, payload = {}) {
  const { error } = await supabase
    .from('workout_room_events')
    .insert({
      room_id: roomId,
      user_id: userId,
      event_type: eventType,
      payload,
    })

  if (error) throw error
}

export async function loadLatestOpponentEvent(roomId, userId) {
  const { data, error } = await supabase
    .from('workout_room_events')
    .select('id, room_id, user_id, event_type, payload, created_at')
    .eq('room_id', roomId)
    .neq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)

  if (error) throw error
  return data?.[0] ?? null
}

export async function loadOpponentEvents(roomId, userId, limit = 100) {
  const { data, error } = await supabase
    .from('workout_room_events')
    .select('id, room_id, user_id, event_type, payload, created_at')
    .eq('room_id', roomId)
    .neq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data ?? []
}

export async function resolveWorkoutRoomIfComplete(roomId, userId = null) {
  const { data, error } = await supabase
    .from('workout_room_events')
    .select('user_id, event_type, created_at')
    .eq('room_id', roomId)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) throw error

  const latestByUser = new Map()
  for (const row of data ?? []) {
    if (!latestByUser.has(row.user_id)) latestByUser.set(row.user_id, row.event_type)
  }

  if ([...latestByUser.values()].some(type => type === 'workout_stale')) {
    const { error: updateError } = await supabase
      .from('workout_rooms')
      .update({
        status: 'cancelled',
        ended_at: new Date().toISOString(),
        finalized_at: new Date().toISOString(),
      })
      .eq('id', roomId)

    if (updateError) throw updateError
    if (userId) await syncHeadToHeadSummaryForRoom(roomId, userId)
    return true
  }

  if ([...latestByUser.values()].some(type => type === 'workout_cancelled')) {
    const { error: updateError } = await supabase
      .from('workout_rooms')
      .update({
        status: 'cancelled',
        ended_at: new Date().toISOString(),
        finalized_at: new Date().toISOString(),
      })
      .eq('id', roomId)

    if (updateError) throw updateError
    if (userId) await syncHeadToHeadSummaryForRoom(roomId, userId)
    return true
  }

  if (
    latestByUser.size >= 2
    && [...latestByUser.values()].every(type => type === 'workout_finished' || type === 'workout_cancelled')
  ) {
    const { error: updateError } = await supabase
      .from('workout_rooms')
      .update({
        status: 'finished',
        ended_at: new Date().toISOString(),
        finalized_at: new Date().toISOString(),
      })
      .eq('id', roomId)

    if (updateError) throw updateError
    if (userId) await syncHeadToHeadSummaryForRoom(roomId, userId)
    return true
  }

  return false
}

export async function syncHeadToHeadSummaryForRoom(roomId, userId) {
  if (!roomId || !userId) return { missingTable: false }

  const { data: room, error } = await supabase
    .from('workout_rooms')
    .select('challenger_id, challenged_id, status')
    .eq('id', roomId)
    .single()

  if (error) throw error
  if (!room || (room.status !== 'finished' && room.status !== 'cancelled')) {
    return { missingTable: false }
  }

  const opponentId = room.challenger_id === userId
    ? room.challenged_id
    : room.challenged_id === userId
      ? room.challenger_id
      : null

  if (!opponentId) return { missingTable: false }

  const { missingTable } = await rebuildHeadToHeadSummaries(userId, [opponentId])
  return { missingTable }
}

export async function loadBattleRecap(roomId, userId) {
  const [{ data: room, error: roomError }, { data: events, error: eventsError }] = await Promise.all([
    supabase
      .from('workout_rooms')
      .select('id, challenger_id, challenged_id, status, created_at, ended_at, finalized_at')
      .eq('id', roomId)
      .single(),
    supabase
      .from('workout_room_events')
      .select('id, room_id, user_id, event_type, payload, created_at')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true }),
  ])

  if (roomError) throw roomError
  if (eventsError) throw eventsError
  if (!room) return null

  const opponentId = room.challenger_id === userId ? room.challenged_id : room.challenger_id
  const profilesById = await fetchProfilesByIds([userId, opponentId])
  const bodyweightsById = resolveBattleBodyweights(profilesById, userId, opponentId)
  const exerciseIds = [...new Set((events ?? [])
    .filter(event => event.event_type === 'set_completed')
    .map(event => event.payload?.exerciseId)
    .filter(Boolean))]
  const exercisesById = exerciseIds.length
    ? Object.fromEntries(((await supabase
      .from('exercises')
      .select('id, equipment, name')
      .in('id', exerciseIds)).data ?? []).map(exercise => [exercise.id, exercise]))
    : {}

  const makeStats = (id) => ({
    userId: id,
    name: profilesById[id]?.full_name || profilesById[id]?.username || 'Unknown lifter',
    bodyweightKg: bodyweightsById[id],
    totalSets: 0,
    totalExercises: 0,
    totalVolume: 0,
    totalVolumeKg: 0,
    unit: 'kg',
    durationSeconds: null,
    finished: false,
    cancelled: false,
    stale: false,
    exercises: new Set(),
    exerciseStats: new Map(),
    setLedger: new Map(),
  })

  const statsByUser = new Map([
    [room.challenger_id, makeStats(room.challenger_id)],
    [room.challenged_id, makeStats(room.challenged_id)],
  ])

  for (const event of events ?? []) {
    const stats = statsByUser.get(event.user_id)
    if (!stats) continue
    const payload = event.payload || {}

    if (event.event_type === 'exercise_added') {
      for (const name of payload.exerciseNames || []) {
        if (name) stats.exercises.add(name)
      }
    }

    if (event.event_type === 'set_completed' || event.event_type === 'set_removed') {
      const fallbackExerciseId = payload.exerciseName || `${event.user_id}-${payload.setNumber || 'set'}`
      const exerciseId = payload.exerciseId || fallbackExerciseId
      const exerciseMeta = typeof exerciseId === 'number' ? exercisesById[exerciseId] : null
      const exerciseName = payload.exerciseName || exerciseMeta?.name || 'Exercise'
      const unit = payload.unit || stats.unit || 'kg'
      const ledgerKey = `${exerciseId}:${Number(payload.setNumber) || 1}`

      stats.unit = unit
      if (exerciseName) stats.exercises.add(exerciseName)

      if (event.event_type === 'set_completed') {
        stats.setLedger.set(ledgerKey, {
          exerciseId,
          exerciseName,
          unit,
          weight: Number(payload.weight) || 0,
          reps: Number(payload.reps) || 0,
          isBodyweight: payload.equipment === 'Bodyweight' || exerciseMeta?.equipment === 'Bodyweight',
        })
      } else {
        stats.setLedger.delete(ledgerKey)
      }
    }

    if (event.event_type === 'workout_finished') {
      stats.finished = true
      stats.totalSets = payload.totalSets ?? stats.totalSets
      stats.totalVolume = payload.totalVolume ?? stats.totalVolume
      stats.totalVolumeKg = payload.totalVolumeKg ?? toKg(payload.totalVolume ?? stats.totalVolume, payload.unit || stats.unit || 'kg')
      stats.unit = payload.unit || stats.unit || 'kg'
      stats.durationSeconds = payload.durationSeconds ?? stats.durationSeconds
      const exerciseCount = payload.totalExercises ?? payload.exerciseCount
      if (exerciseCount && stats.exercises.size < exerciseCount) {
        for (let i = stats.exercises.size; i < exerciseCount; i += 1) {
          stats.exercises.add(`exercise-${i}`)
        }
      }
    }

    if (event.event_type === 'workout_cancelled') {
      stats.cancelled = true
    }

    if (event.event_type === 'workout_stale') {
      stats.stale = true
    }
  }

  for (const stats of statsByUser.values()) {
    stats.totalSets = stats.setLedger.size
    stats.totalVolume = 0
    stats.totalVolumeKg = 0
    stats.exerciseStats = new Map()

    for (const setEntry of stats.setLedger.values()) {
      const setVolumeKg = getSetVolumeKg({
        weight: setEntry.weight,
        reps: setEntry.reps,
        unit: setEntry.unit,
        equipment: setEntry.isBodyweight ? 'Bodyweight' : null,
        bodyweightKg: stats.bodyweightKg,
      })
      const setVolume = setEntry.unit === 'lbs'
        ? setVolumeKg * 2.20462
        : setVolumeKg
      const ormKg = toKg(calculateORM(setEntry.weight, setEntry.reps), setEntry.unit)

      stats.totalVolume += setVolume
      stats.totalVolumeKg += setVolumeKg

      const prior = stats.exerciseStats.get(setEntry.exerciseId) || {
        id: setEntry.exerciseId,
        name: setEntry.exerciseName,
        isBodyweight: setEntry.isBodyweight,
        volumeKg: 0,
        bestOrmKg: 0,
      }

      stats.exerciseStats.set(setEntry.exerciseId, {
        ...prior,
        name: setEntry.exerciseName,
        isBodyweight: setEntry.isBodyweight,
        volumeKg: prior.volumeKg + setVolumeKg,
        bestOrmKg: Math.max(prior.bestOrmKg, ormKg),
      })
    }

    stats.totalExercises = stats.exercises.size
    delete stats.exercises
    delete stats.setLedger
  }

  const yourStats = statsByUser.get(userId) || makeStats(userId)
  const opponentStats = statsByUser.get(opponentId) || makeStats(opponentId)
  const yourTotalVolumeBw = yourStats.totalVolumeKg / yourStats.bodyweightKg
  const opponentTotalVolumeBw = opponentStats.totalVolumeKg / opponentStats.bodyweightKg
  const sharedExerciseIds = [...yourStats.exerciseStats.keys()].filter(exerciseId => opponentStats.exerciseStats.has(exerciseId))
  const yourSharedVolumeBw = sharedExerciseIds.reduce((sum, exerciseId) => {
    const exercise = yourStats.exerciseStats.get(exerciseId)
    return sum + (exercise ? exercise.volumeKg / yourStats.bodyweightKg : 0)
  }, 0)
  const opponentSharedVolumeBw = sharedExerciseIds.reduce((sum, exerciseId) => {
    const exercise = opponentStats.exerciseStats.get(exerciseId)
    return sum + (exercise ? exercise.volumeKg / opponentStats.bodyweightKg : 0)
  }, 0)
  const yourSharedOrmBw = sharedExerciseIds.reduce((sum, exerciseId) => {
    const exercise = yourStats.exerciseStats.get(exerciseId)
    if (!exercise) return sum
    return sum + (
      exercise.isBodyweight
        ? (exercise.bestOrmKg + yourStats.bodyweightKg) / yourStats.bodyweightKg
        : exercise.bestOrmKg / yourStats.bodyweightKg
    )
  }, 0)
  const opponentSharedOrmBw = sharedExerciseIds.reduce((sum, exerciseId) => {
    const exercise = opponentStats.exerciseStats.get(exerciseId)
    if (!exercise) return sum
    return sum + (
      exercise.isBodyweight
        ? (exercise.bestOrmKg + opponentStats.bodyweightKg) / opponentStats.bodyweightKg
        : exercise.bestOrmKg / opponentStats.bodyweightKg
    )
  }, 0)

  const metrics = [
    {
      id: 'total_volume_bw',
      label: 'Total Volume / BW',
      yourValue: yourTotalVolumeBw,
      opponentValue: opponentTotalVolumeBw,
      display: 'x BW volume',
      winner: compareMetric(yourTotalVolumeBw, opponentTotalVolumeBw),
      available: true,
    },
    {
      id: 'shared_volume_bw',
      label: 'Shared Lift Volume / BW',
      yourValue: sharedExerciseIds.length ? yourSharedVolumeBw : null,
      opponentValue: sharedExerciseIds.length ? opponentSharedVolumeBw : null,
      display: 'x BW volume',
      winner: compareMetric(
        sharedExerciseIds.length ? yourSharedVolumeBw : null,
        sharedExerciseIds.length ? opponentSharedVolumeBw : null
      ),
      available: sharedExerciseIds.length > 0,
    },
    {
      id: 'shared_orm_bw',
      label: 'Shared Lift Top Set / BW',
      yourValue: sharedExerciseIds.length ? yourSharedOrmBw : null,
      opponentValue: sharedExerciseIds.length ? opponentSharedOrmBw : null,
      display: 'x BW strength',
      winner: compareMetric(
        sharedExerciseIds.length ? yourSharedOrmBw : null,
        sharedExerciseIds.length ? opponentSharedOrmBw : null
      ),
      available: sharedExerciseIds.length > 0,
    },
  ]

  const points = metrics.reduce((score, metric) => {
    if (metric.winner === 'you') return { ...score, you: score.you + 1 }
    if (metric.winner === 'opponent') return { ...score, opponent: score.opponent + 1 }
    return score
  }, { you: 0, opponent: 0 })

  const status = yourStats.stale || opponentStats.stale || yourStats.cancelled || opponentStats.cancelled
    ? 'cancelled'
    : (yourStats.finished && opponentStats.finished ? 'finished' : 'waiting')

  let winner = null
  let verdict = ''

  if (status === 'finished') {
    if (points.you !== points.opponent) {
      winner = points.you > points.opponent ? 'you' : 'opponent'
      verdict = winner === 'you'
        ? `You won ${points.you}-${points.opponent} on battle metrics`
        : `${opponentStats.name} won ${points.opponent}-${points.you} on battle metrics`
    } else {
      winner = 'tie'
      verdict = 'Split decision across the battle metrics'
    }
  } else if (status === 'cancelled') {
    if (yourStats.stale || opponentStats.stale) {
      winner = null
      verdict = 'Battle voided due to inactivity'
    } else {
      winner = opponentStats.cancelled && !yourStats.cancelled
        ? 'you'
        : (yourStats.cancelled && !opponentStats.cancelled ? 'opponent' : null)
      verdict = winner === 'you'
        ? 'Your friend left the battle'
        : winner === 'opponent'
          ? 'You left the battle'
          : 'Battle cancelled'
    }
  } else {
    verdict = opponentStats.finished
      ? `${opponentStats.name} has finished. Waiting on final sync.`
      : `Waiting for ${opponentStats.name} to finish.`
  }

  return {
    roomId,
    created_at: room.created_at,
    ended_at: room.ended_at,
    finalized_at: room.finalized_at,
    status,
    winner,
    verdict,
    points,
    metrics,
    sharedExerciseCount: sharedExerciseIds.length,
    bodyweightFallbackUsed: bodyweightsById.fallback,
    yourStats,
    opponentStats,
    opponentName: opponentStats.name,
  }
}
