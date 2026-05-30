-- Persist battle results once per room and refresh head-to-head summaries from
-- that canonical ledger instead of rebuilding recaps on the client.

begin;

create table if not exists public.battle_results (
  room_id uuid primary key references public.workout_rooms(id) on delete cascade,
  challenger_id uuid not null references public.profiles(id) on delete cascade,
  challenged_id uuid not null references public.profiles(id) on delete cascade,
  winner_id uuid references public.profiles(id) on delete set null,
  status text not null,
  outcome text not null,
  challenger_points integer,
  challenged_points integer,
  score_total integer not null default 100,
  scoring_version text not null default 'weighted_v1',
  battle_mode text not null default 'hybrid',
  finalized_at timestamp with time zone not null default now(),
  recap jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone('utc'::text, now()),
  constraint battle_results_participants_distinct check (challenger_id <> challenged_id),
  constraint battle_results_status_check check (status in ('finished', 'cancelled')),
  constraint battle_results_outcome_check check (outcome in ('challenger_win', 'challenged_win', 'tie', 'void')),
  constraint battle_results_mode_check check (battle_mode in ('strength', 'hybrid', 'cardio')),
  constraint battle_results_score_total_check check (score_total between 1 and 1000),
  constraint battle_results_points_check check (
    (challenger_points is null or challenger_points between 0 and score_total)
    and (challenged_points is null or challenged_points between 0 and score_total)
  ),
  constraint battle_results_winner_participant_check check (
    winner_id is null or winner_id = challenger_id or winner_id = challenged_id
  ),
  constraint battle_results_outcome_winner_check check (
    (outcome = 'challenger_win' and winner_id = challenger_id)
    or (outcome = 'challenged_win' and winner_id = challenged_id)
    or (outcome in ('tie', 'void') and winner_id is null)
  )
);

alter table public.battle_results enable row level security;

drop policy if exists battle_results_participant_select on public.battle_results;
create policy battle_results_participant_select
on public.battle_results
for select
to authenticated
using (auth.uid() = challenger_id or auth.uid() = challenged_id);

create index if not exists battle_results_challenger_pair_idx
  on public.battle_results (challenger_id, challenged_id, finalized_at desc);

create index if not exists battle_results_challenged_pair_idx
  on public.battle_results (challenged_id, challenger_id, finalized_at desc);

drop trigger if exists trg_battle_results_updated_at on public.battle_results;
create trigger trg_battle_results_updated_at
before update on public.battle_results
for each row execute function public.set_battle_head_to_head_updated_at();

revoke all on table public.battle_results from public;
revoke all on table public.battle_results from anon;
revoke all on table public.battle_results from authenticated;
grant select on table public.battle_results to authenticated;
grant all on table public.battle_results to service_role;

