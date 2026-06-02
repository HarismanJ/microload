-- Recipes as first-class, user-owned entities.
--
-- A recipe is a named collection of ingredients (stored as a JSONB array, mirroring
-- the user_training_plans.days pattern rather than a child table) plus a denormalized
-- per-serving nutrition snapshot so listing and logging never need to recompute from
-- the ingredient breakdown.
--
-- Security/abuse posture mirrors public.foods: owner-only RLS, ON DELETE CASCADE on the
-- user FK, a JSONB size cap, value bounds, and a per-user insert rate limit.

begin;

create table if not exists public.recipes (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    name text not null,
    servings numeric not null default 1,
    ingredients jsonb not null default '[]'::jsonb,
    -- Per-serving nutrition snapshot (same columns/order as public.foods).
    calories numeric not null default 0,
    protein numeric default 0,
    carbs numeric default 0,
    fat numeric default 0,
    fiber numeric default 0,
    sugar numeric default 0,
    saturated_fat numeric default 0,
    sodium numeric default 0,
    potassium numeric default 0,
    cholesterol numeric default 0,
    vitamin_a numeric default 0,
    vitamin_c numeric default 0,
    calcium numeric default 0,
    iron numeric default 0,
    vitamin_d numeric default 0,
    magnesium numeric default 0,
    zinc numeric default 0,
    folate numeric default 0,
    vitamin_b12 numeric default 0,
    vitamin_b6 numeric default 0,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now(),
    constraint recipes_name_check
        check ((char_length(btrim(name)) >= 1) and (char_length(btrim(name)) <= 120)),
    constraint recipes_servings_check
        check ((servings > (0)::numeric) and (servings <= (1000000)::numeric)),
    constraint recipes_ingredients_is_array
        check (jsonb_typeof(ingredients) = 'array'),
    constraint recipes_ingredients_size_check
        check (octet_length((ingredients)::text) <= 32768),
    -- Same value bounds public.foods enforces on its per-serving snapshot.
    constraint recipes_nutrition_input_check check (
        (calories >= (0)::numeric) and (calories <= (1000000)::numeric)
        and (protein >= (0)::numeric) and (protein <= (250000)::numeric)
        and (carbs >= (0)::numeric) and (carbs <= (250000)::numeric)
        and (fat >= (0)::numeric) and (fat <= (250000)::numeric)
        and (fiber >= (0)::numeric) and (fiber <= (250000)::numeric)
        and (sugar >= (0)::numeric) and (sugar <= (250000)::numeric)
        and (saturated_fat >= (0)::numeric) and (saturated_fat <= (250000)::numeric)
        and (sodium >= (0)::numeric) and (sodium <= (10000000)::numeric)
        and (potassium >= (0)::numeric) and (potassium <= (10000000)::numeric)
        and (cholesterol >= (0)::numeric) and (cholesterol <= (1000000)::numeric)
        and (vitamin_a >= (0)::numeric) and (vitamin_a <= (10000000)::numeric)
        and (vitamin_c >= (0)::numeric) and (vitamin_c <= (1000000)::numeric)
        and (calcium >= (0)::numeric) and (calcium <= (10000000)::numeric)
        and (iron >= (0)::numeric) and (iron <= (1000000)::numeric)
        and (vitamin_d >= (0)::numeric)
        and (magnesium >= (0)::numeric)
        and (zinc >= (0)::numeric)
        and (folate >= (0)::numeric)
        and (vitamin_b12 >= (0)::numeric)
        and (vitamin_b6 >= (0)::numeric)
    )
);

alter table public.recipes owner to postgres;

create index if not exists recipes_user_id_updated_at_idx
    on public.recipes (user_id, updated_at desc);

-- Keep updated_at fresh on every UPDATE (mirrors set_*_updated_at helpers).
create or replace function public.set_recipes_updated_at() returns trigger
    language plpgsql
    as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

alter function public.set_recipes_updated_at() owner to postgres;

drop trigger if exists recipes_set_updated_at on public.recipes;
create trigger recipes_set_updated_at
    before update on public.recipes
    for each row execute function public.set_recipes_updated_at();

-- Per-user insert rate limit (recipes are created infrequently; 100/day is generous).
drop trigger if exists recipes_rate_limit_user on public.recipes;
create trigger recipes_rate_limit_user
    before insert on public.recipes
    for each row execute function public.app_enforce_write_rate_limit('custom_recipe', '100', '86400');

-- Row Level Security: a user may only read/write their own recipes.
alter table public.recipes enable row level security;

drop policy if exists "recipes_owner_all" on public.recipes;
create policy "recipes_owner_all" on public.recipes
    to authenticated
    using (user_id = auth.uid())
    with check (user_id = auth.uid());

grant all on table public.recipes to anon;
grant all on table public.recipes to authenticated;
grant all on table public.recipes to service_role;

-- Account deletion: remove recipes alongside the user's other owned rows.
-- (ON DELETE CASCADE also covers this; kept explicit for parity with foods.)
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

  delete from public.recipes
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
