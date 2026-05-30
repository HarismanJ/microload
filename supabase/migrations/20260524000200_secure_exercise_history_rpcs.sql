-- Prevent exercise-history RPCs from bypassing workout_sets RLS by accepting
-- arbitrary user ids under SECURITY DEFINER.

begin;

create or replace function public.get_exercise_daily_orm_points(
  p_user_id uuid,
  p_exercise_id bigint
)
returns table (
  day date,
  best_orm_kg numeric
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'Unauthorized exercise history access'
      using errcode = '42501';
  end if;

  return query
  select
    date(ws.created_at at time zone 'UTC') as day,
    max(
      case
        when ws.unit = 'lbs' then ws.estimated_1rm * 0.453592
        else ws.estimated_1rm
      end
    ) as best_orm_kg
  from public.workout_sets ws
  where
    ws.user_id = p_user_id
    and ws.exercise_id = p_exercise_id
    and ws.estimated_1rm is not null
  group by date(ws.created_at at time zone 'UTC')
  order by day;
end;
$$;

create or replace function public.get_exercise_history_summary(
  p_user_id uuid,
  p_exercise_id bigint
)
returns table (
  best_orm_kg numeric,
  best_set_weight numeric,
  best_set_reps integer,
  best_set_unit text,
  total_volume_kg numeric,
  total_sets bigint
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'Unauthorized exercise history access'
      using errcode = '42501';
  end if;

  return query
  with sets as (
    select
      ws.weight,
      ws.reps,
      ws.unit,
      case
        when ws.unit = 'lbs' then ws.estimated_1rm * 0.453592
        else ws.estimated_1rm
      end as orm_kg,
      case
        when ws.unit = 'lbs' then ws.weight * ws.reps * 0.453592
        else ws.weight * ws.reps
      end as volume_kg
    from public.workout_sets ws
    where
      ws.user_id = p_user_id
      and ws.exercise_id = p_exercise_id
      and ws.estimated_1rm is not null
  ),
  best_set as (
    select
      s.weight,
      s.reps,
      s.unit
    from sets s
    order by s.orm_kg desc
    limit 1
  )
  select
    max(s.orm_kg) as best_orm_kg,
    b.weight as best_set_weight,
    b.reps::integer as best_set_reps,
    b.unit as best_set_unit,
    sum(s.volume_kg) as total_volume_kg,
    count(*)::bigint as total_sets
  from sets s
  cross join best_set b
  group by b.weight, b.reps, b.unit;
end;
$$;

revoke all on function public.get_exercise_daily_orm_points(uuid, bigint) from public;
revoke all on function public.get_exercise_daily_orm_points(uuid, bigint) from anon;
grant execute on function public.get_exercise_daily_orm_points(uuid, bigint) to authenticated;
grant execute on function public.get_exercise_daily_orm_points(uuid, bigint) to service_role;

revoke all on function public.get_exercise_history_summary(uuid, bigint) from public;
revoke all on function public.get_exercise_history_summary(uuid, bigint) from anon;
grant execute on function public.get_exercise_history_summary(uuid, bigint) to authenticated;
grant execute on function public.get_exercise_history_summary(uuid, bigint) to service_role;

commit;
