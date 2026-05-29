import { localDate } from './dateUtils'

/**
 * Derives the displayed streak from the two anchor values stored on profiles.
 * No sessions query needed — streak grows automatically each calendar day and
 * decays to 0 client-side if more than 3 days pass without a finished workout.
 */
export function computeStreak(streakStartDate, streakLastWorkoutAt) {
  if (!streakStartDate || !streakLastWorkoutAt) return 0
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const last  = new Date(streakLastWorkoutAt); last.setHours(0, 0, 0, 0)
  if (Math.floor((today - last) / 86400000) > 3) return 0   // streak expired
  const start = new Date(`${streakStartDate}T00:00:00`); start.setHours(0, 0, 0, 0)
  return Math.floor((today - start) / 86400000) + 1
}

/**
 * Computes the new streak_start_date to persist when a workout finishes.
 * Uses finished_at local dates — consistent with streak_last_workout_at semantics.
 *
 * - No prior workout (or first ever): today is the new streak start.
 * - Gap since last finished workout > 3 days: streak broke, reset to today.
 * - Otherwise: keep the existing start date (streak window keeps extending).
 */
export function computeNewStreakStartDate(currentStartDate, streakLastWorkoutAt, finishedAt) {
  const today = localDate(new Date(finishedAt))
  if (!streakLastWorkoutAt) return today                            // first ever workout
  const lastDate = localDate(new Date(streakLastWorkoutAt))
  const gap = Math.round(
    (new Date(`${today}T12:00:00`) - new Date(`${lastDate}T12:00:00`)) / 86400000
  )
  if (gap > 3) return today                                         // streak broke — reset
  return currentStartDate ?? today                                  // streak alive — keep start
}

/**
 * Recomputes streak anchor values after a finished workout is deleted.
 * Must be awaited BEFORE invalidateCache so the Home reload reads fresh values.
 *
 * Pages through finished sessions newest-first in batches of PAGE_SIZE to avoid
 * Supabase's default 1 000-row cap truncating results for long-history users.
 * The loop exits as soon as a gap > 3 days is found, so it is O(streak_length)
 * in rows fetched for normal streaks and never silently truncates.
 * Uses finished_at dates throughout for consistency with computeNewStreakStartDate.
 *
 * Throws on Supabase errors — callers should handle inside their existing try/catch.
 */
export async function recalculateStreakAfterDeletion(supabase, userId) {
  const PAGE_SIZE = 1000
  let from = 0
  let streakLastWorkoutAt = null   // full timestamp of the most recent session
  let streakDates = new Set()      // unique local dates within the continuous window
  let prevDate    = null           // most-recent unique date processed so far
  let done        = false

  while (!done) {
    const { data: page, error } = await supabase
      .from('workout_sessions')
      .select('finished_at')
      .eq('user_id', userId)
      .not('finished_at', 'is', null)
      .order('finished_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1)

    if (error) throw error
    if (!page?.length) break

    for (const s of page) {
      const d = localDate(new Date(s.finished_at))

      // First session overall — capture the most-recent timestamp anchor
      if (streakLastWorkoutAt === null) streakLastWorkoutAt = s.finished_at

      if (prevDate === null) {
        streakDates.add(d)
        prevDate = d
        continue
      }

      if (d === prevDate) continue    // same calendar day, no gap to check

      // Gap between this date and the previous (newer) unique date
      const gap = Math.round(
        (new Date(`${prevDate}T12:00:00`) - new Date(`${d}T12:00:00`)) / 86400000
      )
      if (gap > 3) { done = true; break }   // streak window ended — stop paging

      streakDates.add(d)
      prevDate = d
    }

    if (page.length < PAGE_SIZE) break   // last page — no more rows
    from += PAGE_SIZE
  }

  if (!streakLastWorkoutAt) {
    // No remaining finished workouts — clear streak entirely
    const { error } = await supabase
      .from('profiles')
      .update({ streak_start_date: null, streak_last_workout_at: null })
      .eq('id', userId)
    if (error) throw error
    return
  }

  // YYYY-MM-DD strings sort lexicographically = chronologically; [0] is the oldest
  const streakStartDate = [...streakDates].sort()[0]

  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      streak_start_date:      streakStartDate,
      streak_last_workout_at: streakLastWorkoutAt,
    })
    .eq('id', userId)

  if (updateError) throw updateError
}
