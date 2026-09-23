-- Dishes remember the original card/photo they were imported from, so each
-- dish can link back to it and files are kept for as long as anything uses them.
alter table public.recipes add column if not exists source_files text[] not null default '{}';

-- Existing dishes inherit the files of the meal they were imported with.
update public.recipes r
set source_files = m.source_files
from public.meal_dishes md
join public.meals m on m.id = md.meal_id
where md.recipe_id = r.id
  and r.source_files = '{}'
  and m.source_files <> '{}';

create index if not exists recipes_source_files_idx on public.recipes using gin (source_files);
create index if not exists meals_source_files_idx on public.meals using gin (source_files);