create or replace function public.refresh_battle_head_to_head_pair(
  p_user_a uuid,
  p_user_b uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
  v_opponent_id uuid;
  v_wins integer;
  v_losses integer;
  v_ties integer;
  v_total integer;
  v_last_battle_at timestamp with time zone;
  v_last_outcome text;
begin
  if p_user_a is null or p_user_b is null or p_user_a = p_user_b then
    return;
  end if;

  for v_user_id, v_opponent_id in
    select p_user_a, p_user_b
    union all
    select p_user_b, p_user_a
  loop
    select
      count(*)::integer,
      count(*) filter (where br.winner_id = v_user_id)::integer,
      count(*) filter (where br.winner_id = v_opponent_id)::integer,
      count(*) filter (where br.winner_id is null)::integer
    into v_total, v_wins, v_losses, v_ties
    from public.battle_results br
    where (
      (br.challenger_id = v_user_id and br.challenged_id = v_opponent_id)
      or (br.challenger_id = v_opponent_id and br.challenged_id = v_user_id)
    );

    if coalesce(v_total, 0) = 0 then
      continue;
    end if;

    select
      br.finalized_at,
      case
        when br.winner_id = v_user_id then 'win'
        when br.winner_id = v_opponent_id then 'loss'
        else 'tie'
      end
    into v_last_battle_at, v_last_outcome
    from public.battle_results br
    where (
      (br.challenger_id = v_user_id and br.challenged_id = v_opponent_id)
      or (br.challenger_id = v_opponent_id and br.challenged_id = v_user_id)
    )
    order by br.finalized_at desc, br.created_at desc
    limit 1;

    insert into public.battle_head_to_head (
      user_id,
      opponent_id,
      wins,
      losses,
      ties,
      total,
      last_battle_at,
      last_outcome
    )
    values (
      v_user_id,
      v_opponent_id,
      coalesce(v_wins, 0),
      coalesce(v_losses, 0),
      coalesce(v_ties, 0),
      coalesce(v_total, 0),
      v_last_battle_at,
      v_last_outcome
    )
    on conflict (user_id, opponent_id) do update
      set
        wins = excluded.wins,
        losses = excluded.losses,
        ties = excluded.ties,
        total = excluded.total,
        last_battle_at = excluded.last_battle_at,
        last_outcome = excluded.last_outcome;
  end loop;
end;
$$;

revoke all on function public.refresh_battle_head_to_head_pair(uuid, uuid) from public;
revoke all on function public.refresh_battle_head_to_head_pair(uuid, uuid) from anon;
revoke all on function public.refresh_battle_head_to_head_pair(uuid, uuid) from authenticated;
grant execute on function public.refresh_battle_head_to_head_pair(uuid, uuid) to service_role;

comment on function public.refresh_battle_head_to_head_pair(uuid, uuid) is
  'Internal helper that recomputes both directional battle_head_to_head rows from battle_results.';

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

  update public.workout_rooms
  set
    status = v_status,
    ended_at = coalesce(ended_at, v_finalized_at),
    finalized_at = coalesce(finalized_at, v_finalized_at)
  where id = v_room.id;

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
  on conflict (room_id) do nothing
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

create or replace function public.delete_user_account_data(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_user_id is null then
    raise exception 'p_user_id is required'
      using errcode = '22004';
  end if;

  update public.bug_reports
  set user_id = null
  where user_id = p_user_id;

  delete from public.workout_room_events
  where user_id = p_user_id;

  delete from public.battle_results
  where challenger_id = p_user_id
     or challenged_id = p_user_id
     or winner_id = p_user_id;

  delete from public.battle_head_to_head
  where user_id = p_user_id
     or opponent_id = p_user_id;

  delete from public.battle_invites
  where challenger_id = p_user_id
     or challenged_id = p_user_id;

  delete from public.workout_rooms
  where challenger_id = p_user_id
     or challenged_id = p_user_id;

  delete from public.friendships
  where requester_id = p_user_id
     or addressee_id = p_user_id;

  delete from public.workout_sets
  where user_id = p_user_id;

  delete from public.workout_sessions
  where user_id = p_user_id;

  delete from public.body_weight_logs
  where user_id = p_user_id;

  delete from public.exercise_prs
  where user_id = p_user_id;

  delete from public.exercise_rank_states
  where user_id = p_user_id;

  delete from public.nutrition_logs
  where user_id = p_user_id;

  delete from public.user_exercise_preferences
  where user_id = p_user_id;

  delete from public.user_routines
  where user_id = p_user_id;

  delete from public.foods
  where user_id = p_user_id;

  delete from public.exercises
  where user_id = p_user_id;

  delete from public.profiles
  where id = p_user_id;
end;
$$;

revoke all on function public.delete_user_account_data(uuid) from public;
revoke all on function public.delete_user_account_data(uuid) from anon;
revoke all on function public.delete_user_account_data(uuid) from authenticated;
grant execute on function public.delete_user_account_data(uuid) to service_role;

comment on function public.delete_user_account_data(uuid) is
  'Deletes/de-identifies public app data for a verified account-deletion request, including battle_results. Called by the delete-account edge function with service_role.';

commit;
