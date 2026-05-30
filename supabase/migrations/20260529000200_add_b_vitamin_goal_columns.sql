-- Add daily goal columns for folate, vitamin B6, vitamin B12 on profiles.
-- These complete the set of micronutrient goals so the Nutrition dashboard
-- can render goal bars for all tracked micros. Nullable: the app falls back
-- to in-code DEFAULT_GOALS when null.

begin;

alter table public.profiles
  add column if not exists folate_goal numeric,
  add column if not exists vitamin_b6_goal numeric,
  add column if not exists vitamin_b12_goal numeric;

commit;
