-- Fix ambiguous column references in battle result finalization.
-- This is a forward-only replacement for record_battle_result_atomic; it does
-- not change tables or data.

begin;

create or replace function public.record_battle_result_atomic(
  p_room_id uuid,
  p_winner_id uuid default null,
  p_challenger_points integer default null,
  p_challenged_points integer default null,
  p_score_total integer default 100,
  p_scoring_version text default 'weighted_v1',
  p_recap jsonb default '{}'::jsonb
)
returns table (
  room_id uuid,
  status text,
  outcome text,
  winner_id uuid,
  finalized_at timestamp with time zone,
  inserted boolean
)
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_room public.workout_rooms%rowtype;
  v_existing public.battle_results%rowtype;
  v_challenger_event text;
  v_challenged_event text;
  v_status text;
  v_outcome text;
  v_winner_id uuid;
  v_challenger_points integer;
  v_challenged_points integer;
  v_score_total integer := coalesce(p_score_total, 100);
  v_finalized_at timestamp with time zone;
  v_recap jsonb := coalesce(p_recap, '{}'::jsonb);
  v_inserted boolean := false;
begin
  if v_user_id is null then
    raise exception 'Unauthorized battle result recording'
      using errcode = '42501';
  end if;

  select *
    into v_room
  from public.workout_rooms wr
  where wr.id = p_room_id
  for update;

  if v_room.id is null
     or (v_user_id <> v_room.challenger_id and v_user_id <> v_room.challenged_id) then
    raise exception 'Unauthorized battle result recording'
      using errcode = '42501';
  end if;

  select *
    into v_existing
  from public.battle_results br
  where br.room_id = p_room_id;

  if v_existing.room_id is not null then
    perform public.refresh_battle_head_to_head_pair(v_existing.challenger_id, v_existing.challenged_id);
    return query
      select
        v_existing.room_id,
        v_existing.status,
        v_existing.outcome,
        v_existing.winner_id,
        v_existing.finalized_at,
        false;
    return;
  end if;

  if jsonb_typeof(v_recap) <> 'object' or not public.app_json_text_size_ok(v_recap, 32768) then
    raise exception 'Battle recap payload is invalid'
      using errcode = '22023';
  end if;

  if v_score_total < 1 or v_score_total > 1000 then
    raise exception 'Battle score total is invalid'
      using errcode = '22023';
  end if;

  if char_length(coalesce(p_scoring_version, '')) > 60 then
    raise exception 'Battle scoring version is invalid'
      using errcode = '22023';
  end if;

  if p_winner_id is not null
     and p_winner_id <> v_room.challenger_id
     and p_winner_id <> v_room.challenged_id then
    raise exception 'Battle winner must be a room participant'
      using errcode = '22023';
  end if;

  select latest.event_type
    into v_challenger_event
  from (
    select wre.event_type
    from public.workout_room_events wre
    where wre.room_id = p_room_id
      and wre.user_id = v_room.challenger_id
      and wre.event_type in ('workout_finished', 'workout_cancelled', 'workout_stale')
    order by wre.created_at desc
    limit 1
  ) latest;

  select latest.event_type
    into v_challenged_event
  from (
    select wre.event_type
    from public.workout_room_events wre
    where wre.room_id = p_room_id
      and wre.user_id = v_room.challenged_id
      and wre.event_type in ('workout_finished', 'workout_cancelled', 'workout_stale')
    order by wre.created_at desc
    limit 1
  ) latest;

  if v_challenger_event = 'workout_stale' or v_challenged_event = 'workout_stale' then
    v_status := 'cancelled';
    v_outcome := 'void';
    v_winner_id := null;
    v_challenger_points := null;
    v_challenged_points := null;
  elsif v_challenger_event = 'workout_cancelled' or v_challenged_event = 'workout_cancelled' then
    v_status := 'cancelled';
    v_challenger_points := null;
    v_challenged_points := null;

    if v_challenger_event = 'workout_cancelled' and v_challenged_event = 'workout_cancelled' then
      v_outcome := 'tie';
      v_winner_id := null;
    elsif v_challenger_event = 'workout_cancelled' then
      v_outcome := 'challenged_win';
      v_winner_id := v_room.challenged_id;
    else
      v_outcome := 'challenger_win';
      v_winner_id := v_room.challenger_id;
    end if;
  elsif v_challenger_event = 'workout_finished' and v_challenged_event = 'workout_finished' then
    v_status := 'finished';
    v_winner_id := p_winner_id;
    v_challenger_points := p_challenger_points;
    v_challenged_points := p_challenged_points;

    if v_challenger_points is null or v_challenged_points is null then
      raise exception 'Finished battle points are required'
        using errcode = '22004';
    end if;

    if v_challenger_points < 0
       or v_challenged_points < 0
       or v_challenger_points > v_score_total
       or v_challenged_points > v_score_total
       or v_challenger_points + v_challenged_points <> v_score_total then
      raise exception 'Finished battle points are invalid'
        using errcode = '22023';
    end if;

    if v_challenger_points > v_challenged_points then
      if v_winner_id <> v_room.challenger_id then
        raise exception 'Battle winner does not match points'
          using errcode = '22023';
      end if;
      v_outcome := 'challenger_win';
    elsif v_challenged_points > v_challenger_points then
      if v_winner_id <> v_room.challenged_id then
        raise exception 'Battle winner does not match points'
          using errcode = '22023';
      end if;
      v_outcome := 'challenged_win';
    else
      if v_winner_id is not null then
        raise exception 'Tie battle cannot have a winner'
          using errcode = '22023';
      end if;
      v_outcome := 'tie';
    end if;
  else
    return query
      select
        v_room.id,
        'waiting'::text,
        null::text,
        null::uuid,
        null::timestamp with time zone,
        false;
    return;
  end if;

  v_finalized_at := coalesce(v_room.finalized_at, v_room.ended_at, now());

  update public.workout_rooms as wr
  set
    status = v_status,
    ended_at = coalesce(wr.ended_at, v_finalized_at),
    finalized_at = coalesce(wr.finalized_at, v_finalized_at)
  where wr.id = v_room.id;

  insert into public.battle_results (
    room_id,
    challenger_id,
    challenged_id,
    winner_id,
    status,
    outcome,
    challenger_points,
    challenged_points,
    score_total,
    scoring_version,
    battle_mode,
    finalized_at,
    recap
  )
  values (
    v_room.id,
    v_room.challenger_id,
    v_room.challenged_id,
    v_winner_id,
    v_status,
    v_outcome,
    v_challenger_points,
    v_challenged_points,
    v_score_total,
    coalesce(nullif(p_scoring_version, ''), 'weighted_v1'),
    coalesce(v_room.battle_mode, 'hybrid'),
    v_finalized_at,
    v_recap
  )
  on conflict on constraint battle_results_pkey do nothing
  returning true into v_inserted;

  v_inserted := coalesce(v_inserted, false);

  perform public.refresh_battle_head_to_head_pair(v_room.challenger_id, v_room.challenged_id);

  return query
    select
      br.room_id,
      br.status,
      br.outcome,
      br.winner_id,
      br.finalized_at,
      v_inserted
    from public.battle_results br
    where br.room_id = v_room.id;
end;
$$;

revoke all on function public.record_battle_result_atomic(
  uuid,
  uuid,
  integer,
  integer,
  integer,
  text,
  jsonb
) from public;
revoke all on function public.record_battle_result_atomic(
  uuid,
  uuid,
  integer,
  integer,
  integer,
  text,
  jsonb
) from anon;
grant execute on function public.record_battle_result_atomic(
  uuid,
  uuid,
  integer,
  integer,
  integer,
  text,
  jsonb
) to authenticated;
grant execute on function public.record_battle_result_atomic(
  uuid,
  uuid,
  integer,
  integer,
  integer,
  text,
  jsonb
) to service_role;

comment on function public.record_battle_result_atomic(
  uuid,
  uuid,
  integer,
  integer,
  integer,
  text,
  jsonb
) is
  'Security definer is intentional: the RPC validates auth.uid() as a room participant, then writes the room result and both participants'' battle_head_to_head rows atomically to avoid client-side double counting and RLS asymmetry.';

commit;
