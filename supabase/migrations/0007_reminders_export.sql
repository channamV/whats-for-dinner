-- Optional: send the grocery list to iPhone Reminders (the reverse of 0004).
-- The household's Shortcut reads its current grocery list's unticked items for one
-- store and, when p_commit is true, ticks them off in the app in the same step, so
-- running it again never sends the same item twice.
--   p_store null  -> items not marked for any store ("Grocery")
--   p_store '*'   -> everything
--   otherwise     -> items marked for that store, e.g. 'Costco'
create or replace function public.shortcut_export(p_key_hash text, p_store text, p_commit boolean)
returns table (name text, quantity numeric, unit text, note text, store text)
language plpgsql
security definer
set search_path = public
as $$
declare
  hid uuid;
  lid uuid;
begin
  select h.id into hid from households h where h.shortcut_key_hash = p_key_hash and p_key_hash is not null;
  if hid is null then
    raise exception 'invalid shortcuts key' using errcode = '28000';
  end if;

  select l.id into lid from grocery_lists l
    where l.household_id = hid and not l.archived
    order by l.created_at desc limit 1;
  if lid is null then
    return;
  end if;

  if p_commit then
    return query
      update grocery_items g set checked = true
      where g.list_id = lid and not g.checked
        and case when p_store is null then g.store is null
                 when p_store = '*' then true
                 else lower(g.store) = lower(p_store) end
      returning g.name, g.quantity, g.unit, g.note, g.store;
  else
    return query
      select g.name, g.quantity, g.unit, g.note, g.store from grocery_items g
      where g.list_id = lid and not g.checked
        and case when p_store is null then g.store is null
                 when p_store = '*' then true
                 else lower(g.store) = lower(p_store) end
      order by g.category, g.position;
  end if;
end;
$$;

grant execute on function public.shortcut_export(text, text, boolean) to anon, authenticated;
