begin;

create table if not exists public.app_config (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now()
);

alter table public.app_config enable row level security;

-- Scope to only the version key — app_config must not become an
-- accidental public data store if other keys are added later.
create policy "Public read min_required_version"
  on public.app_config
  for select
  using (key = 'min_required_version');

-- Explicit grants so the policy isn't dependent on Supabase role defaults.
grant select on public.app_config to anon, authenticated;

-- Seed initial value. Update this row to trigger a forced update.
-- IMPORTANT: set this to your actual launch version before first release.
insert into public.app_config (key, value)
values ('min_required_version', '1.0.0')
on conflict (key) do nothing;

commit;
