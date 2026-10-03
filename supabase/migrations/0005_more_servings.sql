-- Allow table sizes up to 100 (the app offers 1-12 in a list and a box for anything bigger).
alter table public.households drop constraint if exists households_default_servings_check;
alter table public.households add constraint households_default_servings_check check (default_servings between 1 and 100);

alter table public.recipes drop constraint if exists recipes_base_servings_check;
alter table public.recipes add constraint recipes_base_servings_check check (base_servings between 1 and 100);

alter table public.meal_plan_entries drop constraint if exists meal_plan_entries_servings_check;
alter table public.meal_plan_entries add constraint meal_plan_entries_servings_check check (servings between 1 and 100);
