-- Fetch bounded progressive-overload history without client-side row-count guesses.

begin;

create index if not exists workout_sets_recent_progressive_overload_idx
  on public.workout_sets (user_id, exercise_id, session_id, created_at desc);

create or replace function public.get_recent_progressive_overload_sets(
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
