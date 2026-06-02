-- Permanent admin-controlled premium overrides.
-- Authenticated clients can only ask whether their own account has an enabled
-- override via public.has_premium_override(). They cannot read, insert, update,
-- delete, or enumerate override rows directly.

create table if not exists public.premium_overrides (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  enabled boolean not null default true,
  granted_at timestamptz not null default now(),
  granted_by uuid references auth.users(id) on delete set null,
  reason text,
  constraint premium_overrides_reason_length_check
    check (reason is null or char_length(reason) <= 200)
);

alter table public.premium_overrides enable row level security;

revoke all on public.premium_overrides from public;
revoke all on public.premium_overrides from anon;
revoke all on public.premium_overrides from authenticated;
grant all on public.premium_overrides to service_role;

create or replace function public.has_premium_override()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select auth.uid() is not null
    and exists (
      select 1
      from public.premium_overrides po
      where po.user_id = auth.uid()
        and po.enabled is true
    );
$$;

revoke all on function public.has_premium_override() from public;
revoke all on function public.has_premium_override() from anon;
grant execute on function public.has_premium_override() to authenticated;
grant execute on function public.has_premium_override() to service_role;

comment on table public.premium_overrides is
  'Admin-controlled permanent premium overrides. No direct authenticated access; use service_role SQL to grant/revoke.';
comment on function public.has_premium_override() is
  'Returns true only when the authenticated caller has an enabled premium override.';
