-- Allow the battle workout feed payload keys the client already publishes.
-- Without these keys, set_completed / set_removed inserts are rejected by the
-- workout_room_events payload check before realtime can deliver them.

create or replace function public.app_validate_workout_room_event_payload(
  p_event_type text,
  p_payload jsonb
) returns boolean
language plpgsql
immutable
as $$
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
    'setType',
    'set_type',
    'setGroupIndex',
    'set_group_index',
    'isWarmup',
    'is_warmup',
    'removeGroup',
    'totalSets',
    'totalWorkingSets',
    'totalDropSets',
    'totalWarmupSets',
    'totalVolume',
    'totalVolumeKg',
    'totalLoadVolume',
    'totalLoadVolumeKg',
    'totalExercises',
    'exerciseCount',
    'highlights'
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
  set_types text[] := array[
    'normal',
    'warmup',
    'dropset',
    'superset'
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

    if item.key in ('setType', 'set_type') then
      if jsonb_typeof(item.value) <> 'string' then return false; end if;
      if not (trim(both '"' from item.value::text) = any(set_types)) then return false; end if;
    end if;

    if item.key in ('isWarmup', 'is_warmup', 'removeGroup') then
      if jsonb_typeof(item.value) <> 'boolean' then return false; end if;
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

    if item.key = 'highlights' then
      if jsonb_typeof(item.value) <> 'array' or jsonb_array_length(item.value) > 16 then return false; end if;
    end if;
  end loop;

  if p_payload ? 'setNumber' then
    numeric_value := (p_payload->>'setNumber')::numeric;
    if numeric_value < 1 or numeric_value > 9999 or numeric_value <> floor(numeric_value) then return false; end if;
  end if;

  if p_payload ? 'setGroupIndex' and jsonb_typeof(p_payload->'setGroupIndex') <> 'null' then
    numeric_value := (p_payload->>'setGroupIndex')::numeric;
    if numeric_value < 0 or numeric_value > 9999 or numeric_value <> floor(numeric_value) then return false; end if;
  end if;

  if p_payload ? 'set_group_index' and jsonb_typeof(p_payload->'set_group_index') <> 'null' then
    numeric_value := (p_payload->>'set_group_index')::numeric;
    if numeric_value < 0 or numeric_value > 9999 or numeric_value <> floor(numeric_value) then return false; end if;
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

  if p_payload ? 'totalWorkingSets' then
    numeric_value := (p_payload->>'totalWorkingSets')::numeric;
    if numeric_value < 0 or numeric_value > 10000 or numeric_value <> floor(numeric_value) then return false; end if;
  end if;

  if p_payload ? 'totalDropSets' then
    numeric_value := (p_payload->>'totalDropSets')::numeric;
    if numeric_value < 0 or numeric_value > 10000 or numeric_value <> floor(numeric_value) then return false; end if;
  end if;

  if p_payload ? 'totalWarmupSets' then
    numeric_value := (p_payload->>'totalWarmupSets')::numeric;
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

  if p_payload ? 'totalLoadVolume' then
    numeric_value := (p_payload->>'totalLoadVolume')::numeric;
    if numeric_value < 0 or numeric_value > 100000000 then return false; end if;
  end if;

  if p_payload ? 'totalLoadVolumeKg' then
    numeric_value := (p_payload->>'totalLoadVolumeKg')::numeric;
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
