-- Lock down private user data that was previously exposed by permissive
-- SELECT policies. This migration intentionally keeps global catalog rows
-- readable for foods/exercises while restricting user-owned rows to owners.

begin;

alter table public.profiles enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.body_weight_logs enable row level security;
alter table public.exercise_prs enable row level security;
alter table public.exercise_rank_states enable row level security;
alter table public.foods enable row level security;
alter table public.exercises enable row level security;

-- Profiles contain private body/nutrition/preference fields, so direct table
-- reads are owner-only. Use public.public_profiles for social identity reads.
drop policy if exists "Authenticated users can discover profiles" on public.profiles;
drop policy if exists profiles_select on public.profiles;
drop policy if exists profiles_select_own on public.profiles;

create policy profiles_select_own
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

-- Workout sessions include free-text notes and exercise_notes JSON.
drop policy if exists sessions_select on public.workout_sessions;
drop policy if exists workout_sessions_select_own on public.workout_sessions;

create policy workout_sessions_select_own
  on public.workout_sessions
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Body-weight logs are health data and should never be globally readable.
drop policy if exists weight_logs_select on public.body_weight_logs;
drop policy if exists body_weight_logs_select_own on public.body_weight_logs;

create policy body_weight_logs_select_own
  on public.body_weight_logs
  for select
  to authenticated
  using (auth.uid() = user_id);

-- PRs and rank states are user-owned performance data.
drop policy if exists "Authenticated users can read PRs" on public.exercise_prs;
drop policy if exists prs_select on public.exercise_prs;
drop policy if exists exercise_prs_select_own on public.exercise_prs;

create policy exercise_prs_select_own
  on public.exercise_prs
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists rank_states_select on public.exercise_rank_states;
drop policy if exists exercise_rank_states_select_own on public.exercise_rank_states;

create policy exercise_rank_states_select_own
  on public.exercise_rank_states
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Catalog rows are global when user_id is null; custom rows are private.
drop policy if exists foods_select on public.foods;
drop policy if exists "Read global and own foods" on public.foods;
drop policy if exists foods_select_global_or_own on public.foods;

create policy foods_select_global_or_own
  on public.foods
  for select
  to authenticated
  using ((user_id is null) or (auth.uid() = user_id));

drop policy if exists exercises_select on public.exercises;
drop policy if exists exercises_select_global_or_own on public.exercises;

create policy exercises_select_global_or_own
  on public.exercises
  for select
  to authenticated
  using ((user_id is null) or (auth.uid() = user_id));

-- Safe social identity surface. This deliberately excludes bodyweight,
-- nutrition goals, preferences, age, gender, volume, and other private fields.
drop view if exists public.public_profiles;

create view public.public_profiles as
select
  id,
  username,
  full_name,
  avatar_url,
  created_at
from public.profiles;

revoke all on public.public_profiles from public;
revoke all on public.public_profiles from anon;
grant select on public.public_profiles to authenticated;
grant select on public.public_profiles to service_role;

comment on view public.public_profiles is
  'Public social identity fields only. Use this instead of direct profiles reads for non-owner profile display.';

-- Convenience RPC for existing battle/friend UI migrations. It returns only
-- the same safe identity fields as public.public_profiles.
create or replace function public.get_public_profiles(p_profile_ids uuid[])
returns table (
  id uuid,
  username text,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    p.id,
    p.username,
    p.full_name,
    p.avatar_url,
    p.created_at
  from public.profiles p
  where p.id = any(coalesce(p_profile_ids, array[]::uuid[]));
$$;

revoke all on function public.get_public_profiles(uuid[]) from public;
revoke all on function public.get_public_profiles(uuid[]) from anon;
grant execute on function public.get_public_profiles(uuid[]) to authenticated;
grant execute on function public.get_public_profiles(uuid[]) to service_role;

commit;
