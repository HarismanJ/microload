-- Migration: 20260524001000_respond_to_battle_invite_atomic.sql
-- Wraps the two-step respondToBattleInvite client calls (INSERT workout_rooms +
-- UPDATE battle_invites) into a single atomic RPC.
--
-- Problem: the old client-side path inserted a workout_room and then updated
-- battle_invites.status in two separate network calls. A failure between the two
-- left an active workout_room with no corresponding accepted invite — a phantom
-- battle room that loadActiveBattleRoom would navigate both users into.
--
-- Fix: SECURITY INVOKER function (existing RLS already permits all operations for
-- the challenged_id user) with a FOR UPDATE lock on the invite row to prevent
-- concurrent responses, both writes in one transaction.

begin;

create or replace function public.respond_to_battle_invite_atomic(
  p_invite_id uuid,
  p_action    text   -- 'accepted' | 'declined'
)
returns jsonb
language plpgsql
volatile
security invoker
set search_path = public, pg_temp
as $$
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

revoke all on function public.respond_to_battle_invite_atomic(uuid, text) from public;
revoke all on function public.respond_to_battle_invite_atomic(uuid, text) from anon;
grant execute on function public.respond_to_battle_invite_atomic(uuid, text) to authenticated;
grant execute on function public.respond_to_battle_invite_atomic(uuid, text) to service_role;

comment on function public.respond_to_battle_invite_atomic(uuid, text) is
  'Atomically responds to a battle invite. Accepts or declines in a single '
  'transaction with a FOR UPDATE lock on the invite row, preventing phantom '
  'battle rooms from partial client-side failures. SECURITY INVOKER — existing '
  'RLS policies already permit all required operations for the challenged_id user.';

commit;
