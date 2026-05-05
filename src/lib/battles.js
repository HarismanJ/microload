import { supabase } from './supabase'
import { calculateORM } from './orm'
import { DEFAULT_BODYWEIGHT_KG, getSetVolumeKg, toKg } from './liftMath'
import { CARDIO_MET } from '../data/metValues'

const BATTLE_HEAD_TO_HEAD_TABLE = 'battle_head_to_head'
const FALLBACK_CARDIO_MET = 6.0

export const BATTLE_MODES = ['strength', 'hybrid', 'cardio']
export const DEFAULT_BATTLE_MODE = 'hybrid'

export function normalizeBattleMode(mode) {
  return BATTLE_MODES.includes(mode) ? mode : DEFAULT_BATTLE_MODE
}

export function getBattleModeLabel(mode) {
  const normalized = normalizeBattleMode(mode)
  if (normalized === 'strength') return 'Strength'
  if (normalized === 'cardio') return 'Cardio'
  return 'Hybrid'
}

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

function positiveMinutes(seconds) {
  const minutes = (Number(seconds) || 0) / 60
  return minutes > 0 ? minutes : null
}

function createMetric(id, label, yourValue, opponentValue, display, extra = {}) {
  const available = yourValue !== null && opponentValue !== null
  return {
    id,
    label,
    yourValue: available ? yourValue : null,
    opponentValue: available ? opponentValue : null,
    display,
    winner: compareMetric(available ? yourValue : null, available ? opponentValue : null),
    available,
    ...extra,
  }
}

