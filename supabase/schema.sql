


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."app_check_rate_limit"("p_action" "text", "p_limit" integer, "p_window_seconds" integer, "p_scope" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  current_user_id uuid := auth.uid();
  current_count integer;
begin
  if current_user_id is null then
    return;
  end if;

  delete from public.rate_limit_events
  where created_at < now() - interval '7 days';

  insert into public.rate_limit_events (user_id, action, scope)
  values (current_user_id, p_action, p_scope);

  select count(*)
  into current_count
  from public.rate_limit_events
  where user_id = current_user_id
    and action = p_action
    and coalesce(scope, '') = coalesce(p_scope, '')
    and created_at >= now() - make_interval(secs => p_window_seconds);

  if current_count > p_limit then
    raise exception 'Rate limit exceeded for %', p_action
      using errcode = 'P0001';
  end if;
end;
$$;


ALTER FUNCTION "public"."app_check_rate_limit"("p_action" "text", "p_limit" integer, "p_window_seconds" integer, "p_scope" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."app_enforce_write_rate_limit"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
declare
  action_name text := tg_argv[0];
  limit_count integer := tg_argv[1]::integer;
  window_seconds integer := tg_argv[2]::integer;
  scope_parts text[] := array[]::text[];
  scope_value text;
  idx integer;
begin
  if auth.uid() is null then
    return new;
  end if;

  if tg_nargs > 3 then
    for idx in 3..(tg_nargs - 1) loop
      execute format('select ($1).%I::text', tg_argv[idx])
      using new
      into scope_value;
      scope_parts := scope_parts || coalesce(scope_value, 'null');
    end loop;
  end if;

  perform public.app_check_rate_limit(
    action_name,
    limit_count,
    window_seconds,
    case when array_length(scope_parts, 1) is null then null else array_to_string(scope_parts, ':') end
  );

  return new;
end;
$_$;


ALTER FUNCTION "public"."app_enforce_write_rate_limit"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."app_json_text_size_ok"("p_value" "jsonb", "p_max_bytes" integer) RETURNS boolean
    LANGUAGE "sql" IMMUTABLE
    AS $$
  select p_value is null or octet_length(p_value::text) <= p_max_bytes
$$;


ALTER FUNCTION "public"."app_json_text_size_ok"("p_value" "jsonb", "p_max_bytes" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."app_validate_exercise_notes"("p_notes" "jsonb") RETURNS boolean
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
declare
  item record;
  key_count integer := 0;
begin
  if p_notes is null then
    return true;
  end if;

  if jsonb_typeof(p_notes) <> 'object' or not public.app_json_text_size_ok(p_notes, 16384) then
    return false;
  end if;

  for item in select key, value from jsonb_each(p_notes) loop
    key_count := key_count + 1;
    if key_count > 80 then return false; end if;
    if char_length(item.key) > 80 then return false; end if;
    if jsonb_typeof(item.value) <> 'string' then return false; end if;
    if char_length(trim(both '"' from item.value::text)) > 1000 then return false; end if;
  end loop;

  return true;
end;
$$;


ALTER FUNCTION "public"."app_validate_exercise_notes"("p_notes" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."app_validate_routine_exercises"("p_exercises" "jsonb") RETURNS boolean
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
declare
  item jsonb;
  item_count integer := 0;
  item_name text;
  item_sets numeric;
begin
  if p_exercises is null then
    return true;
  end if;

  if jsonb_typeof(p_exercises) <> 'array' or not public.app_json_text_size_ok(p_exercises, 32768) then
    return false;
  end if;

  for item in select value from jsonb_array_elements(p_exercises) loop
    item_count := item_count + 1;
    if item_count > 100 then return false; end if;
    if jsonb_typeof(item) <> 'object' then return false; end if;

    item_name := item->>'name';
    if item_name is null or char_length(btrim(item_name)) < 1 or char_length(item_name) > 80 then
      return false;
    end if;

    item_sets := nullif(item->>'sets', '')::numeric;
    if item_sets is null or item_sets < 1 or item_sets > 100 or item_sets <> floor(item_sets) then
      return false;
    end if;
  end loop;

  return true;
exception
  when others then
    return false;
end;
$$;


ALTER FUNCTION "public"."app_validate_routine_exercises"("p_exercises" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."app_validate_training_plan_days"("p_days" "jsonb") RETURNS boolean
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
declare
  day_item jsonb;
  exercise_item jsonb;
  day_count integer := 0;
  exercise_count integer;
  numeric_value numeric;
begin
  if p_days is null then
    return false;
  end if;

  if jsonb_typeof(p_days) <> 'array' or octet_length(p_days::text) > 65536 then
    return false;
  end if;

  for day_item in select value from jsonb_array_elements(p_days) loop
    day_count := day_count + 1;
    if day_count > 7 then return false; end if;
    if jsonb_typeof(day_item) <> 'object' then return false; end if;
    if char_length(coalesce(day_item->>'id', '')) > 40 then return false; end if;
    if char_length(coalesce(day_item->>'name', '')) not between 1 and 80 then return false; end if;
    if char_length(coalesce(day_item->>'focus', '')) > 60 then return false; end if;

    if day_item ? 'estimatedMinutes' then
      numeric_value := (day_item->>'estimatedMinutes')::numeric;
      if numeric_value < 1 or numeric_value > 240 then return false; end if;
    end if;

    if jsonb_typeof(day_item->'exercises') <> 'array' then return false; end if;
    exercise_count := 0;

    for exercise_item in select value from jsonb_array_elements(day_item->'exercises') loop
      exercise_count := exercise_count + 1;
      if exercise_count > 12 then return false; end if;
      if jsonb_typeof(exercise_item) <> 'object' then return false; end if;
      if char_length(coalesce(exercise_item->>'name', '')) not between 1 and 120 then return false; end if;
      if char_length(coalesce(exercise_item->>'category', '')) > 80 then return false; end if;
      if char_length(coalesce(exercise_item->>'equipment', '')) > 80 then return false; end if;
      if char_length(coalesce(exercise_item->>'repRange', '')) > 20 then return false; end if;
      if char_length(coalesce(exercise_item->>'notes', '')) > 240 then return false; end if;

      if exercise_item ? 'sets' then
        numeric_value := (exercise_item->>'sets')::numeric;
        if numeric_value < 1 or numeric_value > 12 or numeric_value <> floor(numeric_value) then return false; end if;
      end if;
      if exercise_item ? 'reps' then
        numeric_value := (exercise_item->>'reps')::numeric;
        if numeric_value < 1 or numeric_value > 9999 or numeric_value <> floor(numeric_value) then return false; end if;
      end if;
      if exercise_item ? 'restSeconds' then
        numeric_value := (exercise_item->>'restSeconds')::numeric;
        if numeric_value < 0 or numeric_value > 3600 or numeric_value <> floor(numeric_value) then return false; end if;
      end if;
      if exercise_item ? 'durationSeconds' then
        numeric_value := (exercise_item->>'durationSeconds')::numeric;
        if numeric_value < 1 or numeric_value > 86400 or numeric_value <> floor(numeric_value) then return false; end if;
      end if;
    end loop;
  end loop;

  return day_count between 1 and 7;
exception
  when others then
    return false;
end;
$$;


ALTER FUNCTION "public"."app_validate_training_plan_days"("p_days" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."app_validate_workout_room_event_payload"("p_event_type" "text", "p_payload" "jsonb") RETURNS boolean
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
declare
  item record;
  allowed_keys text[] := array[
    'sessionId',
    'exerciseId',
    'exerciseName',
    'exerciseIds',
    'exerciseNames',
    'exerciseCategories',
    'category',
    'equipment',
    'unit',
    'setNumber',
    'weight',
    'reps',
    'durationSeconds',
    'duration_seconds',
    'met',
    'totalSets',
    'totalVolume',
    'totalVolumeKg',
    'totalExercises',
    'exerciseCount'
  ];
  event_types text[] := array[
    'workout_started',
    'exercise_added',
    'set_completed',
    'set_removed',
    'workout_finished',
    'workout_cancelled',
    'workout_stale'
  ];
  key_count integer := 0;
  numeric_value numeric;
  arr jsonb;
begin
  if p_event_type is null or not (p_event_type = any(event_types)) then
    return false;
  end if;

  if p_payload is null then
    p_payload := '{}'::jsonb;
  end if;

  if jsonb_typeof(p_payload) <> 'object' or not public.app_json_text_size_ok(p_payload, 8192) then
    return false;
  end if;

  for item in select key, value from jsonb_each(p_payload) loop
    key_count := key_count + 1;
    if key_count > 32 then return false; end if;
    if not (item.key = any(allowed_keys)) then return false; end if;

    if item.key in ('exerciseName', 'category', 'equipment', 'unit', 'sessionId') then
      if jsonb_typeof(item.value) <> 'string' then return false; end if;
      if char_length(trim(both '"' from item.value::text)) > 120 then return false; end if;
    end if;

    if item.key in ('exerciseNames', 'exerciseCategories') then
      if jsonb_typeof(item.value) <> 'array' or jsonb_array_length(item.value) > 100 then return false; end if;
      for arr in select value from jsonb_array_elements(item.value) loop
        if jsonb_typeof(arr) <> 'string' then return false; end if;
        if char_length(trim(both '"' from arr::text)) > 120 then return false; end if;
      end loop;
    end if;

    if item.key = 'exerciseIds' then
      if jsonb_typeof(item.value) <> 'array' or jsonb_array_length(item.value) > 100 then return false; end if;
      for arr in select value from jsonb_array_elements(item.value) loop
        if jsonb_typeof(arr) <> 'number' then return false; end if;
        numeric_value := (trim(both '"' from arr::text))::numeric;
        if numeric_value < 1 or numeric_value > 1000000 or numeric_value <> floor(numeric_value) then return false; end if;
      end loop;
    end if;
  end loop;

  if p_payload ? 'setNumber' then
    numeric_value := (p_payload->>'setNumber')::numeric;
    if numeric_value < 1 or numeric_value > 9999 or numeric_value <> floor(numeric_value) then return false; end if;
  end if;

  if p_payload ? 'reps' then
    numeric_value := (p_payload->>'reps')::numeric;
    if numeric_value < 1 or numeric_value > 9999 or numeric_value <> floor(numeric_value) then return false; end if;
  end if;

  if p_payload ? 'weight' then
    numeric_value := (p_payload->>'weight')::numeric;
    if numeric_value < -10000 or numeric_value > 10000 then return false; end if;
  end if;

  if p_payload ? 'durationSeconds' then
    numeric_value := (p_payload->>'durationSeconds')::numeric;
    if numeric_value < 0 or numeric_value > 86400 then return false; end if;
  end if;

  if p_payload ? 'duration_seconds' then
    numeric_value := (p_payload->>'duration_seconds')::numeric;
    if numeric_value < 0 or numeric_value > 86400 then return false; end if;
  end if;

  if p_payload ? 'met' then
    numeric_value := (p_payload->>'met')::numeric;
    if numeric_value < 0 or numeric_value > 30 then return false; end if;
  end if;

  if p_payload ? 'totalSets' then
    numeric_value := (p_payload->>'totalSets')::numeric;
    if numeric_value < 0 or numeric_value > 10000 or numeric_value <> floor(numeric_value) then return false; end if;
  end if;

  if p_payload ? 'totalExercises' then
    numeric_value := (p_payload->>'totalExercises')::numeric;
    if numeric_value < 0 or numeric_value > 1000 or numeric_value <> floor(numeric_value) then return false; end if;
  end if;

  if p_payload ? 'exerciseCount' then
    numeric_value := (p_payload->>'exerciseCount')::numeric;
    if numeric_value < 0 or numeric_value > 1000 or numeric_value <> floor(numeric_value) then return false; end if;
  end if;

  if p_payload ? 'totalVolume' then
    numeric_value := (p_payload->>'totalVolume')::numeric;
    if numeric_value < 0 or numeric_value > 100000000 then return false; end if;
  end if;

  if p_payload ? 'totalVolumeKg' then
    numeric_value := (p_payload->>'totalVolumeKg')::numeric;
    if numeric_value < 0 or numeric_value > 100000000 then return false; end if;
  end if;

  if p_event_type = 'set_completed' then
    if not (p_payload ? 'exerciseId' or p_payload ? 'exerciseName') then return false; end if;
    if not (p_payload ? 'setNumber') then return false; end if;
    if p_payload ? 'durationSeconds' or p_payload ? 'duration_seconds' then
      numeric_value := coalesce((p_payload->>'durationSeconds')::numeric, (p_payload->>'duration_seconds')::numeric);
      return numeric_value >= 1 and numeric_value <= 86400;
    end if;
    return (p_payload ? 'weight' and p_payload ? 'reps');
  end if;

  if p_event_type = 'set_removed' then
    return (p_payload ? 'setNumber') and (p_payload ? 'exerciseId' or p_payload ? 'exerciseName');
  end if;

  return true;
exception
  when others then
    return false;
end;
$$;


ALTER FUNCTION "public"."app_validate_workout_room_event_payload"("p_event_type" "text", "p_payload" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."count_distinct_nutrition_days"("p_user_id" "uuid") RETURNS bigint
    LANGUAGE "sql" STABLE
    AS $$
  SELECT COUNT(DISTINCT log_date)
  FROM nutrition_logs
  WHERE user_id = p_user_id
$$;


ALTER FUNCTION "public"."count_distinct_nutrition_days"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_user_account_data"("p_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
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


ALTER FUNCTION "public"."delete_user_account_data"("p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."delete_user_account_data"("p_user_id" "uuid") IS 'Deletes/de-identifies public app data for a verified account-deletion request, including battle_results. Called by the delete-account edge function with service_role.';



CREATE OR REPLACE FUNCTION "public"."finish_workout_session_atomic"("p_session_id" "uuid", "p_finished_at" timestamp with time zone, "p_exercise_notes" "jsonb" DEFAULT '{}'::"jsonb", "p_calories_burned" integer DEFAULT NULL::integer, "p_source_plan_id" "uuid" DEFAULT NULL::"uuid", "p_source_plan_day_id" "text" DEFAULT NULL::"text", "p_source_plan_week" integer DEFAULT NULL::integer, "p_session_training_volume_kg" double precision DEFAULT 0, "p_sets" "jsonb" DEFAULT '[]'::"jsonb", "p_prs" "jsonb" DEFAULT '[]'::"jsonb", "p_rank_states" "jsonb" DEFAULT '[]'::"jsonb", "p_streak_start_date" "date" DEFAULT NULL::"date", "p_streak_last_workout_at" timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_user_id uuid := auth.uid();
  v_session_owner uuid;
begin
  if v_user_id is null then
    raise exception 'Unauthorized workout completion'
      using errcode = '42501';
  end if;

  select ws.user_id
    into v_session_owner
  from public.workout_sessions ws
  where ws.id = p_session_id
  for update;

  if v_session_owner is null or v_session_owner <> v_user_id then
    raise exception 'Unauthorized workout completion'
      using errcode = '42501';
  end if;

  if exists (
    select 1
    from public.workout_sessions ws
    where ws.id = p_session_id
      and ws.finished_at is not null
  ) then
    return;
  end if;

  if jsonb_typeof(coalesce(p_sets, '[]'::jsonb)) <> 'array' then
    raise exception 'Workout sets payload must be an array'
      using errcode = '22023';
  end if;

  if jsonb_typeof(coalesce(p_prs, '[]'::jsonb)) <> 'array' then
    raise exception 'Workout PR payload must be an array'
      using errcode = '22023';
  end if;

  if jsonb_typeof(coalesce(p_rank_states, '[]'::jsonb)) <> 'array' then
    raise exception 'Workout rank state payload must be an array'
      using errcode = '22023';
  end if;

  insert into public.workout_sets (
    user_id,
    session_id,
    exercise_id,
    set_number,
    reps,
    weight,
    unit,
    estimated_1rm,
    duration_seconds,
    completed_at,
    rest_before_seconds,
    progression_event,
    is_warmup,
    set_type,
    set_group_index
  )
  select
    v_user_id,
    p_session_id,
    s.exercise_id,
    s.set_number,
    s.reps,
    s.weight,
    coalesce(s.unit, 'kg'),
    s.estimated_1rm,
    s.duration_seconds,
    s.completed_at,
    s.rest_before_seconds,
    s.progression_event,
    coalesce(s.is_warmup, false),
    coalesce(s.set_type, 'normal'),
    s.set_group_index
  from jsonb_to_recordset(coalesce(p_sets, '[]'::jsonb)) as s(
    exercise_id integer,
    set_number integer,
    reps integer,
    weight numeric,
    unit text,
    estimated_1rm numeric,
    duration_seconds integer,
    completed_at timestamp with time zone,
    rest_before_seconds integer,
    progression_event text,
    is_warmup boolean,
    set_type text,
    set_group_index integer
  );

  update public.workout_sessions
  set
    finished_at = p_finished_at,
    exercise_notes = coalesce(p_exercise_notes, '{}'::jsonb),
    calories_burned = p_calories_burned,
    source_plan_id = coalesce(p_source_plan_id, source_plan_id),
    source_plan_day_id = coalesce(p_source_plan_day_id, source_plan_day_id),
    source_plan_week = coalesce(p_source_plan_week, source_plan_week)
  where id = p_session_id
    and user_id = v_user_id;

  update public.profiles
  set
    lifetime_volume_kg     = greatest(0, coalesce(lifetime_volume_kg, 0) + coalesce(p_session_training_volume_kg, 0)),
    streak_start_date      = COALESCE(p_streak_start_date,      streak_start_date),
    streak_last_workout_at = COALESCE(p_streak_last_workout_at, streak_last_workout_at)
  where id = v_user_id;

  insert into public.exercise_prs (
    user_id,
    exercise_id,
    best_1rm_kg,
    updated_at
  )
  select
    v_user_id,
    p.exercise_id,
    p.best_1rm_kg,
    coalesce(p.updated_at, p_finished_at, now())
  from jsonb_to_recordset(coalesce(p_prs, '[]'::jsonb)) as p(
    exercise_id bigint,
    best_1rm_kg double precision,
    updated_at timestamp with time zone
  )
  on conflict (user_id, exercise_id) do update
    set
      best_1rm_kg = excluded.best_1rm_kg,
      updated_at = excluded.updated_at;

  insert into public.exercise_rank_states (
    user_id,
    exercise_id,
    current_score,
    peak_score,
    last_ranked_at,
    updated_at
  )
  select
    v_user_id,
    r.exercise_id,
    r.current_score,
    r.peak_score,
    r.last_ranked_at,
    coalesce(r.updated_at, p_finished_at, now())
  from jsonb_to_recordset(coalesce(p_rank_states, '[]'::jsonb)) as r(
    exercise_id bigint,
    current_score double precision,
    peak_score double precision,
    last_ranked_at timestamp with time zone,
    updated_at timestamp with time zone
  )
  on conflict (user_id, exercise_id) do update
    set
      current_score = excluded.current_score,
      peak_score = greatest(public.exercise_rank_states.peak_score, excluded.peak_score),
      last_ranked_at = excluded.last_ranked_at,
      updated_at = excluded.updated_at;
end;
$$;


ALTER FUNCTION "public"."finish_workout_session_atomic"("p_session_id" "uuid", "p_finished_at" timestamp with time zone, "p_exercise_notes" "jsonb", "p_calories_burned" integer, "p_source_plan_id" "uuid", "p_source_plan_day_id" "text", "p_source_plan_week" integer, "p_session_training_volume_kg" double precision, "p_sets" "jsonb", "p_prs" "jsonb", "p_rank_states" "jsonb", "p_streak_start_date" "date", "p_streak_last_workout_at" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_battle_profile_inputs"("p_room_id" "uuid") RETURNS TABLE("id" "uuid", "username" "text", "full_name" "text", "avatar_url" "text", "unit_preference" "text", "bodyweight" numeric)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
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


ALTER FUNCTION "public"."get_battle_profile_inputs"("p_room_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_battle_profile_inputs"("p_room_id" "uuid") IS 'Returns bodyweight/unit identity inputs for both participants in a battle room.';



CREATE OR REPLACE FUNCTION "public"."get_exercise_daily_orm_points"("p_user_id" "uuid", "p_exercise_id" bigint) RETURNS TABLE("day" "date", "best_orm_kg" numeric)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
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


ALTER FUNCTION "public"."get_exercise_daily_orm_points"("p_user_id" "uuid", "p_exercise_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_exercise_history_summary"("p_user_id" "uuid", "p_exercise_id" bigint) RETURNS TABLE("best_orm_kg" numeric, "best_set_weight" numeric, "best_set_reps" integer, "best_set_unit" "text", "total_volume_kg" numeric, "total_sets" bigint)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
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


ALTER FUNCTION "public"."get_exercise_history_summary"("p_user_id" "uuid", "p_exercise_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_friend_rank_profile"("p_profile_id" "uuid") RETURNS TABLE("id" "uuid", "username" "text", "full_name" "text", "avatar_url" "text", "unit_preference" "text", "gender" "text", "bodyweight" numeric, "streak_start_date" "date", "streak_last_workout_at" timestamp with time zone)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
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


ALTER FUNCTION "public"."get_friend_rank_profile"("p_profile_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_friend_rank_profile"("p_profile_id" "uuid") IS 'Returns rank calculation profile fields (including streak anchors) for the caller or an accepted friend.';



CREATE OR REPLACE FUNCTION "public"."get_public_profiles"("p_profile_ids" "uuid"[]) RETURNS TABLE("id" "uuid", "username" "text", "full_name" "text", "avatar_url" "text", "created_at" timestamp with time zone)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  select
    p.id,
    p.username,
    p.full_name,
    p.avatar_url,
    p.created_at
  from public.profiles p
  where p.id = any(coalesce(p_profile_ids, array[]::uuid[]));
$$;


ALTER FUNCTION "public"."get_public_profiles"("p_profile_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_recent_progressive_overload_sets"("p_exercise_ids" integer[], "p_session_limit" integer DEFAULT 8, "p_exclude_session_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("exercise_id" integer, "session_id" "uuid", "session_started_at" timestamp with time zone, "weight" numeric, "reps" integer, "unit" "text", "estimated_1rm" numeric, "estimated_fresh_1rm" numeric, "set_number" integer, "duration_seconds" integer, "completed_at" timestamp with time zone, "rest_before_seconds" integer, "created_at" timestamp with time zone, "progression_event" "text", "is_warmup" boolean, "set_type" "text", "set_group_index" integer)
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  with requested_exercises as (
    select distinct exercise_id
    from unnest(coalesce(p_exercise_ids, array[]::integer[])) as requested(exercise_id)
    where exercise_id is not null
  ),
  session_candidates as (
    select
      ws.exercise_id,
      ws.session_id,
      wse.started_at as session_started_at,
      max(ws.created_at) as latest_set_created_at
    from public.workout_sets ws
    join public.workout_sessions wse on wse.id = ws.session_id
    join requested_exercises re on re.exercise_id = ws.exercise_id
    where
      auth.uid() is not null
      and ws.user_id = auth.uid()
      and wse.user_id = auth.uid()
      and (p_exclude_session_id is null or ws.session_id <> p_exclude_session_id)
    group by ws.exercise_id, ws.session_id, wse.started_at
  ),
  ranked_sessions as (
    select
      sc.*,
      row_number() over (
        partition by sc.exercise_id
        order by sc.session_started_at desc nulls last, sc.latest_set_created_at desc nulls last, sc.session_id desc
      ) as rn
    from session_candidates sc
  ),
  selected_sessions as (
    select
      rs.exercise_id,
      rs.session_id,
      rs.session_started_at
    from ranked_sessions rs
    where rs.rn <= least(greatest(coalesce(p_session_limit, 8), 1), 50)
  )
  select
    ws.exercise_id,
    ws.session_id,
    ss.session_started_at,
    ws.weight,
    ws.reps,
    ws.unit,
    ws.estimated_1rm,
    ws.estimated_fresh_1rm,
    ws.set_number,
    ws.duration_seconds,
    ws.completed_at,
    ws.rest_before_seconds,
    ws.created_at,
    ws.progression_event,
    ws.is_warmup,
    ws.set_type,
    ws.set_group_index
  from selected_sessions ss
  join public.workout_sets ws
    on ws.exercise_id = ss.exercise_id
    and ws.session_id = ss.session_id
  join public.workout_sessions wse on wse.id = ws.session_id
  where
    auth.uid() is not null
    and ws.user_id = auth.uid()
    and wse.user_id = auth.uid()
  order by ss.exercise_id, ss.session_started_at asc nulls last, ws.set_number asc, ws.created_at asc;
$$;


ALTER FUNCTION "public"."get_recent_progressive_overload_sets"("p_exercise_ids" integer[], "p_session_limit" integer, "p_exclude_session_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  insert into public.profiles (id)
  values (new.id);
  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."record_battle_result_atomic"("p_room_id" "uuid", "p_winner_id" "uuid" DEFAULT NULL::"uuid", "p_challenger_points" integer DEFAULT NULL::integer, "p_challenged_points" integer DEFAULT NULL::integer, "p_score_total" integer DEFAULT 100, "p_scoring_version" "text" DEFAULT 'weighted_v1'::"text", "p_recap" "jsonb" DEFAULT '{}'::"jsonb") RETURNS TABLE("room_id" "uuid", "status" "text", "outcome" "text", "winner_id" "uuid", "finalized_at" timestamp with time zone, "inserted" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
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


ALTER FUNCTION "public"."record_battle_result_atomic"("p_room_id" "uuid", "p_winner_id" "uuid", "p_challenger_points" integer, "p_challenged_points" integer, "p_score_total" integer, "p_scoring_version" "text", "p_recap" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."record_battle_result_atomic"("p_room_id" "uuid", "p_winner_id" "uuid", "p_challenger_points" integer, "p_challenged_points" integer, "p_score_total" integer, "p_scoring_version" "text", "p_recap" "jsonb") IS 'Security definer is intentional: the RPC validates auth.uid() as a room participant, then writes the room result and both participants'' battle_head_to_head rows atomically to avoid client-side double counting and RLS asymmetry.';



CREATE OR REPLACE FUNCTION "public"."refresh_battle_head_to_head_pair"("p_user_a" "uuid", "p_user_b" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
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


ALTER FUNCTION "public"."refresh_battle_head_to_head_pair"("p_user_a" "uuid", "p_user_b" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."refresh_battle_head_to_head_pair"("p_user_a" "uuid", "p_user_b" "uuid") IS 'Internal helper that recomputes both directional battle_head_to_head rows from battle_results.';



CREATE OR REPLACE FUNCTION "public"."respond_to_battle_invite_atomic"("p_invite_id" "uuid", "p_action" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_user_id uuid := auth.uid();
  v_invite  public.battle_invites;
  v_room_id uuid;
  v_room    jsonb;
begin
  -- Auth guard
  if v_user_id is null then
    raise exception 'Unauthorized' using errcode = '42501';
  end if;

  -- Validate action value before touching the DB
  if p_action not in ('accepted', 'declined') then
    raise exception 'Invalid action: must be accepted or declined'
      using errcode = '22023';
  end if;

  -- Lock the invite row to prevent two concurrent responses racing each other
  select * into v_invite
  from public.battle_invites
  where id = p_invite_id
  for update;

  if v_invite.id is null then
    raise exception 'Battle invite not found' using errcode = '22023';
  end if;

  -- Only the challenged user may respond
  if v_invite.challenged_id <> v_user_id then
    raise exception 'Unauthorized: only the challenged user can respond'
      using errcode = '42501';
  end if;

  -- Idempotency: already responded — return current state without erroring
  if v_invite.status <> 'pending' then
    if v_invite.status = 'accepted' and v_invite.room_id is not null then
      select to_jsonb(r) into v_room
      from public.workout_rooms r
      where r.id = v_invite.room_id;
      return v_room;
    end if;
    return null;
  end if;

  -- ── Declined path ────────────────────────────────────────────────────────
  if p_action = 'declined' then
    update public.battle_invites
    set status       = 'declined',
        responded_at = now()
    where id = p_invite_id;
    return null;
  end if;

  -- ── Accepted path ────────────────────────────────────────────────────────
  -- Insert the workout room and update the invite in one transaction.
  -- battle_mode is read from the locked invite row (already validated by
  -- battle_invites_battle_mode_valid check constraint at insert time).
  insert into public.workout_rooms (invite_id, challenger_id, challenged_id, battle_mode)
  values (
    p_invite_id,
    v_invite.challenger_id,
    v_invite.challenged_id,
    v_invite.battle_mode
  )
  returning id into v_room_id;

  update public.battle_invites
  set status       = 'accepted',
      responded_at = now(),
      room_id      = v_room_id
  where id = p_invite_id;

  -- Return full room row as jsonb so the JS caller gets the same shape
  -- it previously got from .select('id, invite_id, challenger_id, ...').single()
  select to_jsonb(r) into v_room
  from public.workout_rooms r
  where r.id = v_room_id;

  return v_room;
end;
$$;


ALTER FUNCTION "public"."respond_to_battle_invite_atomic"("p_invite_id" "uuid", "p_action" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."respond_to_battle_invite_atomic"("p_invite_id" "uuid", "p_action" "text") IS 'Atomically responds to a battle invite. Accepts or declines in a single transaction with a FOR UPDATE lock on the invite row, preventing phantom battle rooms from partial client-side failures. SECURITY INVOKER — existing RLS policies already permit all required operations for the challenged_id user.';



CREATE OR REPLACE FUNCTION "public"."search_profiles_for_friendship"("p_search" "text") RETURNS TABLE("id" "uuid", "username" "text", "full_name" "text")
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select p.id, p.username, p.full_name
  from public.profiles p
  where auth.uid() is not null
    and p.id <> auth.uid()
    and p.username ilike '%' || left(btrim(coalesce(p_search, '')), 100) || '%'
    and btrim(coalesce(p_search, '')) <> ''
  order by p.username asc
  limit 8
$$;


ALTER FUNCTION "public"."search_profiles_for_friendship"("p_search" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_battle_head_to_head_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;


ALTER FUNCTION "public"."set_battle_head_to_head_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_exercise_rank_states_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;


ALTER FUNCTION "public"."set_exercise_rank_states_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_profile_workout_count"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if tg_op = 'INSERT' then
    if new.finished_at is not null then
      update public.profiles
      set workout_count = coalesce(workout_count, 0) + 1
      where id = new.user_id;
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if old.user_id = new.user_id then
      if old.finished_at is null and new.finished_at is not null then
        update public.profiles
        set workout_count = coalesce(workout_count, 0) + 1
        where id = new.user_id;
      elsif old.finished_at is not null and new.finished_at is null then
        update public.profiles
        set workout_count = greatest(coalesce(workout_count, 0) - 1, 0)
        where id = new.user_id;
      end if;
    else
      if old.finished_at is not null then
        update public.profiles
        set workout_count = greatest(coalesce(workout_count, 0) - 1, 0)
        where id = old.user_id;
      end if;

      if new.finished_at is not null then
        update public.profiles
        set workout_count = coalesce(workout_count, 0) + 1
        where id = new.user_id;
      end if;
    end if;

    return new;
  end if;

  if tg_op = 'DELETE' then
    if old.finished_at is not null then
      update public.profiles
      set workout_count = greatest(coalesce(workout_count, 0) - 1, 0)
      where id = old.user_id;
    end if;

    return old;
  end if;

  return null;
end;
$$;


ALTER FUNCTION "public"."sync_profile_workout_count"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."app_config" (
    "key" "text" NOT NULL,
    "value" "text" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."app_config" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."battle_head_to_head" (
    "user_id" "uuid" NOT NULL,
    "opponent_id" "uuid" NOT NULL,
    "wins" integer DEFAULT 0 NOT NULL,
    "losses" integer DEFAULT 0 NOT NULL,
    "ties" integer DEFAULT 0 NOT NULL,
    "total" integer DEFAULT 0 NOT NULL,
    "last_battle_at" timestamp with time zone,
    "last_outcome" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "battle_head_to_head_check" CHECK ((("total" >= 0) AND ("total" = (("wins" + "losses") + "ties")))),
    CONSTRAINT "battle_head_to_head_check1" CHECK (("user_id" <> "opponent_id")),
    CONSTRAINT "battle_head_to_head_last_outcome_check" CHECK ((("last_outcome" = ANY (ARRAY['win'::"text", 'loss'::"text", 'tie'::"text"])) OR ("last_outcome" IS NULL))),
    CONSTRAINT "battle_head_to_head_losses_check" CHECK (("losses" >= 0)),
    CONSTRAINT "battle_head_to_head_ties_check" CHECK (("ties" >= 0)),
    CONSTRAINT "battle_head_to_head_wins_check" CHECK (("wins" >= 0))
);


ALTER TABLE "public"."battle_head_to_head" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."battle_invites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "challenger_id" "uuid" NOT NULL,
    "challenged_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "room_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "responded_at" timestamp with time zone,
    "battle_mode" "text" DEFAULT 'hybrid'::"text" NOT NULL,
    CONSTRAINT "battle_invites_battle_mode_valid" CHECK (("battle_mode" = ANY (ARRAY['strength'::"text", 'hybrid'::"text", 'cardio'::"text"]))),
    CONSTRAINT "battle_invites_not_self_check" CHECK (("challenger_id" <> "challenged_id"))
);


ALTER TABLE "public"."battle_invites" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."battle_results" (
    "room_id" "uuid" NOT NULL,
    "challenger_id" "uuid" NOT NULL,
    "challenged_id" "uuid" NOT NULL,
    "winner_id" "uuid",
    "status" "text" NOT NULL,
    "outcome" "text" NOT NULL,
    "challenger_points" integer,
    "challenged_points" integer,
    "score_total" integer DEFAULT 100 NOT NULL,
    "scoring_version" "text" DEFAULT 'weighted_v1'::"text" NOT NULL,
    "battle_mode" "text" DEFAULT 'hybrid'::"text" NOT NULL,
    "finalized_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "recap" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "battle_results_mode_check" CHECK (("battle_mode" = ANY (ARRAY['strength'::"text", 'hybrid'::"text", 'cardio'::"text"]))),
    CONSTRAINT "battle_results_outcome_check" CHECK (("outcome" = ANY (ARRAY['challenger_win'::"text", 'challenged_win'::"text", 'tie'::"text", 'void'::"text"]))),
    CONSTRAINT "battle_results_outcome_winner_check" CHECK (((("outcome" = 'challenger_win'::"text") AND ("winner_id" = "challenger_id")) OR (("outcome" = 'challenged_win'::"text") AND ("winner_id" = "challenged_id")) OR (("outcome" = ANY (ARRAY['tie'::"text", 'void'::"text"])) AND ("winner_id" IS NULL)))),
    CONSTRAINT "battle_results_participants_distinct" CHECK (("challenger_id" <> "challenged_id")),
    CONSTRAINT "battle_results_points_check" CHECK (((("challenger_points" IS NULL) OR (("challenger_points" >= 0) AND ("challenger_points" <= "score_total"))) AND (("challenged_points" IS NULL) OR (("challenged_points" >= 0) AND ("challenged_points" <= "score_total"))))),
    CONSTRAINT "battle_results_score_total_check" CHECK ((("score_total" >= 1) AND ("score_total" <= 1000))),
    CONSTRAINT "battle_results_status_check" CHECK (("status" = ANY (ARRAY['finished'::"text", 'cancelled'::"text"]))),
    CONSTRAINT "battle_results_winner_participant_check" CHECK ((("winner_id" IS NULL) OR ("winner_id" = "challenger_id") OR ("winner_id" = "challenged_id")))
);


ALTER TABLE "public"."battle_results" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."body_weight_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "weight" numeric NOT NULL,
    "unit" "text" DEFAULT 'kg'::"text" NOT NULL,
    "logged_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."body_weight_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bug_reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "message" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."bug_reports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."exercise_prs" (
    "user_id" "uuid" NOT NULL,
    "exercise_id" bigint NOT NULL,
    "best_1rm_kg" double precision NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."exercise_prs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."exercise_rank_states" (
    "user_id" "uuid" NOT NULL,
    "exercise_id" bigint NOT NULL,
    "current_score" double precision DEFAULT 0 NOT NULL,
    "peak_score" double precision DEFAULT 0 NOT NULL,
    "last_ranked_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."exercise_rank_states" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."exercises" (
    "id" integer NOT NULL,
    "name" "text" NOT NULL,
    "category" "text" NOT NULL,
    "equipment" "text" NOT NULL,
    "primary_muscles" "text"[] NOT NULL,
    "secondary_muscles" "text"[] NOT NULL,
    "default_rest_seconds" integer,
    "user_id" "uuid"
);


ALTER TABLE "public"."exercises" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."exercises_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."exercises_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."exercises_id_seq" OWNED BY "public"."exercises"."id";



CREATE TABLE IF NOT EXISTS "public"."foods" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "name" "text" NOT NULL,
    "brand" "text",
    "serving_size" numeric DEFAULT 100 NOT NULL,
    "serving_unit" "text" DEFAULT 'g'::"text" NOT NULL,
    "calories" numeric DEFAULT 0 NOT NULL,
    "protein" numeric DEFAULT 0,
    "carbs" numeric DEFAULT 0,
    "fat" numeric DEFAULT 0,
    "fiber" numeric DEFAULT 0,
    "sugar" numeric DEFAULT 0,
    "saturated_fat" numeric DEFAULT 0,
    "sodium" numeric DEFAULT 0,
    "potassium" numeric DEFAULT 0,
    "cholesterol" numeric DEFAULT 0,
    "vitamin_a" numeric DEFAULT 0,
    "vitamin_c" numeric DEFAULT 0,
    "calcium" numeric DEFAULT 0,
    "iron" numeric DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "vitamin_d" numeric DEFAULT 0,
    "magnesium" numeric DEFAULT 0,
    "zinc" numeric DEFAULT 0,
    "folate" numeric DEFAULT 0,
    "vitamin_b12" numeric DEFAULT 0,
    "vitamin_b6" numeric DEFAULT 0
);


ALTER TABLE "public"."foods" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."friendships" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "requester_id" "uuid" NOT NULL,
    "addressee_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "responded_at" timestamp with time zone,
    CONSTRAINT "friendships_not_self_check" CHECK (("requester_id" <> "addressee_id"))
);


ALTER TABLE "public"."friendships" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."nutrition_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "food_id" "uuid",
    "log_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "servings" numeric DEFAULT 1 NOT NULL,
    "food_name" "text" NOT NULL,
    "calories" numeric DEFAULT 0 NOT NULL,
    "protein" numeric DEFAULT 0,
    "carbs" numeric DEFAULT 0,
    "fat" numeric DEFAULT 0,
    "fiber" numeric DEFAULT 0,
    "sugar" numeric DEFAULT 0,
    "saturated_fat" numeric DEFAULT 0,
    "sodium" numeric DEFAULT 0,
    "potassium" numeric DEFAULT 0,
    "cholesterol" numeric DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "vitamin_d" numeric DEFAULT 0,
    "magnesium" numeric DEFAULT 0,
    "zinc" numeric DEFAULT 0,
    "folate" numeric DEFAULT 0,
    "vitamin_b12" numeric DEFAULT 0,
    "vitamin_b6" numeric DEFAULT 0,
    "calcium" numeric DEFAULT 0,
    "iron" numeric DEFAULT 0,
    "vitamin_a" numeric DEFAULT 0,
    "vitamin_c" numeric DEFAULT 0
);


ALTER TABLE "public"."nutrition_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "username" "text",
    "full_name" "text",
    "age" integer,
    "gender" "text",
    "bodyweight" numeric,
    "unit_preference" "text" DEFAULT 'kg'::"text",
    "avatar_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "default_rest_seconds" integer DEFAULT 90,
    "calories_goal" integer DEFAULT 2000,
    "protein_goal" integer DEFAULT 150,
    "carbs_goal" integer DEFAULT 200,
    "fat_goal" integer DEFAULT 65,
    "fiber_goal" integer DEFAULT 30,
    "sugar_goal" integer DEFAULT 50,
    "saturated_fat_goal" integer DEFAULT 20,
    "sodium_goal" integer DEFAULT 2300,
    "potassium_goal" integer DEFAULT 3500,
    "cholesterol_goal" integer DEFAULT 300,
    "calcium_goal" integer DEFAULT 1000,
    "iron_goal" integer DEFAULT 18,
    "vitamin_a_goal" integer DEFAULT 900,
    "vitamin_c_goal" integer DEFAULT 90,
    "vitamin_d_goal" integer DEFAULT 15,
    "magnesium_goal" integer DEFAULT 400,
    "zinc_goal" integer DEFAULT 11,
    "theme" "text",
    "training_days_per_week" integer DEFAULT 6 NOT NULL,
    "lifetime_volume_kg" double precision DEFAULT 0 NOT NULL,
    "calories_burned_goal" integer,
    "workout_count" integer DEFAULT 0 NOT NULL,
    "weight_goal_kg" real,
    "weight_trend_mode" "text",
    "weight_trend_rate_kg_per_week" real,
    "weight_trend_anchor_date" "date",
    "weight_trend_anchor_weight_kg" real,
    "streak_start_date" "date",
    "streak_last_workout_at" timestamp with time zone,
    CONSTRAINT "profiles_training_days_per_week_check" CHECK ((("training_days_per_week" >= 2) AND ("training_days_per_week" <= 7)))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."public_profiles" AS
 SELECT "id",
    "username",
    "full_name",
    "avatar_url",
    "created_at"
   FROM "public"."profiles";


ALTER VIEW "public"."public_profiles" OWNER TO "postgres";


COMMENT ON VIEW "public"."public_profiles" IS 'Public social identity fields only. Use this instead of direct profiles reads for non-owner profile display.';



CREATE TABLE IF NOT EXISTS "public"."rate_limit_events" (
    "id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "scope" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."rate_limit_events" OWNER TO "postgres";


ALTER TABLE "public"."rate_limit_events" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."rate_limit_events_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."user_exercise_preferences" (
    "user_id" "uuid" NOT NULL,
    "exercise_id" integer NOT NULL,
    "rest_seconds" integer
);


ALTER TABLE "public"."user_exercise_preferences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_routines" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "exercises" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_routines" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_training_plan_adaptations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "plan_id" "uuid" NOT NULL,
    "session_id" "uuid",
    "plan_day_id" "text",
    "plan_week" integer DEFAULT 1 NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "summary" "text" NOT NULL,
    "body" "text",
    "metrics" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "adjustments" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "resolved_at" timestamp with time zone,
    CONSTRAINT "user_training_plan_adaptations_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'applied'::"text", 'dismissed'::"text"])))
);


ALTER TABLE "public"."user_training_plan_adaptations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_training_plans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "goal" "text" NOT NULL,
    "experience" "text" NOT NULL,
    "days_per_week" integer NOT NULL,
    "session_minutes" integer NOT NULL,
    "duration_weeks" integer NOT NULL,
    "equipment" "text"[] DEFAULT ARRAY[]::"text"[] NOT NULL,
    "preferences" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "days" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_training_plans_days_check" CHECK ("public"."app_validate_training_plan_days"("days")),
    CONSTRAINT "user_training_plans_days_per_week_check" CHECK ((("days_per_week" >= 2) AND ("days_per_week" <= 7))),
    CONSTRAINT "user_training_plans_duration_weeks_check" CHECK ((("duration_weeks" >= 1) AND ("duration_weeks" <= 52))),
    CONSTRAINT "user_training_plans_equipment_check" CHECK ((("cardinality"("equipment") >= 1) AND ("equipment" <@ ARRAY['Bodyweight'::"text", 'Dumbbell'::"text", 'Barbell'::"text", 'Cable'::"text", 'Machine'::"text", 'Cardio Machines'::"text"]))),
    CONSTRAINT "user_training_plans_experience_check" CHECK (("experience" = ANY (ARRAY['beginner'::"text", 'intermediate'::"text", 'advanced'::"text"]))),
    CONSTRAINT "user_training_plans_goal_check" CHECK (("goal" = ANY (ARRAY['strength'::"text", 'hypertrophy'::"text", 'cardio'::"text", 'hybrid'::"text", 'general_fitness'::"text"]))),
    CONSTRAINT "user_training_plans_name_check" CHECK ((("char_length"("btrim"("name")) >= 1) AND ("char_length"("btrim"("name")) <= 60))),
    CONSTRAINT "user_training_plans_preferences_size_check" CHECK (("octet_length"(("preferences")::"text") <= 8192)),
    CONSTRAINT "user_training_plans_session_minutes_check" CHECK ((("session_minutes" >= 20) AND ("session_minutes" <= 180)))
);


ALTER TABLE "public"."user_training_plans" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workout_room_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "room_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "event_type" "text" NOT NULL,
    "payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."workout_room_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workout_rooms" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "invite_id" "uuid",
    "challenger_id" "uuid" NOT NULL,
    "challenged_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ended_at" timestamp with time zone,
    "finalized_at" timestamp with time zone,
    "challenger_seen_result_at" timestamp with time zone,
    "challenged_seen_result_at" timestamp with time zone,
    "battle_mode" "text" DEFAULT 'hybrid'::"text" NOT NULL,
    CONSTRAINT "workout_rooms_battle_mode_valid" CHECK (("battle_mode" = ANY (ARRAY['strength'::"text", 'hybrid'::"text", 'cardio'::"text"]))),
    CONSTRAINT "workout_rooms_not_self_check" CHECK (("challenger_id" <> "challenged_id")),
    CONSTRAINT "workout_rooms_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'finished'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."workout_rooms" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workout_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "started_at" timestamp with time zone DEFAULT "now"(),
    "finished_at" timestamp with time zone,
    "notes" "text",
    "exercise_notes" "jsonb" DEFAULT '{}'::"jsonb",
    "calories_burned" integer,
    "source_plan_id" "uuid",
    "source_plan_day_id" "text",
    "source_plan_week" integer
);


ALTER TABLE "public"."workout_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workout_sets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "session_id" "uuid" NOT NULL,
    "exercise_id" integer NOT NULL,
    "set_number" integer NOT NULL,
    "reps" integer NOT NULL,
    "weight" numeric NOT NULL,
    "unit" "text" DEFAULT 'kg'::"text",
    "estimated_1rm" numeric,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "duration_seconds" integer,
    "completed_at" timestamp with time zone,
    "rest_before_seconds" integer,
    "progression_event" "text",
    "is_warmup" boolean DEFAULT false,
    "set_type" "text" DEFAULT 'normal'::"text",
    "set_group_index" integer,
    "estimated_fresh_1rm" numeric,
    CONSTRAINT "workout_sets_estimated_fresh_1rm_check" CHECK ((("estimated_fresh_1rm" IS NULL) OR ("estimated_fresh_1rm" > (0)::numeric)))
);


ALTER TABLE "public"."workout_sets" OWNER TO "postgres";


ALTER TABLE ONLY "public"."exercises" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."exercises_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."app_config"
    ADD CONSTRAINT "app_config_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."battle_head_to_head"
    ADD CONSTRAINT "battle_head_to_head_pkey" PRIMARY KEY ("user_id", "opponent_id");



ALTER TABLE "public"."battle_invites"
    ADD CONSTRAINT "battle_invites_mode_security_check" CHECK ((("battle_mode" IS NULL) OR ("battle_mode" = ANY (ARRAY['strength'::"text", 'hybrid'::"text", 'cardio'::"text"])))) NOT VALID;



ALTER TABLE ONLY "public"."battle_invites"
    ADD CONSTRAINT "battle_invites_pkey" PRIMARY KEY ("id");



ALTER TABLE "public"."battle_invites"
    ADD CONSTRAINT "battle_invites_status_security_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'declined'::"text", 'cancelled'::"text", 'expired'::"text"]))) NOT VALID;



ALTER TABLE ONLY "public"."battle_results"
    ADD CONSTRAINT "battle_results_pkey" PRIMARY KEY ("room_id");



ALTER TABLE ONLY "public"."body_weight_logs"
    ADD CONSTRAINT "body_weight_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE "public"."body_weight_logs"
    ADD CONSTRAINT "body_weight_logs_unit_security_check" CHECK (("unit" = ANY (ARRAY['kg'::"text", 'lbs'::"text"]))) NOT VALID;



ALTER TABLE "public"."body_weight_logs"
    ADD CONSTRAINT "body_weight_logs_weight_input_check" CHECK (((("unit" = 'lbs'::"text") AND (("weight" >= 44.1) AND ("weight" <= 1322.8))) OR ((COALESCE("unit", 'kg'::"text") <> 'lbs'::"text") AND (("weight" >= (20)::numeric) AND ("weight" <= (600)::numeric))))) NOT VALID;



ALTER TABLE "public"."bug_reports"
    ADD CONSTRAINT "bug_reports_message_input_check" CHECK ((("char_length"("btrim"("message")) >= 10) AND ("char_length"("btrim"("message")) <= 2000))) NOT VALID;



ALTER TABLE ONLY "public"."bug_reports"
    ADD CONSTRAINT "bug_reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."exercise_prs"
    ADD CONSTRAINT "exercise_prs_pkey" PRIMARY KEY ("user_id", "exercise_id");



ALTER TABLE ONLY "public"."exercise_rank_states"
    ADD CONSTRAINT "exercise_rank_states_pkey" PRIMARY KEY ("user_id", "exercise_id");



ALTER TABLE "public"."exercises"
    ADD CONSTRAINT "exercises_category_security_check" CHECK ((("category" IS NULL) OR (("char_length"("category") >= 1) AND ("char_length"("category") <= 80)))) NOT VALID;



ALTER TABLE "public"."exercises"
    ADD CONSTRAINT "exercises_default_rest_input_check" CHECK ((("default_rest_seconds" IS NULL) OR (("default_rest_seconds" >= 0) AND ("default_rest_seconds" <= 3600)))) NOT VALID;



ALTER TABLE "public"."exercises"
    ADD CONSTRAINT "exercises_equipment_security_check" CHECK ((("equipment" IS NULL) OR (("char_length"("equipment") >= 1) AND ("char_length"("equipment") <= 80)))) NOT VALID;



ALTER TABLE ONLY "public"."exercises"
    ADD CONSTRAINT "exercises_pkey" PRIMARY KEY ("id");



ALTER TABLE "public"."exercises"
    ADD CONSTRAINT "exercises_text_input_check" CHECK ((("char_length"("btrim"("name")) >= 2) AND ("char_length"("btrim"("name")) <= 80))) NOT VALID;



ALTER TABLE "public"."foods"
    ADD CONSTRAINT "foods_nutrition_input_check" CHECK ((("serving_size" IS NOT NULL) AND ("serving_size" > (0)::numeric) AND ("serving_size" <= (1000000)::numeric) AND ("calories" IS NOT NULL) AND (("calories" >= (0)::numeric) AND ("calories" <= (1000000)::numeric)) AND (("protein" >= (0)::numeric) AND ("protein" <= (250000)::numeric)) AND (("carbs" >= (0)::numeric) AND ("carbs" <= (250000)::numeric)) AND (("fat" >= (0)::numeric) AND ("fat" <= (250000)::numeric)) AND (("fiber" >= (0)::numeric) AND ("fiber" <= (250000)::numeric)) AND (("sugar" >= (0)::numeric) AND ("sugar" <= (250000)::numeric)) AND (("saturated_fat" >= (0)::numeric) AND ("saturated_fat" <= (250000)::numeric)) AND (("sodium" >= (0)::numeric) AND ("sodium" <= (10000000)::numeric)) AND (("potassium" >= (0)::numeric) AND ("potassium" <= (10000000)::numeric)) AND (("cholesterol" >= (0)::numeric) AND ("cholesterol" <= (1000000)::numeric)) AND (("vitamin_a" >= (0)::numeric) AND ("vitamin_a" <= (10000000)::numeric)) AND (("vitamin_c" >= (0)::numeric) AND ("vitamin_c" <= (1000000)::numeric)) AND (("calcium" >= (0)::numeric) AND ("calcium" <= (10000000)::numeric)) AND (("iron" >= (0)::numeric) AND ("iron" <= (1000000)::numeric)))) NOT VALID;



ALTER TABLE ONLY "public"."foods"
    ADD CONSTRAINT "foods_pkey" PRIMARY KEY ("id");



ALTER TABLE "public"."foods"
    ADD CONSTRAINT "foods_text_input_check" CHECK ((("name" IS NOT NULL) AND (("char_length"("btrim"("name")) >= 1) AND ("char_length"("btrim"("name")) <= 120)) AND (("brand" IS NULL) OR ("char_length"("brand") <= 80)) AND ("serving_unit" IS NOT NULL) AND (("char_length"("btrim"("serving_unit")) >= 1) AND ("char_length"("btrim"("serving_unit")) <= 20)))) NOT VALID;



ALTER TABLE ONLY "public"."friendships"
    ADD CONSTRAINT "friendships_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."friendships"
    ADD CONSTRAINT "friendships_requester_addressee_key" UNIQUE ("requester_id", "addressee_id");



ALTER TABLE "public"."friendships"
    ADD CONSTRAINT "friendships_status_security_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'declined'::"text", 'blocked'::"text"]))) NOT VALID;



ALTER TABLE "public"."nutrition_logs"
    ADD CONSTRAINT "nutrition_logs_nutrition_input_check" CHECK ((("servings" IS NOT NULL) AND ("servings" > (0)::numeric) AND ("servings" <= (1000000)::numeric) AND (("calories" >= (0)::numeric) AND ("calories" <= (1000000)::numeric)) AND (("protein" >= (0)::numeric) AND ("protein" <= (250000)::numeric)) AND (("carbs" >= (0)::numeric) AND ("carbs" <= (250000)::numeric)) AND (("fat" >= (0)::numeric) AND ("fat" <= (250000)::numeric)) AND (("fiber" >= (0)::numeric) AND ("fiber" <= (250000)::numeric)) AND (("sugar" >= (0)::numeric) AND ("sugar" <= (250000)::numeric)) AND (("saturated_fat" >= (0)::numeric) AND ("saturated_fat" <= (250000)::numeric)) AND (("sodium" >= (0)::numeric) AND ("sodium" <= (10000000)::numeric)) AND (("potassium" >= (0)::numeric) AND ("potassium" <= (10000000)::numeric)) AND (("cholesterol" >= (0)::numeric) AND ("cholesterol" <= (1000000)::numeric)) AND (("vitamin_a" >= (0)::numeric) AND ("vitamin_a" <= (10000000)::numeric)) AND (("vitamin_c" >= (0)::numeric) AND ("vitamin_c" <= (1000000)::numeric)) AND (("calcium" >= (0)::numeric) AND ("calcium" <= (10000000)::numeric)) AND (("iron" >= (0)::numeric) AND ("iron" <= (1000000)::numeric)))) NOT VALID;



ALTER TABLE ONLY "public"."nutrition_logs"
    ADD CONSTRAINT "nutrition_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE "public"."nutrition_logs"
    ADD CONSTRAINT "nutrition_logs_text_input_check" CHECK ((("food_name" IS NOT NULL) AND (("char_length"("btrim"("food_name")) >= 1) AND ("char_length"("btrim"("food_name")) <= 120)))) NOT VALID;



ALTER TABLE "public"."profiles"
    ADD CONSTRAINT "profiles_age_input_check" CHECK ((("age" IS NULL) OR (("age" >= 13) AND ("age" <= 120)))) NOT VALID;



ALTER TABLE "public"."profiles"
    ADD CONSTRAINT "profiles_bodyweight_input_check" CHECK ((("bodyweight" IS NULL) OR ((("unit_preference" = 'lbs'::"text") AND (("bodyweight" >= 44.1) AND ("bodyweight" <= 1322.8))) OR ((COALESCE("unit_preference", 'kg'::"text") <> 'lbs'::"text") AND (("bodyweight" >= (20)::numeric) AND ("bodyweight" <= (600)::numeric)))))) NOT VALID;



ALTER TABLE "public"."profiles"
    ADD CONSTRAINT "profiles_calories_burned_goal_input_check" CHECK ((("calories_burned_goal" IS NULL) OR (("calories_burned_goal" >= 1) AND ("calories_burned_goal" <= 100000)))) NOT VALID;



ALTER TABLE "public"."profiles"
    ADD CONSTRAINT "profiles_default_rest_input_check" CHECK ((("default_rest_seconds" IS NULL) OR (("default_rest_seconds" >= 0) AND ("default_rest_seconds" <= 3600)))) NOT VALID;



ALTER TABLE "public"."profiles"
    ADD CONSTRAINT "profiles_full_name_input_check" CHECK ((("full_name" IS NULL) OR (("char_length"("btrim"("full_name")) >= 1) AND ("char_length"("btrim"("full_name")) <= 80)))) NOT VALID;



ALTER TABLE "public"."profiles"
    ADD CONSTRAINT "profiles_nutrition_goal_input_check" CHECK (((("calories_goal" >= 1) AND ("calories_goal" <= 1000000)) AND (("protein_goal" >= 1) AND ("protein_goal" <= 250000)) AND (("carbs_goal" >= 1) AND ("carbs_goal" <= 250000)) AND (("fat_goal" >= 1) AND ("fat_goal" <= 250000)) AND (("fiber_goal" >= 0) AND ("fiber_goal" <= 250000)) AND (("sugar_goal" >= 0) AND ("sugar_goal" <= 250000)) AND (("saturated_fat_goal" >= 0) AND ("saturated_fat_goal" <= 250000)) AND (("sodium_goal" >= 0) AND ("sodium_goal" <= 10000000)) AND (("potassium_goal" >= 0) AND ("potassium_goal" <= 10000000)) AND (("cholesterol_goal" >= 0) AND ("cholesterol_goal" <= 1000000)) AND (("calcium_goal" >= 0) AND ("calcium_goal" <= 10000000)) AND (("iron_goal" >= 0) AND ("iron_goal" <= 1000000)) AND (("magnesium_goal" >= 0) AND ("magnesium_goal" <= 10000000)) AND (("zinc_goal" >= 0) AND ("zinc_goal" <= 1000000)) AND (("vitamin_a_goal" >= 0) AND ("vitamin_a_goal" <= 10000000)) AND (("vitamin_c_goal" >= 0) AND ("vitamin_c_goal" <= 1000000)) AND (("vitamin_d_goal" >= 0) AND ("vitamin_d_goal" <= 1000000)))) NOT VALID;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE "public"."profiles"
    ADD CONSTRAINT "profiles_unit_preference_security_check" CHECK ((("unit_preference" IS NULL) OR ("unit_preference" = ANY (ARRAY['kg'::"text", 'lbs'::"text"])))) NOT VALID;



ALTER TABLE "public"."profiles"
    ADD CONSTRAINT "profiles_username_input_check" CHECK ((("username" IS NULL) OR ((("char_length"("username") >= 3) AND ("char_length"("username") <= 24)) AND ("username" ~ '^[a-z0-9_]+$'::"text")))) NOT VALID;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_username_key" UNIQUE ("username");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_username_unique" UNIQUE ("username");



ALTER TABLE "public"."profiles"
    ADD CONSTRAINT "profiles_weight_goal_input_check" CHECK ((("weight_goal_kg" IS NULL) OR (("weight_goal_kg" >= (20)::double precision) AND ("weight_goal_kg" <= (600)::double precision)))) NOT VALID;



ALTER TABLE ONLY "public"."rate_limit_events"
    ADD CONSTRAINT "rate_limit_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_exercise_preferences"
    ADD CONSTRAINT "user_exercise_preferences_pkey" PRIMARY KEY ("user_id", "exercise_id");



ALTER TABLE "public"."user_routines"
    ADD CONSTRAINT "user_routines_exercises_security_check" CHECK ("public"."app_validate_routine_exercises"("exercises")) NOT VALID;



ALTER TABLE ONLY "public"."user_routines"
    ADD CONSTRAINT "user_routines_pkey" PRIMARY KEY ("id");



ALTER TABLE "public"."user_routines"
    ADD CONSTRAINT "user_routines_text_input_check" CHECK (((("char_length"("btrim"("name")) >= 1) AND ("char_length"("btrim"("name")) <= 60)) AND (("description" IS NULL) OR ("char_length"("description") <= 240)))) NOT VALID;



ALTER TABLE ONLY "public"."user_training_plan_adaptations"
    ADD CONSTRAINT "user_training_plan_adaptations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_training_plans"
    ADD CONSTRAINT "user_training_plans_pkey" PRIMARY KEY ("id");



ALTER TABLE "public"."workout_room_events"
    ADD CONSTRAINT "workout_room_events_payload_security_check" CHECK ("public"."app_validate_workout_room_event_payload"("event_type", "payload")) NOT VALID;



ALTER TABLE ONLY "public"."workout_room_events"
    ADD CONSTRAINT "workout_room_events_pkey" PRIMARY KEY ("id");



ALTER TABLE "public"."workout_room_events"
    ADD CONSTRAINT "workout_room_events_type_security_check" CHECK (("event_type" = ANY (ARRAY['workout_started'::"text", 'exercise_added'::"text", 'set_completed'::"text", 'set_removed'::"text", 'workout_finished'::"text", 'workout_cancelled'::"text", 'workout_stale'::"text"]))) NOT VALID;



ALTER TABLE "public"."workout_rooms"
    ADD CONSTRAINT "workout_rooms_mode_security_check" CHECK ((("battle_mode" IS NULL) OR ("battle_mode" = ANY (ARRAY['strength'::"text", 'hybrid'::"text", 'cardio'::"text"])))) NOT VALID;



ALTER TABLE ONLY "public"."workout_rooms"
    ADD CONSTRAINT "workout_rooms_pkey" PRIMARY KEY ("id");



ALTER TABLE "public"."workout_rooms"
    ADD CONSTRAINT "workout_rooms_status_security_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'finished'::"text", 'cancelled'::"text"]))) NOT VALID;



ALTER TABLE "public"."workout_sessions"
    ADD CONSTRAINT "workout_sessions_exercise_notes_security_check" CHECK ("public"."app_validate_exercise_notes"("exercise_notes")) NOT VALID;



ALTER TABLE ONLY "public"."workout_sessions"
    ADD CONSTRAINT "workout_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE "public"."workout_sets"
    ADD CONSTRAINT "workout_sets_duration_input_check" CHECK ((("duration_seconds" IS NULL) OR (("duration_seconds" >= 1) AND ("duration_seconds" <= 86400)))) NOT VALID;



ALTER TABLE ONLY "public"."workout_sets"
    ADD CONSTRAINT "workout_sets_pkey" PRIMARY KEY ("id");



ALTER TABLE "public"."workout_sets"
    ADD CONSTRAINT "workout_sets_reps_input_check" CHECK ((("reps" IS NULL) OR (("reps" >= 1) AND ("reps" <= 9999)))) NOT VALID;



ALTER TABLE "public"."workout_sets"
    ADD CONSTRAINT "workout_sets_rest_before_seconds_security_check" CHECK ((("rest_before_seconds" IS NULL) OR (("rest_before_seconds" >= 0) AND ("rest_before_seconds" <= 3600)))) NOT VALID;



ALTER TABLE "public"."workout_sets"
    ADD CONSTRAINT "workout_sets_set_type_check" CHECK (("set_type" = ANY (ARRAY['normal'::"text", 'warmup'::"text", 'dropset'::"text", 'superset'::"text"]))) NOT VALID;



ALTER TABLE "public"."workout_sets"
    ADD CONSTRAINT "workout_sets_unit_security_check" CHECK ((("unit" IS NULL) OR ("unit" = ANY (ARRAY['kg'::"text", 'lbs'::"text"])))) NOT VALID;



ALTER TABLE "public"."workout_sets"
    ADD CONSTRAINT "workout_sets_weight_input_check" CHECK ((("weight" IS NULL) OR (("weight" >= ('-10000'::integer)::numeric) AND ("weight" <= (10000)::numeric)))) NOT VALID;



CREATE INDEX "battle_head_to_head_user_idx" ON "public"."battle_head_to_head" USING "btree" ("user_id");



CREATE INDEX "battle_head_to_head_user_last_battle_idx" ON "public"."battle_head_to_head" USING "btree" ("user_id", "last_battle_at" DESC NULLS LAST);



CREATE INDEX "battle_invites_challenged_idx" ON "public"."battle_invites" USING "btree" ("challenged_id", "status", "created_at" DESC);



CREATE INDEX "battle_invites_challenger_idx" ON "public"."battle_invites" USING "btree" ("challenger_id", "status", "created_at" DESC);



CREATE UNIQUE INDEX "battle_invites_one_pending_pair_idx" ON "public"."battle_invites" USING "btree" (LEAST("challenger_id", "challenged_id"), GREATEST("challenger_id", "challenged_id")) WHERE ("status" = 'pending'::"text");



CREATE UNIQUE INDEX "battle_invites_pending_pair_idx" ON "public"."battle_invites" USING "btree" (LEAST("challenger_id", "challenged_id"), GREATEST("challenger_id", "challenged_id")) WHERE ("status" = 'pending'::"text");



CREATE INDEX "battle_results_challenged_pair_idx" ON "public"."battle_results" USING "btree" ("challenged_id", "challenger_id", "finalized_at" DESC);



CREATE INDEX "battle_results_challenger_pair_idx" ON "public"."battle_results" USING "btree" ("challenger_id", "challenged_id", "finalized_at" DESC);



CREATE INDEX "body_weight_logs_user_id_logged_at_idx" ON "public"."body_weight_logs" USING "btree" ("user_id", "logged_at");



CREATE INDEX "exercise_rank_states_user_idx" ON "public"."exercise_rank_states" USING "btree" ("user_id");



CREATE INDEX "exercise_rank_states_user_updated_idx" ON "public"."exercise_rank_states" USING "btree" ("user_id", "updated_at" DESC);



CREATE UNIQUE INDEX "exercises_global_name_key" ON "public"."exercises" USING "btree" ("lower"("name")) WHERE ("user_id" IS NULL);



CREATE UNIQUE INDEX "exercises_user_name_key" ON "public"."exercises" USING "btree" ("user_id", "lower"("name"));



CREATE INDEX "friendships_addressee_idx" ON "public"."friendships" USING "btree" ("addressee_id", "status", "created_at" DESC);



CREATE UNIQUE INDEX "friendships_one_pending_pair_idx" ON "public"."friendships" USING "btree" (LEAST("requester_id", "addressee_id"), GREATEST("requester_id", "addressee_id")) WHERE ("status" = 'pending'::"text");



CREATE UNIQUE INDEX "friendships_pair_unique_idx" ON "public"."friendships" USING "btree" (LEAST("requester_id", "addressee_id"), GREATEST("requester_id", "addressee_id"));



CREATE INDEX "friendships_requester_idx" ON "public"."friendships" USING "btree" ("requester_id", "status", "created_at" DESC);



CREATE INDEX "idx_body_weight_logs_user_logged" ON "public"."body_weight_logs" USING "btree" ("user_id", "logged_at");



CREATE INDEX "idx_nutrition_logs_user_date" ON "public"."nutrition_logs" USING "btree" ("user_id", "log_date");



CREATE INDEX "idx_workout_sessions_user_finished" ON "public"."workout_sessions" USING "btree" ("user_id", "finished_at");



CREATE INDEX "idx_workout_sets_user_exercise" ON "public"."workout_sets" USING "btree" ("user_id", "exercise_id");



CREATE INDEX "idx_workout_sets_user_session" ON "public"."workout_sets" USING "btree" ("user_id", "session_id");



CREATE INDEX "nutrition_logs_user_id_created_at_idx" ON "public"."nutrition_logs" USING "btree" ("user_id", "created_at");



CREATE INDEX "nutrition_logs_user_id_log_date_idx" ON "public"."nutrition_logs" USING "btree" ("user_id", "log_date");



CREATE INDEX "rate_limit_events_lookup_idx" ON "public"."rate_limit_events" USING "btree" ("user_id", "action", "scope", "created_at" DESC);



CREATE INDEX "user_routines_user_id_created_at_idx" ON "public"."user_routines" USING "btree" ("user_id", "created_at");



CREATE INDEX "user_training_plan_adaptations_user_status_idx" ON "public"."user_training_plan_adaptations" USING "btree" ("user_id", "status", "created_at" DESC);



CREATE INDEX "user_training_plans_user_created_idx" ON "public"."user_training_plans" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "workout_room_events_room_idx" ON "public"."workout_room_events" USING "btree" ("room_id", "created_at" DESC);



CREATE INDEX "workout_rooms_challenged_idx" ON "public"."workout_rooms" USING "btree" ("challenged_id", "status", "created_at" DESC);



CREATE INDEX "workout_rooms_challenger_idx" ON "public"."workout_rooms" USING "btree" ("challenger_id", "status", "created_at" DESC);



CREATE INDEX "workout_sessions_source_plan_idx" ON "public"."workout_sessions" USING "btree" ("user_id", "source_plan_id", "source_plan_day_id");



CREATE INDEX "workout_sessions_user_id_started_at_idx" ON "public"."workout_sessions" USING "btree" ("user_id", "started_at");



CREATE INDEX "workout_sets_recent_progressive_overload_idx" ON "public"."workout_sets" USING "btree" ("user_id", "exercise_id", "session_id", "created_at" DESC);



CREATE INDEX "workout_sets_user_id_created_at_idx" ON "public"."workout_sets" USING "btree" ("user_id", "created_at");



CREATE INDEX "workout_sets_user_id_exercise_id_idx" ON "public"."workout_sets" USING "btree" ("user_id", "exercise_id");



CREATE OR REPLACE TRIGGER "battle_invites_rate_limit_pair" BEFORE INSERT ON "public"."battle_invites" FOR EACH ROW EXECUTE FUNCTION "public"."app_enforce_write_rate_limit"('battle_invite_to_user', '10', '86400', 'challenged_id');



CREATE OR REPLACE TRIGGER "battle_invites_rate_limit_user" BEFORE INSERT ON "public"."battle_invites" FOR EACH ROW EXECUTE FUNCTION "public"."app_enforce_write_rate_limit"('battle_invite', '50', '86400');



CREATE OR REPLACE TRIGGER "bug_reports_rate_limit_user" BEFORE INSERT ON "public"."bug_reports" FOR EACH ROW EXECUTE FUNCTION "public"."app_enforce_write_rate_limit"('bug_report', '10', '86400');



CREATE OR REPLACE TRIGGER "exercises_rate_limit_user" BEFORE INSERT ON "public"."exercises" FOR EACH ROW EXECUTE FUNCTION "public"."app_enforce_write_rate_limit"('custom_exercise', '100', '86400');



CREATE OR REPLACE TRIGGER "foods_rate_limit_user" BEFORE INSERT ON "public"."foods" FOR EACH ROW EXECUTE FUNCTION "public"."app_enforce_write_rate_limit"('custom_food', '300', '86400');



CREATE OR REPLACE TRIGGER "friendships_rate_limit_pair" BEFORE INSERT ON "public"."friendships" FOR EACH ROW EXECUTE FUNCTION "public"."app_enforce_write_rate_limit"('friend_request_to_user', '5', '86400', 'addressee_id');



CREATE OR REPLACE TRIGGER "friendships_rate_limit_user" BEFORE INSERT ON "public"."friendships" FOR EACH ROW EXECUTE FUNCTION "public"."app_enforce_write_rate_limit"('friend_request', '30', '86400');



CREATE OR REPLACE TRIGGER "trg_battle_head_to_head_updated_at" BEFORE UPDATE ON "public"."battle_head_to_head" FOR EACH ROW EXECUTE FUNCTION "public"."set_battle_head_to_head_updated_at"();



CREATE OR REPLACE TRIGGER "trg_battle_results_updated_at" BEFORE UPDATE ON "public"."battle_results" FOR EACH ROW EXECUTE FUNCTION "public"."set_battle_head_to_head_updated_at"();



CREATE OR REPLACE TRIGGER "trg_exercise_rank_states_updated_at" BEFORE UPDATE ON "public"."exercise_rank_states" FOR EACH ROW EXECUTE FUNCTION "public"."set_exercise_rank_states_updated_at"();



CREATE OR REPLACE TRIGGER "workout_room_events_rate_limit_room" BEFORE INSERT ON "public"."workout_room_events" FOR EACH ROW EXECUTE FUNCTION "public"."app_enforce_write_rate_limit"('workout_room_event_room', '300', '60', 'room_id');



CREATE OR REPLACE TRIGGER "workout_room_events_rate_limit_user" BEFORE INSERT ON "public"."workout_room_events" FOR EACH ROW EXECUTE FUNCTION "public"."app_enforce_write_rate_limit"('workout_room_event', '3000', '3600');



CREATE OR REPLACE TRIGGER "workout_sessions_sync_profile_workout_count" AFTER INSERT OR DELETE OR UPDATE OF "finished_at", "user_id" ON "public"."workout_sessions" FOR EACH ROW EXECUTE FUNCTION "public"."sync_profile_workout_count"();



ALTER TABLE ONLY "public"."battle_head_to_head"
    ADD CONSTRAINT "battle_head_to_head_opponent_id_fkey" FOREIGN KEY ("opponent_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."battle_head_to_head"
    ADD CONSTRAINT "battle_head_to_head_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."battle_invites"
    ADD CONSTRAINT "battle_invites_challenged_id_fkey" FOREIGN KEY ("challenged_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."battle_invites"
    ADD CONSTRAINT "battle_invites_challenger_id_fkey" FOREIGN KEY ("challenger_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."battle_invites"
    ADD CONSTRAINT "battle_invites_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "public"."workout_rooms"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."battle_results"
    ADD CONSTRAINT "battle_results_challenged_id_fkey" FOREIGN KEY ("challenged_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."battle_results"
    ADD CONSTRAINT "battle_results_challenger_id_fkey" FOREIGN KEY ("challenger_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."battle_results"
    ADD CONSTRAINT "battle_results_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "public"."workout_rooms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."battle_results"
    ADD CONSTRAINT "battle_results_winner_id_fkey" FOREIGN KEY ("winner_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."body_weight_logs"
    ADD CONSTRAINT "body_weight_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bug_reports"
    ADD CONSTRAINT "bug_reports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."exercise_prs"
    ADD CONSTRAINT "exercise_prs_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."exercise_prs"
    ADD CONSTRAINT "exercise_prs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."exercise_rank_states"
    ADD CONSTRAINT "exercise_rank_states_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."exercise_rank_states"
    ADD CONSTRAINT "exercise_rank_states_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."exercises"
    ADD CONSTRAINT "exercises_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."foods"
    ADD CONSTRAINT "foods_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."friendships"
    ADD CONSTRAINT "friendships_addressee_id_fkey" FOREIGN KEY ("addressee_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."friendships"
    ADD CONSTRAINT "friendships_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."nutrition_logs"
    ADD CONSTRAINT "nutrition_logs_food_id_fkey" FOREIGN KEY ("food_id") REFERENCES "public"."foods"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."nutrition_logs"
    ADD CONSTRAINT "nutrition_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_exercise_preferences"
    ADD CONSTRAINT "user_exercise_preferences_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_exercise_preferences"
    ADD CONSTRAINT "user_exercise_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_routines"
    ADD CONSTRAINT "user_routines_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_training_plan_adaptations"
    ADD CONSTRAINT "user_training_plan_adaptations_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."user_training_plans"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_training_plan_adaptations"
    ADD CONSTRAINT "user_training_plan_adaptations_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."workout_sessions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_training_plan_adaptations"
    ADD CONSTRAINT "user_training_plan_adaptations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_training_plans"
    ADD CONSTRAINT "user_training_plans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."workout_room_events"
    ADD CONSTRAINT "workout_room_events_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "public"."workout_rooms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workout_room_events"
    ADD CONSTRAINT "workout_room_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workout_rooms"
    ADD CONSTRAINT "workout_rooms_challenged_id_fkey" FOREIGN KEY ("challenged_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workout_rooms"
    ADD CONSTRAINT "workout_rooms_challenger_id_fkey" FOREIGN KEY ("challenger_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workout_rooms"
    ADD CONSTRAINT "workout_rooms_invite_id_fkey" FOREIGN KEY ("invite_id") REFERENCES "public"."battle_invites"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."workout_sessions"
    ADD CONSTRAINT "workout_sessions_source_plan_id_fkey" FOREIGN KEY ("source_plan_id") REFERENCES "public"."user_training_plans"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."workout_sessions"
    ADD CONSTRAINT "workout_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workout_sets"
    ADD CONSTRAINT "workout_sets_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workout_sets"
    ADD CONSTRAINT "workout_sets_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."workout_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workout_sets"
    ADD CONSTRAINT "workout_sets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Addressees can accept requests" ON "public"."friendships" FOR UPDATE TO "authenticated" USING ((("auth"."uid"() = "addressee_id") AND ("status" = 'pending'::"text"))) WITH CHECK ((("auth"."uid"() = "addressee_id") AND ("status" = 'accepted'::"text")));



CREATE POLICY "Battle participants can create workout rooms" ON "public"."workout_rooms" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"() = "challenger_id") OR ("auth"."uid"() = "challenged_id")));



CREATE POLICY "Public read min_required_version" ON "public"."app_config" FOR SELECT USING (("key" = 'min_required_version'::"text"));



CREATE POLICY "Users can create battle invites" ON "public"."battle_invites" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"() = "challenger_id") AND ("challenger_id" <> "challenged_id") AND ("status" = 'pending'::"text")));



CREATE POLICY "Users can delete own battle summaries" ON "public"."battle_head_to_head" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own training plan adaptations" ON "public"."user_training_plan_adaptations" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own training plans" ON "public"."user_training_plans" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own training plan adaptations" ON "public"."user_training_plan_adaptations" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own training plans" ON "public"."user_training_plans" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can read own training plan adaptations" ON "public"."user_training_plan_adaptations" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can read own training plans" ON "public"."user_training_plans" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can respond to battle invites" ON "public"."battle_invites" FOR UPDATE TO "authenticated" USING (((("auth"."uid"() = "challenged_id") AND ("status" = 'pending'::"text")) OR (("auth"."uid"() = "challenger_id") AND ("status" = 'pending'::"text")))) WITH CHECK (((("auth"."uid"() = "challenged_id") AND ("status" = ANY (ARRAY['accepted'::"text", 'declined'::"text"]))) OR (("auth"."uid"() = "challenger_id") AND ("status" = 'cancelled'::"text"))));



CREATE POLICY "Users can send friend requests" ON "public"."friendships" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"() = "requester_id") AND ("requester_id" <> "addressee_id") AND ("status" = 'pending'::"text")));



CREATE POLICY "Users can update own training plan adaptations" ON "public"."user_training_plan_adaptations" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own training plans" ON "public"."user_training_plans" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."app_config" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."battle_head_to_head" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "battle_head_to_head_owner_all" ON "public"."battle_head_to_head" TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."battle_invites" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "battle_invites_challenger_insert" ON "public"."battle_invites" FOR INSERT TO "authenticated" WITH CHECK ((("challenger_id" = "auth"."uid"()) AND ("challenged_id" <> "auth"."uid"())));



CREATE POLICY "battle_invites_insert" ON "public"."battle_invites" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "challenger_id"));



CREATE POLICY "battle_invites_participant_select" ON "public"."battle_invites" FOR SELECT TO "authenticated" USING ((("challenger_id" = "auth"."uid"()) OR ("challenged_id" = "auth"."uid"())));



CREATE POLICY "battle_invites_participant_update" ON "public"."battle_invites" FOR UPDATE TO "authenticated" USING ((("challenger_id" = "auth"."uid"()) OR ("challenged_id" = "auth"."uid"()))) WITH CHECK ((("challenger_id" = "auth"."uid"()) OR ("challenged_id" = "auth"."uid"())));



CREATE POLICY "battle_invites_select" ON "public"."battle_invites" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "challenger_id") OR ("auth"."uid"() = "challenged_id")));



CREATE POLICY "battle_invites_update" ON "public"."battle_invites" FOR UPDATE TO "authenticated" USING ((("auth"."uid"() = "challenger_id") OR ("auth"."uid"() = "challenged_id")));



ALTER TABLE "public"."battle_results" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "battle_results_participant_select" ON "public"."battle_results" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "challenger_id") OR ("auth"."uid"() = "challenged_id")));



ALTER TABLE "public"."body_weight_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "body_weight_logs_accepted_friend_select" ON "public"."body_weight_logs" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."friendships" "f"
  WHERE (("f"."status" = 'accepted'::"text") AND ((("f"."requester_id" = "auth"."uid"()) AND ("f"."addressee_id" = "body_weight_logs"."user_id")) OR (("f"."addressee_id" = "auth"."uid"()) AND ("f"."requester_id" = "body_weight_logs"."user_id")))))));



CREATE POLICY "body_weight_logs_owner_all" ON "public"."body_weight_logs" TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "body_weight_logs_select_own" ON "public"."body_weight_logs" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."bug_reports" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "bug_reports_owner_insert" ON "public"."bug_reports" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "bug_reports_owner_select" ON "public"."bug_reports" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."exercise_prs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "exercise_prs_owner_delete" ON "public"."exercise_prs" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "exercise_prs_owner_insert" ON "public"."exercise_prs" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "exercise_prs_owner_or_friend_select" ON "public"."exercise_prs" FOR SELECT TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."friendships" "f"
  WHERE (("f"."status" = 'accepted'::"text") AND ((("f"."requester_id" = "auth"."uid"()) AND ("f"."addressee_id" = "exercise_prs"."user_id")) OR (("f"."addressee_id" = "auth"."uid"()) AND ("f"."requester_id" = "exercise_prs"."user_id"))))))));



CREATE POLICY "exercise_prs_owner_update" ON "public"."exercise_prs" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "exercise_prs_select_own" ON "public"."exercise_prs" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."exercise_rank_states" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "exercise_rank_states_owner_delete" ON "public"."exercise_rank_states" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "exercise_rank_states_owner_insert" ON "public"."exercise_rank_states" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "exercise_rank_states_owner_or_friend_select" ON "public"."exercise_rank_states" FOR SELECT TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."friendships" "f"
  WHERE (("f"."status" = 'accepted'::"text") AND ((("f"."requester_id" = "auth"."uid"()) AND ("f"."addressee_id" = "exercise_rank_states"."user_id")) OR (("f"."addressee_id" = "auth"."uid"()) AND ("f"."requester_id" = "exercise_rank_states"."user_id"))))))));



CREATE POLICY "exercise_rank_states_owner_update" ON "public"."exercise_rank_states" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "exercise_rank_states_select_own" ON "public"."exercise_rank_states" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."exercises" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "exercises_delete" ON "public"."exercises" FOR DELETE TO "authenticated" USING ((("auth"."uid"() = "user_id") AND ("user_id" IS NOT NULL)));



CREATE POLICY "exercises_insert" ON "public"."exercises" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "exercises_owner_delete" ON "public"."exercises" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "exercises_owner_insert" ON "public"."exercises" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "exercises_owner_update" ON "public"."exercises" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "exercises_public_or_owner_select" ON "public"."exercises" FOR SELECT TO "authenticated" USING ((("user_id" IS NULL) OR ("user_id" = "auth"."uid"())));



CREATE POLICY "exercises_select_global_or_own" ON "public"."exercises" FOR SELECT TO "authenticated" USING ((("user_id" IS NULL) OR ("auth"."uid"() = "user_id")));



CREATE POLICY "exercises_update" ON "public"."exercises" FOR UPDATE TO "authenticated" USING ((("auth"."uid"() = "user_id") AND ("user_id" IS NOT NULL)));



ALTER TABLE "public"."foods" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "foods_delete" ON "public"."foods" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "foods_insert" ON "public"."foods" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "foods_owner_delete" ON "public"."foods" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "foods_owner_insert" ON "public"."foods" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "foods_owner_update" ON "public"."foods" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "foods_public_or_owner_select" ON "public"."foods" FOR SELECT TO "authenticated" USING ((("user_id" IS NULL) OR ("user_id" = "auth"."uid"())));



CREATE POLICY "foods_select_global_or_own" ON "public"."foods" FOR SELECT TO "authenticated" USING ((("user_id" IS NULL) OR ("auth"."uid"() = "user_id")));



CREATE POLICY "foods_update" ON "public"."foods" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."friendships" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "friendships_delete" ON "public"."friendships" FOR DELETE TO "authenticated" USING ((("auth"."uid"() = "requester_id") OR ("auth"."uid"() = "addressee_id")));



CREATE POLICY "friendships_insert" ON "public"."friendships" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "requester_id"));



CREATE POLICY "friendships_participant_delete" ON "public"."friendships" FOR DELETE TO "authenticated" USING ((("requester_id" = "auth"."uid"()) OR ("addressee_id" = "auth"."uid"())));



CREATE POLICY "friendships_participant_select" ON "public"."friendships" FOR SELECT TO "authenticated" USING ((("requester_id" = "auth"."uid"()) OR ("addressee_id" = "auth"."uid"())));



CREATE POLICY "friendships_participant_update" ON "public"."friendships" FOR UPDATE TO "authenticated" USING ((("requester_id" = "auth"."uid"()) OR ("addressee_id" = "auth"."uid"()))) WITH CHECK ((("requester_id" = "auth"."uid"()) OR ("addressee_id" = "auth"."uid"())));



CREATE POLICY "friendships_requester_insert" ON "public"."friendships" FOR INSERT TO "authenticated" WITH CHECK ((("requester_id" = "auth"."uid"()) AND ("addressee_id" <> "auth"."uid"())));



CREATE POLICY "friendships_select" ON "public"."friendships" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "requester_id") OR ("auth"."uid"() = "addressee_id")));



CREATE POLICY "friendships_update" ON "public"."friendships" FOR UPDATE TO "authenticated" USING ((("auth"."uid"() = "requester_id") OR ("auth"."uid"() = "addressee_id")));



CREATE POLICY "h2h_insert" ON "public"."battle_head_to_head" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "h2h_select" ON "public"."battle_head_to_head" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "user_id") OR ("auth"."uid"() = "opponent_id")));



