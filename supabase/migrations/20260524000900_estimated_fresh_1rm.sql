-- Store a fatigue-normalized capability anchor alongside the actual performed
-- e1RM so cross-exercise pre-fatigue cannot recursively lower future baselines.

begin;

alter table public.workout_sets
  add column if not exists estimated_fresh_1rm numeric;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.workout_sets'::regclass
      and conname = 'workout_sets_estimated_fresh_1rm_check'
  ) then
    alter table public.workout_sets
      add constraint workout_sets_estimated_fresh_1rm_check
      check (estimated_fresh_1rm is null or estimated_fresh_1rm > 0);
  end if;
end;
$$;

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
    estimated_fresh_1rm,
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
    s.estimated_fresh_1rm,
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
    estimated_fresh_1rm numeric,
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

drop function if exists public.get_recent_progressive_overload_sets(integer[], integer, uuid);

create function public.get_recent_progressive_overload_sets(
  p_exercise_ids integer[],
  p_session_limit integer default 8,
  p_exclude_session_id uuid default null
)
returns table (
  exercise_id integer,
  session_id uuid,
  session_started_at timestamp with time zone,
  weight numeric,
  reps integer,
  unit text,
  estimated_1rm numeric,
  estimated_fresh_1rm numeric,
  set_number integer,
  duration_seconds integer,
  completed_at timestamp with time zone,
  rest_before_seconds integer,
  created_at timestamp with time zone,
  progression_event text,
  is_warmup boolean,
  set_type text,
  set_group_index integer
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with requested_exercises as (
    select distinct exercise_id
    from unnest(coalesce(p_exercise_ids, array[]::integer[])) as requested(exercise_id)
    where exercise_id is not null
  ),
  session_candidates as (
    select
      ws.exercise_id,
      ws.session_id,
      wse.started_at as session_started_at,
      max(ws.created_at) as latest_set_created_at
    from public.workout_sets ws
    join public.workout_sessions wse on wse.id = ws.session_id
    join requested_exercises re on re.exercise_id = ws.exercise_id
    where
      auth.uid() is not null
      and ws.user_id = auth.uid()
      and wse.user_id = auth.uid()
      and (p_exclude_session_id is null or ws.session_id <> p_exclude_session_id)
    group by ws.exercise_id, ws.session_id, wse.started_at
  ),
  ranked_sessions as (
    select
      sc.*,
      row_number() over (
        partition by sc.exercise_id
        order by sc.session_started_at desc nulls last, sc.latest_set_created_at desc nulls last, sc.session_id desc
      ) as rn
    from session_candidates sc
  ),
  selected_sessions as (
    select
      rs.exercise_id,
      rs.session_id,
      rs.session_started_at
    from ranked_sessions rs
    where rs.rn <= least(greatest(coalesce(p_session_limit, 8), 1), 50)
  )
  select
    ws.exercise_id,
    ws.session_id,
    ss.session_started_at,
    ws.weight,
    ws.reps,
    ws.unit,
    ws.estimated_1rm,
    ws.estimated_fresh_1rm,
    ws.set_number,
    ws.duration_seconds,
    ws.completed_at,
    ws.rest_before_seconds,
    ws.created_at,
    ws.progression_event,
    ws.is_warmup,
    ws.set_type,
    ws.set_group_index
  from selected_sessions ss
  join public.workout_sets ws
    on ws.exercise_id = ss.exercise_id
    and ws.session_id = ss.session_id
  join public.workout_sessions wse on wse.id = ws.session_id
  where
    auth.uid() is not null
    and ws.user_id = auth.uid()
    and wse.user_id = auth.uid()
  order by ss.exercise_id, ss.session_started_at asc nulls last, ws.set_number asc, ws.created_at asc;
$$;

revoke all on function public.get_recent_progressive_overload_sets(integer[], integer, uuid) from public;
revoke all on function public.get_recent_progressive_overload_sets(integer[], integer, uuid) from anon;
grant execute on function public.get_recent_progressive_overload_sets(integer[], integer, uuid) to authenticated;
grant execute on function public.get_recent_progressive_overload_sets(integer[], integer, uuid) to service_role;

commit;