function buildBattleMetrics(mode, yourStats, opponentStats) {
  const sharedExerciseIds = [...yourStats.exerciseStats.keys()]
    .filter(exerciseId => opponentStats.exerciseStats.has(exerciseId))
  const hasSharedStrength = sharedExerciseIds.length > 0

  const yourStrengthVolumeBw = yourStats.strengthVolumeKg / yourStats.bodyweightKg
  const opponentStrengthVolumeBw = opponentStats.strengthVolumeKg / opponentStats.bodyweightKg
  const yourSharedVolumeBw = hasSharedStrength
    ? sharedExerciseIds.reduce((sum, exerciseId) => {
      const exercise = yourStats.exerciseStats.get(exerciseId)
      return sum + (exercise ? exercise.volumeKg / yourStats.bodyweightKg : 0)
    }, 0)
    : null
  const opponentSharedVolumeBw = hasSharedStrength
    ? sharedExerciseIds.reduce((sum, exerciseId) => {
      const exercise = opponentStats.exerciseStats.get(exerciseId)
      return sum + (exercise ? exercise.volumeKg / opponentStats.bodyweightKg : 0)
    }, 0)
    : null
  const yourSharedOrmBw = hasSharedStrength
    ? sharedExerciseIds.reduce((sum, exerciseId) => {
      const exercise = yourStats.exerciseStats.get(exerciseId)
      if (!exercise) return sum
      return sum + (
        exercise.isBodyweight
          ? (exercise.bestOrmKg + yourStats.bodyweightKg) / yourStats.bodyweightKg
          : exercise.bestOrmKg / yourStats.bodyweightKg
      )
    }, 0)
    : null
  const opponentSharedOrmBw = hasSharedStrength
    ? sharedExerciseIds.reduce((sum, exerciseId) => {
      const exercise = opponentStats.exerciseStats.get(exerciseId)
      if (!exercise) return sum
      return sum + (
        exercise.isBodyweight
          ? (exercise.bestOrmKg + opponentStats.bodyweightKg) / opponentStats.bodyweightKg
          : exercise.bestOrmKg / opponentStats.bodyweightKg
      )
    }, 0)
    : null

  const yourWorkoutMinutes = positiveMinutes(yourStats.durationSeconds) || positiveMinutes(yourStats.lastEventDurationSeconds) || positiveMinutes(yourStats.cardioDurationSeconds)
  const opponentWorkoutMinutes = positiveMinutes(opponentStats.durationSeconds) || positiveMinutes(opponentStats.lastEventDurationSeconds) || positiveMinutes(opponentStats.cardioDurationSeconds)
  const yourCardioMinutes = positiveMinutes(yourStats.cardioDurationSeconds)
  const opponentCardioMinutes = positiveMinutes(opponentStats.cardioDurationSeconds)
  const yourCardioDensity = yourCardioMinutes ? yourStats.cardioMetMinutes / yourCardioMinutes : null
  const opponentCardioDensity = opponentCardioMinutes ? opponentStats.cardioMetMinutes / opponentCardioMinutes : null
  const yourOverallDensity = yourWorkoutMinutes
    ? (yourStrengthVolumeBw + yourStats.cardioMetMinutes) / yourWorkoutMinutes
    : null
  const opponentOverallDensity = opponentWorkoutMinutes
    ? (opponentStrengthVolumeBw + opponentStats.cardioMetMinutes) / opponentWorkoutMinutes
    : null

  const common = {
    strengthVolume: () => createMetric('strength_volume_bw', 'Strength Volume / BW', yourStrengthVolumeBw, opponentStrengthVolumeBw, 'x BW volume'),
    sharedVolume: () => createMetric('shared_volume_bw', 'Shared Lift Volume / BW', yourSharedVolumeBw, opponentSharedVolumeBw, 'x BW volume', { unavailableText: 'Needs at least one shared strength lift' }),
    sharedOrm: () => createMetric('shared_orm_bw', 'Shared Lift Top Set / BW', yourSharedOrmBw, opponentSharedOrmBw, 'x BW strength', { unavailableText: 'Needs at least one shared strength lift' }),
    cardioMet: () => createMetric('cardio_met_minutes', 'Cardio MET-Minutes', yourStats.cardioMetMinutes, opponentStats.cardioMetMinutes, 'MET-min'),
    cardioDuration: () => createMetric('cardio_duration', 'Cardio Duration', yourStats.cardioDurationSeconds / 60, opponentStats.cardioDurationSeconds / 60, 'min'),
    cardioDensity: () => createMetric('cardio_density', 'Cardio Density', yourCardioDensity, opponentCardioDensity, 'MET-min / min', { unavailableText: 'Needs completed cardio from both lifters' }),
    overallDensity: () => createMetric('overall_density', 'Overall Work Density', yourOverallDensity, opponentOverallDensity, 'score / min', { unavailableText: 'Needs workout time from both lifters' }),
  }

  if (mode === 'strength') {
    return { metrics: [common.strengthVolume(), common.sharedVolume(), common.sharedOrm()], sharedExerciseCount: sharedExerciseIds.length }
  }

  if (mode === 'cardio') {
    return { metrics: [common.cardioMet(), common.cardioDuration(), common.cardioDensity()], sharedExerciseCount: sharedExerciseIds.length }
  }

  return {
    metrics: [
      common.strengthVolume(),
      common.sharedOrm(),
      common.cardioMet(),
      common.cardioDensity(),
      common.overallDensity(),
    ],
    sharedExerciseCount: sharedExerciseIds.length,
  }
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
    .select('id, challenger_id, challenged_id, status, room_id, battle_mode, created_at, responded_at')
    .eq('status', 'pending')
    .or(`and(challenger_id.eq.${userA},challenged_id.eq.${userB}),and(challenger_id.eq.${userB},challenged_id.eq.${userA})`)
    .order('created_at', { ascending: false })
    .limit(1)

  if (error) throw error
  return data?.[0] ?? null
}

export async function createBattleInvite(challengerId, challengedId, battleMode = DEFAULT_BATTLE_MODE) {
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
      battle_mode: normalizeBattleMode(battleMode),
    })
    .select('id, challenger_id, challenged_id, status, room_id, battle_mode, created_at, responded_at')
    .single()

  if (error) throw error
  return data
}

