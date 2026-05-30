-- Persist a completed workout atomically so a session cannot be marked finished
-- without its sets, PRs, rank states, and lifetime-volume update.

begin;

create or replace function public.finish_workout_session_atomic(
  p_session_id uuid,
  p_finished_at timestamp with time zone,
  p_exercise_notes jsonb default '{}'::jsonb,
  p_calories_burned integer default null,
  p_source_plan_id uuid default null,
  p_source_plan_day_id text default null,
  p_source_plan_week integer default null,
  p_session_training_volume_kg double precision default 0,
  p_sets jsonb default '[]'::jsonb,
  p_prs jsonb default '[]'::jsonb,
  p_rank_states jsonb default '[]'::jsonb
)
returns void
language plpgsql
volatile
security invoker
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_session_owner uuid;
begin
  if v_user_id is null then
    raise exception 'Unauthorized workout completion'
      using errcode = '42501';
  end if;

  select ws.user_id
    into v_session_owner
  from public.workout_sessions ws
  where ws.id = p_session_id
  for update;

  if v_session_owner is null or v_session_owner <> v_user_id then
    raise exception 'Unauthorized workout completion'
      using errcode = '42501';
  end if;

  if exists (
    select 1
    from public.workout_sessions ws
    where ws.id = p_session_id
      and ws.finished_at is not null
  ) then
    return;
  end if;

  if jsonb_typeof(coalesce(p_sets, '[]'::jsonb)) <> 'array' then
    raise exception 'Workout sets payload must be an array'
      using errcode = '22023';
  end if;

  if jsonb_typeof(coalesce(p_prs, '[]'::jsonb)) <> 'array' then
    raise exception 'Workout PR payload must be an array'
      using errcode = '22023';
  end if;

  if jsonb_typeof(coalesce(p_rank_states, '[]'::jsonb)) <> 'array' then
    raise exception 'Workout rank state payload must be an array'
      using errcode = '22023';
  end if;

  insert into public.workout_sets (
    user_id,
    session_id,
    exercise_id,
    set_number,
    reps,
    weight,
    unit,
    estimated_1rm,
    duration_seconds,
    completed_at,
    rest_before_seconds,
    progression_event,
    is_warmup,
    set_type,
    set_group_index
  )
  select
    v_user_id,
    p_session_id,
    s.exercise_id,
    s.set_number,
    s.reps,
    s.weight,
    coalesce(s.unit, 'kg'),
    s.estimated_1rm,
    s.duration_seconds,
    s.completed_at,
    s.rest_before_seconds,
    s.progression_event,
    coalesce(s.is_warmup, false),
    coalesce(s.set_type, 'normal'),
    s.set_group_index
  from jsonb_to_recordset(coalesce(p_sets, '[]'::jsonb)) as s(
    exercise_id integer,
    set_number integer,
    reps integer,
    weight numeric,
    unit text,
    estimated_1rm numeric,
    duration_seconds integer,
    completed_at timestamp with time zone,
    rest_before_seconds integer,
    progression_event text,
    is_warmup boolean,
    set_type text,
    set_group_index integer
  );

  update public.workout_sessions
  set
    finished_at = p_finished_at,
    exercise_notes = coalesce(p_exercise_notes, '{}'::jsonb),
    calories_burned = p_calories_burned,
    source_plan_id = coalesce(p_source_plan_id, source_plan_id),
    source_plan_day_id = coalesce(p_source_plan_day_id, source_plan_day_id),
    source_plan_week = coalesce(p_source_plan_week, source_plan_week)
  where id = p_session_id
    and user_id = v_user_id;

  update public.profiles
  set lifetime_volume_kg = greatest(
    0,
    coalesce(lifetime_volume_kg, 0) + coalesce(p_session_training_volume_kg, 0)
  )
  where id = v_user_id;

  insert into public.exercise_prs (
    user_id,
    exercise_id,
    best_1rm_kg,
    updated_at
  )
  select
    v_user_id,
    p.exercise_id,
    p.best_1rm_kg,
    coalesce(p.updated_at, p_finished_at, now())
  from jsonb_to_recordset(coalesce(p_prs, '[]'::jsonb)) as p(
    exercise_id bigint,
    best_1rm_kg double precision,
    updated_at timestamp with time zone
  )
  on conflict (user_id, exercise_id) do update
    set
      best_1rm_kg = excluded.best_1rm_kg,
      updated_at = excluded.updated_at;

  insert into public.exercise_rank_states (
    user_id,
    exercise_id,
    current_score,
    peak_score,
    last_ranked_at,
    updated_at
  )
  select
    v_user_id,
    r.exercise_id,
    r.current_score,
    r.peak_score,
    r.last_ranked_at,
    coalesce(r.updated_at, p_finished_at, now())
  from jsonb_to_recordset(coalesce(p_rank_states, '[]'::jsonb)) as r(
    exercise_id bigint,
    current_score double precision,
    peak_score double precision,
    last_ranked_at timestamp with time zone,
    updated_at timestamp with time zone
  )
  on conflict (user_id, exercise_id) do update
    set
      current_score = excluded.current_score,
      peak_score = greatest(public.exercise_rank_states.peak_score, excluded.peak_score),
      last_ranked_at = excluded.last_ranked_at,
      updated_at = excluded.updated_at;
end;
$$;

revoke all on function public.finish_workout_session_atomic(
  uuid,
  timestamp with time zone,
  jsonb,
  integer,
  uuid,
  text,
  integer,
  double precision,
  jsonb,
  jsonb,
  jsonb
) from public;
revoke all on function public.finish_workout_session_atomic(
  uuid,
  timestamp with time zone,
  jsonb,
  integer,
  uuid,
  text,
  integer,
  double precision,
  jsonb,
  jsonb,
  jsonb
) from anon;
grant execute on function public.finish_workout_session_atomic(
  uuid,
  timestamp with time zone,
  jsonb,
  integer,
  uuid,
  text,
  integer,
  double precision,
  jsonb,
  jsonb,
  jsonb
) to authenticated;
grant execute on function public.finish_workout_session_atomic(
  uuid,
  timestamp with time zone,
  jsonb,
  integer,
  uuid,
  text,
  integer,
  double precision,
  jsonb,
  jsonb,
  jsonb
) to service_role;

commit;
