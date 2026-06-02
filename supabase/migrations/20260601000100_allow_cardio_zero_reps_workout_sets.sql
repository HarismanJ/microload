alter table public.workout_sets
drop constraint if exists workout_sets_reps_input_check;

alter table public.workout_sets
add constraint workout_sets_reps_input_check
check (
  (reps >= 1 and reps <= 9999)
  or (reps = 0 and duration_seconds is not null)
) not valid;