CREATE POLICY "h2h_update" ON "public"."battle_head_to_head" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "insert_own" ON "public"."bug_reports" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "nutrition_all" ON "public"."nutrition_logs" TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."nutrition_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "nutrition_logs_owner_all" ON "public"."nutrition_logs" TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "prefs_all" ON "public"."user_exercise_preferences" TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_owner_insert" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (("id" = "auth"."uid"()));



CREATE POLICY "profiles_owner_update" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("id" = "auth"."uid"())) WITH CHECK (("id" = "auth"."uid"()));



CREATE POLICY "profiles_select_own" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "id"));



CREATE POLICY "profiles_update" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "id"));



CREATE POLICY "prs_delete" ON "public"."exercise_prs" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "prs_insert" ON "public"."exercise_prs" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "prs_update" ON "public"."exercise_prs" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "rank_states_delete" ON "public"."exercise_rank_states" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "rank_states_insert" ON "public"."exercise_rank_states" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "rank_states_update" ON "public"."exercise_rank_states" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."rate_limit_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "room_events_insert" ON "public"."workout_room_events" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"() = "user_id") AND (EXISTS ( SELECT 1
   FROM "public"."workout_rooms"
  WHERE (("workout_rooms"."id" = "workout_room_events"."room_id") AND (("workout_rooms"."challenger_id" = "auth"."uid"()) OR ("workout_rooms"."challenged_id" = "auth"."uid"())))))));



