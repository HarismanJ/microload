-- user_training_plans.user_id references auth.users(id) without ON DELETE CASCADE,
-- so the auth.users deletion was failing with "Database error deleting user" until
-- those rows were explicitly removed.

begin;

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

  -- Cascades to user_training_plan_adaptations via plan_id FK.
  delete from public.user_training_plans
  where user_id = p_user_id;

  delete from public.foods
  where user_id = p_user_id;

  delete from public.exercises
  where user_id = p_user_id;

  delete from public.profiles
  where id = p_user_id;
end;
$$;

commit;
