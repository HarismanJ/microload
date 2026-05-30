-- Stop exposing full profile rows to friendship participants.
-- Non-owner profile display should use public.public_profiles or
-- public.get_public_profiles(), which expose identity fields only.

begin;

alter table public.profiles enable row level security;

drop policy if exists "profiles_owner_or_friendship_participant_select" on public.profiles;

-- Keep direct profiles table reads owner-only.
drop policy if exists profiles_select_own on public.profiles;

create policy profiles_select_own
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

-- Reassert the safe public identity surface for non-owner UI.
create or replace view public.public_profiles as
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
