-- Favourites: a household-wide star on meals and individual dishes.
alter table public.meals add column if not exists favorite boolean not null default false;
alter table public.recipes add column if not exists favorite boolean not null default false;

create index if not exists meals_favorite_idx on public.meals(household_id) where favorite;
create index if not exists recipes_favorite_idx on public.recipes(household_id) where favorite;
