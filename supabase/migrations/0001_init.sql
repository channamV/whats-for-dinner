-- What's for dinner: initial schema
-- Everything is scoped to a household so family members share one library.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Households
-- ---------------------------------------------------------------------------

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique default upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8)),
  default_servings int not null default 2 check (default_servings between 1 and 12),
  created_at timestamptz not null default now()
);

create table public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  display_name text,
  created_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

create index household_members_user_idx on public.household_members(user_id);

-- security definer so RLS policies can call it without recursing into
-- household_members' own policies.
create or replace function public.is_household_member(hid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.household_members
    where household_id = hid and user_id = auth.uid()
  );
$$;

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
  insert into public.household_members(household_id, user_id, role, display_name)
    values (new_id, auth.uid(), 'owner', p_display_name);
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
  insert into public.household_members(household_id, user_id, role, display_name)
    values (hid, auth.uid(), 'member', p_display_name)
    on conflict (household_id, user_id) do nothing;
  return hid;
end;
$$;

-- ---------------------------------------------------------------------------
-- Recipes (individual dishes) and meals (a combination of dishes)
-- ---------------------------------------------------------------------------

-- ingredients: [{ name, quantity, unit, note, scales, pantry, category }]
-- steps:       [{ title, text }]  -- text may contain {{1 tbsp}} tokens that scale
create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  title text not null,
  description text,
  base_servings int not null default 2 check (base_servings between 1 and 24),
  prep_minutes int,
  total_minutes int,
  tags text[] not null default '{}',
  ingredients jsonb not null default '[]'::jsonb,
  steps jsonb not null default '[]'::jsonb,
  equipment text[] not null default '{}',
  notes text,
  source text,
  image_path text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index recipes_household_idx on public.recipes(household_id);

create table public.meals (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  title text not null,
  subtitle text,
  description text,
  total_minutes int,
  tags text[] not null default '{}',
  source text,
  source_ref text,
  source_files text[] not null default '{}',
  image_path text,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index meals_household_idx on public.meals(household_id);

create table public.meal_dishes (
  meal_id uuid not null references public.meals(id) on delete cascade,
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete cascade,
  role text not null default 'main' check (role in ('main', 'side', 'sauce', 'dressing', 'topping', 'other')),
  position int not null default 0,
  primary key (meal_id, recipe_id)
);

create index meal_dishes_recipe_idx on public.meal_dishes(recipe_id);

-- ---------------------------------------------------------------------------
-- Meal plan
-- ---------------------------------------------------------------------------

create table public.meal_plan_entries (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  plan_date date not null,
  slot text not null default 'dinner' check (slot in ('breakfast', 'lunch', 'dinner', 'snack')),
  meal_id uuid references public.meals(id) on delete cascade,
  recipe_id uuid references public.recipes(id) on delete cascade,
  servings int not null default 2 check (servings between 1 and 24),
  note text,
  cooked boolean not null default false,
  created_at timestamptz not null default now(),
  check (meal_id is not null or recipe_id is not null or note is not null)
);

create index meal_plan_household_date_idx on public.meal_plan_entries(household_id, plan_date);

-- ---------------------------------------------------------------------------
-- Grocery lists
-- ---------------------------------------------------------------------------

create table public.grocery_lists (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

create index grocery_lists_household_idx on public.grocery_lists(household_id);

create table public.grocery_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.grocery_lists(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  quantity numeric,
  unit text,
  category text not null default 'other',
  note text,
  sources text[] not null default '{}',
  checked boolean not null default false,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create index grocery_items_list_idx on public.grocery_items(list_id);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger recipes_touch before update on public.recipes
  for each row execute function public.touch_updated_at();
create trigger meals_touch before update on public.meals
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.recipes enable row level security;
alter table public.meals enable row level security;
alter table public.meal_dishes enable row level security;
alter table public.meal_plan_entries enable row level security;
alter table public.grocery_lists enable row level security;
alter table public.grocery_items enable row level security;

create policy "members read household" on public.households
  for select using (public.is_household_member(id));
create policy "members update household" on public.households
  for update using (public.is_household_member(id));

create policy "members read membership" on public.household_members
  for select using (public.is_household_member(household_id));
create policy "members update own membership" on public.household_members
  for update using (user_id = auth.uid());
create policy "members leave household" on public.household_members
  for delete using (user_id = auth.uid());

-- Same policy shape for every household-scoped table.
do $$
declare
  t text;
begin
  foreach t in array array['recipes', 'meals', 'meal_dishes', 'meal_plan_entries', 'grocery_lists', 'grocery_items']
  loop
    execute format(
      'create policy "household access" on public.%I for all
         using (public.is_household_member(household_id))
         with check (public.is_household_member(household_id))',
      t
    );
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Storage: uploaded recipe cards and photos, stored under <household_id>/...
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('recipe-files', 'recipe-files', false)
on conflict (id) do nothing;

create policy "household files read" on storage.objects
  for select using (
    bucket_id = 'recipe-files'
    and public.is_household_member(((storage.foldername(name))[1])::uuid)
  );
create policy "household files write" on storage.objects
  for insert with check (
    bucket_id = 'recipe-files'
    and public.is_household_member(((storage.foldername(name))[1])::uuid)
  );
create policy "household files delete" on storage.objects
  for delete using (
    bucket_id = 'recipe-files'
    and public.is_household_member(((storage.foldername(name))[1])::uuid)
  );

-- ---------------------------------------------------------------------------
-- Realtime: grocery list check-offs show up live on everyone's phone
-- ---------------------------------------------------------------------------

alter publication supabase_realtime add table public.grocery_items;
