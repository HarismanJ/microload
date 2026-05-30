-- Add streak anchor columns to profiles so streak can be read on startup
-- without fetching a year of workout_sessions rows.
--
-- streak_start_date:      local date of the oldest workout still in the streak window
-- streak_last_workout_at: UTC timestamp of the most recently finished workout
--
-- These are written by finish_workout_session_atomic when a workout completes.
-- computeStreak() on the client derives the display value from these two fields alone.

begin;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS streak_start_date date,
  ADD COLUMN IF NOT EXISTS streak_last_workout_at timestamp with time zone;

-- Backfill both columns for users who have existing workouts.
-- streak_last_workout_at = their most recent finished workout.
-- streak_start_date      = same date as last workout (conservative baseline of 1 day;
--                          will grow correctly from the next workout onward).
-- Users with no workouts stay NULL → computeStreak() returns 0, which is correct.
--
-- Processed row-by-row with exception handling because some rows may have
-- pre-existing data that violates check constraints added in later migrations
-- (e.g. profiles_username_input_check). Touching such a row in a bulk UPDATE
-- causes PostgreSQL to re-evaluate all constraints, failing the entire statement.
-- Skipping those rows is safe — their streak will be set on next workout finish.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT user_id, MAX(finished_at) AS last_finished
    FROM public.workout_sessions
    WHERE finished_at IS NOT NULL
    GROUP BY user_id
  ) LOOP
    BEGIN
      UPDATE public.profiles
      SET
        streak_last_workout_at = r.last_finished,
        streak_start_date      = r.last_finished::date
      WHERE id = r.user_id;
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'Skipped streak backfill for user % : %', r.user_id, SQLERRM;
    END;
  END LOOP;
END;
$$;

commit;
