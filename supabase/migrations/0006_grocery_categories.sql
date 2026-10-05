-- Remembers which aisle each grocery item belongs in, per household, so items
-- typed into a list are sorted automatically. Filled in by the AI the first time
-- an item is seen, and overwritten whenever someone changes an item's aisle.
create table if not exists public.grocery_item_categories (
  household_id uuid not null references public.households(id) on delete cascade,
  name_key text not null,
  category text not null check (category in ('produce','meat','seafood','dairy','bakery','pantry','spices','frozen','other')),
  source text not null default 'user' check (source in ('user', 'ai')),
  updated_at timestamptz not null default now(),
  primary key (household_id, name_key)
);

alter table public.grocery_item_categories enable row level security;

drop policy if exists "household access" on public.grocery_item_categories;
create policy "household access" on public.grocery_item_categories for all
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));
