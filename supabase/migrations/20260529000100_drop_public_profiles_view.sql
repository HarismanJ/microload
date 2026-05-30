-- Drop the public.public_profiles view.
--
-- This view was flagged by the Supabase linter as a "Security Definer View":
-- because views run with their owner's privileges (postgres), it bypassed the
-- profiles_select_own RLS policy. The exposed columns were intentionally safe
-- (id, username, full_name, avatar_url, created_at), but the implicit RLS
-- bypass is not a pattern we want to keep.
--
-- All non-owner profile reads now go through:
--   - public.get_public_profiles(uuid[])           -- batch lookup by ids
--   - public.search_profiles_for_friendship(text)  -- username search
-- Both are SECURITY DEFINER functions with explicit search_path, which is the
-- recommended pattern.

begin;

revoke all on public.public_profiles from authenticated;
revoke all on public.public_profiles from service_role;
drop view if exists public.public_profiles;

commit;