CREATE POLICY "room_events_select" ON "public"."workout_room_events" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."workout_rooms"
  WHERE (("workout_rooms"."id" = "workout_room_events"."room_id") AND (("workout_rooms"."challenger_id" = "auth"."uid"()) OR ("workout_rooms"."challenged_id" = "auth"."uid"()))))));



CREATE POLICY "rooms_insert" ON "public"."workout_rooms" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "challenger_id"));



CREATE POLICY "rooms_select" ON "public"."workout_rooms" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "challenger_id") OR ("auth"."uid"() = "challenged_id")));



CREATE POLICY "rooms_update" ON "public"."workout_rooms" FOR UPDATE TO "authenticated" USING ((("auth"."uid"() = "challenger_id") OR ("auth"."uid"() = "challenged_id")));



CREATE POLICY "routines_all" ON "public"."user_routines" TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "sessions_delete" ON "public"."workout_sessions" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "sessions_insert" ON "public"."workout_sessions" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "sessions_update" ON "public"."workout_sessions" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "sets_all" ON "public"."workout_sets" TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."user_exercise_preferences" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_exercise_preferences_owner_all" ON "public"."user_exercise_preferences" TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."user_routines" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_routines_owner_all" ON "public"."user_routines" TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."user_training_plan_adaptations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_training_plans" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_training_plans_owner_all" ON "public"."user_training_plans" TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "weight_logs_delete" ON "public"."body_weight_logs" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "weight_logs_insert" ON "public"."body_weight_logs" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "weight_logs_update" ON "public"."body_weight_logs" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."workout_room_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "workout_room_events_participant_insert" ON "public"."workout_room_events" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."workout_rooms" "r"
  WHERE (("r"."id" = "workout_room_events"."room_id") AND ("r"."status" = 'active'::"text") AND (("r"."challenger_id" = "auth"."uid"()) OR ("r"."challenged_id" = "auth"."uid"())))))));



