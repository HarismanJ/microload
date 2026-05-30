-- Remove a dead party-battle helper that references tables absent from the
-- current schema and unused by the app. Intentionally no CASCADE: if anything
-- depends on this function in a target database, the migration should fail.

begin;

drop function if exists public.is_party_room_member(uuid);

commit;
