-- Restore/fix the account-deletion RPC called by supabase/functions/delete-account.
-- The edge function verifies the user and calls this RPC with the service-role
-- client, then deletes the auth user. Keep this RPC service-role only.

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

  -- Keep bug reports for debugging, but remove the user association so the
  -- later auth.users deletion is not blocked by the non-cascading FK.
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
  'Deletes/de-identifies public app data for a verified account-deletion request. Called by the delete-account edge function with service_role.';

commit;
