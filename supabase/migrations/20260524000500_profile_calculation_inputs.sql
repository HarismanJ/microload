-- Narrow profile calculation inputs for features that intentionally need
-- bodyweight/gender/unit data after direct non-owner profile reads were locked down.

begin;

create or replace function public.get_friend_rank_profile(p_profile_id uuid)
returns table (
  id uuid,
  username text,
  full_name text,
  avatar_url text,
  unit_preference text,
  gender text,
  bodyweight numeric
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
    p.unit_preference,
    p.gender,
    p.bodyweight
  from public.profiles p
  where p.id = p_profile_id
    and (
      p.id = auth.uid()
      or exists (
        select 1
        from public.friendships f
        where f.status = 'accepted'
          and (
            (f.requester_id = auth.uid() and f.addressee_id = p.id)
            or (f.addressee_id = auth.uid() and f.requester_id = p.id)
          )
      )
    );
$$;

create or replace function public.get_battle_profile_inputs(p_room_id uuid)
returns table (
  id uuid,
  username text,
  full_name text,
  avatar_url text,
  unit_preference text,
  bodyweight numeric
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
    p.unit_preference,
    p.bodyweight
  from public.workout_rooms r
  join public.profiles p
    on p.id in (r.challenger_id, r.challenged_id)
  where r.id = p_room_id
    and auth.uid() in (r.challenger_id, r.challenged_id);
$$;

revoke all on function public.get_friend_rank_profile(uuid) from public;
revoke all on function public.get_friend_rank_profile(uuid) from anon;
grant execute on function public.get_friend_rank_profile(uuid) to authenticated;
grant execute on function public.get_friend_rank_profile(uuid) to service_role;

revoke all on function public.get_battle_profile_inputs(uuid) from public;
revoke all on function public.get_battle_profile_inputs(uuid) from anon;
grant execute on function public.get_battle_profile_inputs(uuid) to authenticated;
grant execute on function public.get_battle_profile_inputs(uuid) to service_role;

comment on function public.get_friend_rank_profile(uuid) is
  'Returns rank calculation profile fields for the caller or an accepted friend.';

comment on function public.get_battle_profile_inputs(uuid) is
  'Returns bodyweight/unit identity inputs for both participants in a battle room.';

commit;
