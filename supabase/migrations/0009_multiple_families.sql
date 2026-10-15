-- One person can belong to several families and switch between them.
-- The family they last switched to (or created / joined) is their "current"
-- one, and everything they see - recipes, plan, lists, files - comes from it.
-- Existing accounts keep their first family as current.

alter table public.household_members add column if not exists selected_at timestamptz;

-- The signed-in user's current family.
create or replace function public.active_household_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select household_id from public.household_members
  where user_id = auth.uid()
  order by selected_at desc nulls last, created_at, household_id
  limit 1;
$$;

-- Every household-scoped policy goes through this, so it now only matches
-- the current family (a member of two families doesn't see them mixed).
create or replace function public.is_household_member(hid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select hid is not null and hid = public.active_household_id();
$$;

-- ...but the family switcher needs to list all of them.
drop policy if exists "members read own households" on public.households;
create policy "members read own households" on public.households
  for select using (
    exists (select 1 from public.household_members m where m.household_id = households.id and m.user_id = auth.uid())
  );
drop policy if exists "members read own memberships" on public.household_members;
create policy "members read own memberships" on public.household_members
  for select using (user_id = auth.uid());

create or replace function public.switch_household(p_household_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.household_members set selected_at = now()
  where household_id = p_household_id and user_id = auth.uid();
  if not found then
    raise exception 'not a member of that family';
  end if;
end;
$$;

-- Creating or joining a family makes it the current one.
create or replace function public.create_household(p_name text, p_display_name text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  insert into public.households(name) values (coalesce(nullif(trim(p_name), ''), 'Our kitchen'))
    returning id into new_id;
  insert into public.household_members(household_id, user_id, role, display_name, selected_at)
    values (new_id, auth.uid(), 'owner', p_display_name, now());
  return new_id;
end;
$$;

create or replace function public.join_household(p_code text, p_display_name text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  hid uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  select id into hid from public.households where invite_code = upper(trim(p_code));
  if hid is null then
    raise exception 'invalid invite code';
  end if;
  insert into public.household_members(household_id, user_id, role, display_name, selected_at)
    values (hid, auth.uid(), 'member', p_display_name, now())
    on conflict (household_id, user_id) do update set selected_at = now();
  return hid;
end;
$$;

grant execute on function public.active_household_id() to authenticated;
grant execute on function public.switch_household(uuid) to authenticated;
