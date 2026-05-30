-- Extend get_friend_rank_profile to return streak anchor columns.
--
-- RETURNS TABLE changes require DROP + CREATE even with the same parameter list.
-- Follows the same pattern as 20260526000200_finish_workout_rpc_streak.sql.

begin;

DROP FUNCTION IF EXISTS public.get_friend_rank_profile(uuid);

create or replace function public.get_friend_rank_profile(p_profile_id uuid)
returns table (
  id                     uuid,
  username               text,
  full_name              text,
  avatar_url             text,
  unit_preference        text,
  gender                 text,
  bodyweight             numeric,
  streak_start_date      date,
  streak_last_workout_at timestamp with time zone
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
    p.bodyweight,
    p.streak_start_date,
    p.streak_last_workout_at
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

revoke all on function public.get_friend_rank_profile(uuid) from public;
revoke all on function public.get_friend_rank_profile(uuid) from anon;
grant execute on function public.get_friend_rank_profile(uuid) to authenticated;
grant execute on function public.get_friend_rank_profile(uuid) to service_role;

comment on function public.get_friend_rank_profile(uuid) is
  'Returns rank calculation profile fields (including streak anchors) for the caller or an accepted friend.';

commit;