export async function loadPendingBattleInvite(userId) {
  const { data, error } = await supabase
    .from('battle_invites')
    .select('id, challenger_id, challenged_id, status, room_id, battle_mode, created_at, responded_at')
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
    .select('id, challenger_id, challenged_id, status, room_id, battle_mode, created_at, responded_at')
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
    .select('id, invite_id, challenger_id, challenged_id, status, battle_mode, created_at, ended_at')
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
    .select('id, challenger_id, challenged_id, status, battle_mode, created_at, ended_at, finalized_at, challenger_seen_result_at, challenged_seen_result_at')
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
      battle_mode: normalizeBattleMode(invite.battle_mode),
    })
    .select('id, invite_id, challenger_id, challenged_id, status, battle_mode, created_at, ended_at')
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
      .select('id, challenger_id, challenged_id, status, battle_mode, created_at, ended_at, finalized_at')
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

  const battleMode = normalizeBattleMode(room.battle_mode)
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
      .select('id, category, equipment, name')
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
    strengthVolumeKg: 0,
    cardioDurationSeconds: 0,
    cardioMetMinutes: 0,
    unit: 'kg',
    durationSeconds: null,
    lastEventDurationSeconds: null,
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
      const exerciseMeta = exercisesById[exerciseId] || null
      const exerciseName = payload.exerciseName || exerciseMeta?.name || 'Exercise'
      const unit = payload.unit || stats.unit || 'kg'
      const ledgerKey = `${exerciseId}:${Number(payload.setNumber) || 1}`
      const durationSeconds = Number(payload.durationSeconds ?? payload.duration_seconds)
      const category = payload.category || exerciseMeta?.category || (Number.isFinite(durationSeconds) && durationSeconds > 0 ? 'Cardio' : 'Strength')

      stats.unit = unit
      if (exerciseName) stats.exercises.add(exerciseName)

      if (event.event_type === 'set_completed') {
        stats.setLedger.set(ledgerKey, {
          exerciseId,
          exerciseName,
          category,
          unit,
          weight: Number(payload.weight) || 0,
          reps: Number(payload.reps) || 0,
          durationSeconds: Number.isFinite(durationSeconds) ? Math.max(0, durationSeconds) : 0,
          met: Number(payload.met) || CARDIO_MET[exerciseName] || FALLBACK_CARDIO_MET,
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
    stats.strengthVolumeKg = 0
    stats.cardioDurationSeconds = 0
    stats.cardioMetMinutes = 0
    stats.exerciseStats = new Map()

    for (const setEntry of stats.setLedger.values()) {
      if (setEntry.category === 'Cardio' || setEntry.durationSeconds > 0) {
        stats.cardioDurationSeconds += setEntry.durationSeconds
        stats.cardioMetMinutes += (setEntry.met || FALLBACK_CARDIO_MET) * (setEntry.durationSeconds / 60)
        continue
      }

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
      stats.strengthVolumeKg += setVolumeKg

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
    if (!stats.durationSeconds && room.created_at && room.status === 'active') {
      const elapsed = Math.floor((Date.now() - Date.parse(room.created_at)) / 1000)
      stats.lastEventDurationSeconds = Number.isFinite(elapsed) && elapsed > 0 ? elapsed : null
    }
    delete stats.exercises
    delete stats.setLedger
  }

  const yourStats = statsByUser.get(userId) || makeStats(userId)
  const opponentStats = statsByUser.get(opponentId) || makeStats(opponentId)
  const { metrics, sharedExerciseCount } = buildBattleMetrics(battleMode, yourStats, opponentStats)

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
    battleMode,
    battleModeLabel: getBattleModeLabel(battleMode),
    created_at: room.created_at,
    ended_at: room.ended_at,
    finalized_at: room.finalized_at,
    status,
    winner,
    verdict,
    points,
    metrics,
    sharedExerciseCount,
    bodyweightFallbackUsed: bodyweightsById.fallback,
    yourStats,
    opponentStats,
    opponentName: opponentStats.name,
  }
}
