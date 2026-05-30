-- Migration: 20260524000900_remove_duplicate_rls_policies.sql
-- Removes 26 redundant RLS policies confirmed against the live schema dump (2026-05-24).
-- Every dropped policy is fully covered by a surviving policy on the same table and operation.
-- No access rules change. Deferred non-identical pairs are documented in ultimate-final-audit.md.

-- battle_invites
DROP POLICY IF EXISTS "Users can view own battle invites" ON public.battle_invites;

-- battle_head_to_head
DROP POLICY IF EXISTS "Users can insert own battle summaries" ON public.battle_head_to_head;
DROP POLICY IF EXISTS "Users can view own battle summaries" ON public.battle_head_to_head;
DROP POLICY IF EXISTS "Users can update own battle summaries" ON public.battle_head_to_head;

-- body_weight_logs
DROP POLICY IF EXISTS "Users can manage their own weight logs" ON public.body_weight_logs;

-- exercise_prs
DROP POLICY IF EXISTS "Users can delete own PRs" ON public.exercise_prs;
DROP POLICY IF EXISTS "Users can insert own PRs" ON public.exercise_prs;
DROP POLICY IF EXISTS "Users can update own PRs" ON public.exercise_prs;

-- exercise_rank_states
DROP POLICY IF EXISTS "Users can view own rank states" ON public.exercise_rank_states;
DROP POLICY IF EXISTS "Users can delete own rank states" ON public.exercise_rank_states;
DROP POLICY IF EXISTS "Users can insert own rank states" ON public.exercise_rank_states;
DROP POLICY IF EXISTS "Users can update own rank states" ON public.exercise_rank_states;

-- foods
DROP POLICY IF EXISTS "Delete own foods" ON public.foods;
DROP POLICY IF EXISTS "Insert own foods" ON public.foods;
DROP POLICY IF EXISTS "Update own foods" ON public.foods;

-- friendships
DROP POLICY IF EXISTS "Users can view own friendships" ON public.friendships;
DROP POLICY IF EXISTS "Participants can remove friendships" ON public.friendships;

-- nutrition_logs
DROP POLICY IF EXISTS "Full access to own logs" ON public.nutrition_logs;

-- profiles
-- SELECT covered by "profiles_select_own", UPDATE by "profiles_update".
-- INSERT is handled by handle_new_user() SECURITY DEFINER trigger (bypasses RLS).
-- DELETE is handled by delete_user_account_data() service_role function (bypasses RLS).
DROP POLICY IF EXISTS "Users can manage own profile" ON public.profiles;

-- user_routines
DROP POLICY IF EXISTS "Users manage own routines" ON public.user_routines;

-- workout_room_events
DROP POLICY IF EXISTS "Battle participants can create room events" ON public.workout_room_events;
DROP POLICY IF EXISTS "Battle participants can view room events" ON public.workout_room_events;

-- workout_rooms
DROP POLICY IF EXISTS "Users can view own workout rooms" ON public.workout_rooms;
DROP POLICY IF EXISTS "Battle participants can update workout rooms" ON public.workout_rooms;

-- workout_sessions
DROP POLICY IF EXISTS "Users can manage own sessions" ON public.workout_sessions;

-- workout_sets
DROP POLICY IF EXISTS "Users can manage own sets" ON public.workout_sets;
