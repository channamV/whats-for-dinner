-- Optional iPhone Reminders / Siri sync, plus per-item store (e.g. "Costco").
--
-- A household can turn on a "Shortcuts key". An Apple Shortcut on someone's
-- iPhone sends that key with the items from their Reminders lists to
-- /api/shortcuts/sync. Only a SHA-256 hash of the key is stored. The two
-- functions below are the only way in with a key: they check it, and only ever
-- touch that household's current grocery list.

alter table public.grocery_items add column if not exists store text;

alter table public.households add column if not exists shortcut_key_hash text unique;
alter table public.households add column if not exists shortcut_key_created_at timestamptz;

-- The household's current list (newest open one, created if there isn't one)
-- and its unticked items, for the app to merge new items into.
create or replace function public.shortcut_snapshot(p_key_hash text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  hid uuid;
  lid uuid;
  lname text;
begin
  select id into hid from households where shortcut_key_hash = p_key_hash and p_key_hash is not null;
  if hid is null then
    raise exception 'invalid shortcuts key' using errcode = '28000';
  end if;

  select id, name into lid, lname from grocery_lists
    where household_id = hid and not archived
    order by created_at desc limit 1;
  if lid is null then
    insert into grocery_lists(household_id, name) values (hid, 'Groceries') returning id, name into lid, lname;
  end if;

  return jsonb_build_object(
    'list_id', lid,
    'list_name', lname,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id, 'name', name, 'quantity', quantity, 'unit', unit,
        'category', category, 'store', store, 'note', note, 'sources', sources
      ) order by position)
      from grocery_items where list_id = lid and not checked
    ), '[]'::jsonb)
  );
end;
$$;

-- Replaces the given unticked items on the list with the merged set.
create or replace function public.shortcut_replace_items(
  p_key_hash text,
  p_list_id uuid,
  p_remove uuid[],
  p_items jsonb
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  hid uuid;
  inserted integer;
begin
  select id into hid from households where shortcut_key_hash = p_key_hash and p_key_hash is not null;
  if hid is null then
    raise exception 'invalid shortcuts key' using errcode = '28000';
  end if;
  if not exists (select 1 from grocery_lists where id = p_list_id and household_id = hid) then
    raise exception 'list not found' using errcode = '42704';
  end if;

  delete from grocery_items
    where list_id = p_list_id and household_id = hid and not checked and id = any(coalesce(p_remove, '{}'));

  insert into grocery_items(list_id, household_id, name, quantity, unit, category, store, note, sources, position)
  select p_list_id, hid, left(x.name, 200), x.quantity, left(x.unit, 20),
         case when x.category in ('produce','meat','seafood','dairy','bakery','pantry','spices','frozen','other')
              then x.category else 'other' end,
         nullif(left(x.store, 40), ''), left(x.note, 200), coalesce(x.sources, '{}'), coalesce(x.position, 0)
  from jsonb_to_recordset(p_items) as x(
    name text, quantity numeric, unit text, category text, store text, note text, sources text[], position int
  )
  where coalesce(trim(x.name), '') <> '';
  get diagnostics inserted = row_count;
  return inserted;
end;
$$;

-- Callable without signing in (the key is the credential), so allow anon.
grant execute on function public.shortcut_snapshot(text) to anon, authenticated;
grant execute on function public.shortcut_replace_items(text, uuid, uuid[], jsonb) to anon, authenticated;
