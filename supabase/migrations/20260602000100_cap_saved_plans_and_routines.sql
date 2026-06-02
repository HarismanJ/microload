create or replace function public.app_enforce_saved_item_limit() returns trigger
    language plpgsql
    security definer
    set search_path = public, pg_temp
    as $$
declare
  item_limit integer := tg_argv[0]::integer;
  item_label text := tg_argv[1];
  existing_count integer;
begin
  if new.user_id is null then
    return new;
  end if;

  perform pg_advisory_xact_lock(
    hashtext(tg_table_schema || '.' || tg_table_name),
    hashtext(new.user_id::text)
  );

  execute format('select count(*) from %I.%I where user_id = $1', tg_table_schema, tg_table_name)
    using new.user_id
    into existing_count;

  if existing_count >= item_limit then
    raise exception '% limit reached', item_label
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

alter function public.app_enforce_saved_item_limit() owner to postgres;

drop trigger if exists user_training_plans_saved_item_limit on public.user_training_plans;
create trigger user_training_plans_saved_item_limit
    before insert on public.user_training_plans
    for each row execute function public.app_enforce_saved_item_limit('5', 'Saved training plan');

drop trigger if exists user_routines_saved_item_limit on public.user_routines;
create trigger user_routines_saved_item_limit
    before insert on public.user_routines
    for each row execute function public.app_enforce_saved_item_limit('15', 'Saved routine');