CREATE POLICY "workout_room_events_participant_select" ON "public"."workout_room_events" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."workout_rooms" "r"
  WHERE (("r"."id" = "workout_room_events"."room_id") AND (("r"."challenger_id" = "auth"."uid"()) OR ("r"."challenged_id" = "auth"."uid"()))))));



ALTER TABLE "public"."workout_rooms" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "workout_rooms_participant_insert" ON "public"."workout_rooms" FOR INSERT TO "authenticated" WITH CHECK ((("challenger_id" = "auth"."uid"()) OR ("challenged_id" = "auth"."uid"())));



CREATE POLICY "workout_rooms_participant_select" ON "public"."workout_rooms" FOR SELECT TO "authenticated" USING ((("challenger_id" = "auth"."uid"()) OR ("challenged_id" = "auth"."uid"())));



CREATE POLICY "workout_rooms_participant_update" ON "public"."workout_rooms" FOR UPDATE TO "authenticated" USING ((("challenger_id" = "auth"."uid"()) OR ("challenged_id" = "auth"."uid"()))) WITH CHECK ((("challenger_id" = "auth"."uid"()) OR ("challenged_id" = "auth"."uid"())));



ALTER TABLE "public"."workout_sessions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "workout_sessions_accepted_friend_finished_select" ON "public"."workout_sessions" FOR SELECT TO "authenticated" USING ((("finished_at" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."friendships" "f"
  WHERE (("f"."status" = 'accepted'::"text") AND ((("f"."requester_id" = "auth"."uid"()) AND ("f"."addressee_id" = "workout_sessions"."user_id")) OR (("f"."addressee_id" = "auth"."uid"()) AND ("f"."requester_id" = "workout_sessions"."user_id"))))))));



CREATE POLICY "workout_sessions_owner_all" ON "public"."workout_sessions" TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "workout_sessions_select_own" ON "public"."workout_sessions" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."workout_sets" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "workout_sets_owner_all" ON "public"."workout_sets" TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."battle_invites";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."workout_room_events";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."workout_rooms";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."app_check_rate_limit"("p_action" "text", "p_limit" integer, "p_window_seconds" integer, "p_scope" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."app_check_rate_limit"("p_action" "text", "p_limit" integer, "p_window_seconds" integer, "p_scope" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."app_check_rate_limit"("p_action" "text", "p_limit" integer, "p_window_seconds" integer, "p_scope" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."app_enforce_write_rate_limit"() TO "anon";
GRANT ALL ON FUNCTION "public"."app_enforce_write_rate_limit"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."app_enforce_write_rate_limit"() TO "service_role";



GRANT ALL ON FUNCTION "public"."app_json_text_size_ok"("p_value" "jsonb", "p_max_bytes" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."app_json_text_size_ok"("p_value" "jsonb", "p_max_bytes" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."app_json_text_size_ok"("p_value" "jsonb", "p_max_bytes" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."app_validate_exercise_notes"("p_notes" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."app_validate_exercise_notes"("p_notes" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."app_validate_exercise_notes"("p_notes" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."app_validate_routine_exercises"("p_exercises" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."app_validate_routine_exercises"("p_exercises" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."app_validate_routine_exercises"("p_exercises" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."app_validate_training_plan_days"("p_days" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."app_validate_training_plan_days"("p_days" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."app_validate_training_plan_days"("p_days" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."app_validate_workout_room_event_payload"("p_event_type" "text", "p_payload" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."app_validate_workout_room_event_payload"("p_event_type" "text", "p_payload" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."app_validate_workout_room_event_payload"("p_event_type" "text", "p_payload" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."count_distinct_nutrition_days"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."count_distinct_nutrition_days"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."count_distinct_nutrition_days"("p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."delete_user_account_data"("p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."delete_user_account_data"("p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."finish_workout_session_atomic"("p_session_id" "uuid", "p_finished_at" timestamp with time zone, "p_exercise_notes" "jsonb", "p_calories_burned" integer, "p_source_plan_id" "uuid", "p_source_plan_day_id" "text", "p_source_plan_week" integer, "p_session_training_volume_kg" double precision, "p_sets" "jsonb", "p_prs" "jsonb", "p_rank_states" "jsonb", "p_streak_start_date" "date", "p_streak_last_workout_at" timestamp with time zone) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."finish_workout_session_atomic"("p_session_id" "uuid", "p_finished_at" timestamp with time zone, "p_exercise_notes" "jsonb", "p_calories_burned" integer, "p_source_plan_id" "uuid", "p_source_plan_day_id" "text", "p_source_plan_week" integer, "p_session_training_volume_kg" double precision, "p_sets" "jsonb", "p_prs" "jsonb", "p_rank_states" "jsonb", "p_streak_start_date" "date", "p_streak_last_workout_at" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."finish_workout_session_atomic"("p_session_id" "uuid", "p_finished_at" timestamp with time zone, "p_exercise_notes" "jsonb", "p_calories_burned" integer, "p_source_plan_id" "uuid", "p_source_plan_day_id" "text", "p_source_plan_week" integer, "p_session_training_volume_kg" double precision, "p_sets" "jsonb", "p_prs" "jsonb", "p_rank_states" "jsonb", "p_streak_start_date" "date", "p_streak_last_workout_at" timestamp with time zone) TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_battle_profile_inputs"("p_room_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_battle_profile_inputs"("p_room_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_battle_profile_inputs"("p_room_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_exercise_daily_orm_points"("p_user_id" "uuid", "p_exercise_id" bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_exercise_daily_orm_points"("p_user_id" "uuid", "p_exercise_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_exercise_daily_orm_points"("p_user_id" "uuid", "p_exercise_id" bigint) TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_exercise_history_summary"("p_user_id" "uuid", "p_exercise_id" bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_exercise_history_summary"("p_user_id" "uuid", "p_exercise_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_exercise_history_summary"("p_user_id" "uuid", "p_exercise_id" bigint) TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_friend_rank_profile"("p_profile_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_friend_rank_profile"("p_profile_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_friend_rank_profile"("p_profile_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_public_profiles"("p_profile_ids" "uuid"[]) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_public_profiles"("p_profile_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_public_profiles"("p_profile_ids" "uuid"[]) TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_recent_progressive_overload_sets"("p_exercise_ids" integer[], "p_session_limit" integer, "p_exclude_session_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_recent_progressive_overload_sets"("p_exercise_ids" integer[], "p_session_limit" integer, "p_exclude_session_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_recent_progressive_overload_sets"("p_exercise_ids" integer[], "p_session_limit" integer, "p_exclude_session_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."record_battle_result_atomic"("p_room_id" "uuid", "p_winner_id" "uuid", "p_challenger_points" integer, "p_challenged_points" integer, "p_score_total" integer, "p_scoring_version" "text", "p_recap" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."record_battle_result_atomic"("p_room_id" "uuid", "p_winner_id" "uuid", "p_challenger_points" integer, "p_challenged_points" integer, "p_score_total" integer, "p_scoring_version" "text", "p_recap" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."record_battle_result_atomic"("p_room_id" "uuid", "p_winner_id" "uuid", "p_challenger_points" integer, "p_challenged_points" integer, "p_score_total" integer, "p_scoring_version" "text", "p_recap" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."refresh_battle_head_to_head_pair"("p_user_a" "uuid", "p_user_b" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."refresh_battle_head_to_head_pair"("p_user_a" "uuid", "p_user_b" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."respond_to_battle_invite_atomic"("p_invite_id" "uuid", "p_action" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."respond_to_battle_invite_atomic"("p_invite_id" "uuid", "p_action" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."respond_to_battle_invite_atomic"("p_invite_id" "uuid", "p_action" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."search_profiles_for_friendship"("p_search" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."search_profiles_for_friendship"("p_search" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_profiles_for_friendship"("p_search" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_battle_head_to_head_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_battle_head_to_head_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_battle_head_to_head_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_exercise_rank_states_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_exercise_rank_states_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_exercise_rank_states_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_profile_workout_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_profile_workout_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_profile_workout_count"() TO "service_role";


















GRANT ALL ON TABLE "public"."app_config" TO "anon";
GRANT ALL ON TABLE "public"."app_config" TO "authenticated";
GRANT ALL ON TABLE "public"."app_config" TO "service_role";



GRANT ALL ON TABLE "public"."battle_head_to_head" TO "anon";
GRANT ALL ON TABLE "public"."battle_head_to_head" TO "authenticated";
GRANT ALL ON TABLE "public"."battle_head_to_head" TO "service_role";



GRANT ALL ON TABLE "public"."battle_invites" TO "anon";
GRANT ALL ON TABLE "public"."battle_invites" TO "authenticated";
GRANT ALL ON TABLE "public"."battle_invites" TO "service_role";



GRANT ALL ON TABLE "public"."battle_results" TO "service_role";
GRANT SELECT ON TABLE "public"."battle_results" TO "authenticated";



GRANT ALL ON TABLE "public"."body_weight_logs" TO "anon";
GRANT ALL ON TABLE "public"."body_weight_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."body_weight_logs" TO "service_role";



GRANT ALL ON TABLE "public"."bug_reports" TO "anon";
GRANT ALL ON TABLE "public"."bug_reports" TO "authenticated";
GRANT ALL ON TABLE "public"."bug_reports" TO "service_role";



GRANT ALL ON TABLE "public"."exercise_prs" TO "anon";
GRANT ALL ON TABLE "public"."exercise_prs" TO "authenticated";
GRANT ALL ON TABLE "public"."exercise_prs" TO "service_role";



GRANT ALL ON TABLE "public"."exercise_rank_states" TO "anon";
GRANT ALL ON TABLE "public"."exercise_rank_states" TO "authenticated";
GRANT ALL ON TABLE "public"."exercise_rank_states" TO "service_role";



GRANT ALL ON TABLE "public"."exercises" TO "anon";
GRANT ALL ON TABLE "public"."exercises" TO "authenticated";
GRANT ALL ON TABLE "public"."exercises" TO "service_role";



GRANT ALL ON SEQUENCE "public"."exercises_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."exercises_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."exercises_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."foods" TO "anon";
GRANT ALL ON TABLE "public"."foods" TO "authenticated";
GRANT ALL ON TABLE "public"."foods" TO "service_role";



GRANT ALL ON TABLE "public"."friendships" TO "anon";
GRANT ALL ON TABLE "public"."friendships" TO "authenticated";
GRANT ALL ON TABLE "public"."friendships" TO "service_role";



GRANT ALL ON TABLE "public"."nutrition_logs" TO "anon";
GRANT ALL ON TABLE "public"."nutrition_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."nutrition_logs" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."public_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."public_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."rate_limit_events" TO "anon";
GRANT ALL ON TABLE "public"."rate_limit_events" TO "authenticated";
GRANT ALL ON TABLE "public"."rate_limit_events" TO "service_role";



GRANT ALL ON SEQUENCE "public"."rate_limit_events_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."rate_limit_events_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."rate_limit_events_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."user_exercise_preferences" TO "anon";
GRANT ALL ON TABLE "public"."user_exercise_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."user_exercise_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."user_routines" TO "anon";
GRANT ALL ON TABLE "public"."user_routines" TO "authenticated";
GRANT ALL ON TABLE "public"."user_routines" TO "service_role";



GRANT ALL ON TABLE "public"."user_training_plan_adaptations" TO "anon";
GRANT ALL ON TABLE "public"."user_training_plan_adaptations" TO "authenticated";
GRANT ALL ON TABLE "public"."user_training_plan_adaptations" TO "service_role";



GRANT ALL ON TABLE "public"."user_training_plans" TO "anon";
GRANT ALL ON TABLE "public"."user_training_plans" TO "authenticated";
GRANT ALL ON TABLE "public"."user_training_plans" TO "service_role";



GRANT ALL ON TABLE "public"."workout_room_events" TO "anon";
GRANT ALL ON TABLE "public"."workout_room_events" TO "authenticated";
GRANT ALL ON TABLE "public"."workout_room_events" TO "service_role";



GRANT ALL ON TABLE "public"."workout_rooms" TO "anon";
GRANT ALL ON TABLE "public"."workout_rooms" TO "authenticated";
GRANT ALL ON TABLE "public"."workout_rooms" TO "service_role";



GRANT ALL ON TABLE "public"."workout_sessions" TO "anon";
GRANT ALL ON TABLE "public"."workout_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."workout_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."workout_sets" TO "anon";
GRANT ALL ON TABLE "public"."workout_sets" TO "authenticated";
GRANT ALL ON TABLE "public"."workout_sets" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































