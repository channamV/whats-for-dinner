import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { ClockIcon, PlusIcon, StarIcon, UploadIcon } from "@/components/icons";
import { FavoriteButton } from "@/components/favorite-button";
import { listMeals, listRecipes } from "@/lib/data";
import { requireHousehold } from "@/lib/session";

export const metadata: Metadata = { title: "Recipes" };

export default async function RecipesPage(props: PageProps<"/recipes">) {
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const tab = sp.tab === "dishes" ? "dishes" : "meals";
  const fav = sp.fav === "1";
  const { supabase } = await requireHousehold();
  const [meals, recipes] = await Promise.all([
    listMeals(supabase, { q, favoritesOnly: fav }),
    listRecipes(supabase, { q, favoritesOnly: fav }),
  ]);
  const href = (next: { tab?: string; fav?: boolean }) => {
    const params = new URLSearchParams({ tab: next.tab ?? tab });
    if (q) params.set("q", q);
    if (next.fav ?? fav) params.set("fav", "1");
    return `/recipes?${params}`;
  };

  return (
    <>
      <PageHeader
        title="Recipes"
        subtitle={`${meals.length} meals · ${recipes.length} dishes`}
        actions={
          <>
            <Link href="/recipes/import" className="btn-primary"><UploadIcon className="h-4 w-4" /> Import</Link>
            <Link href="/recipes/new" className="btn-secondary"><PlusIcon className="h-4 w-4" /> New dish</Link>
          </>
        }
      />

      <form className="mb-4 flex gap-2">
        <input type="hidden" name="tab" value={tab} />
        {fav && <input type="hidden" name="fav" value="1" />}
        <input className="input" name="q" defaultValue={q} placeholder="Search recipes…" type="search" />
        <button className="btn-secondary">Search</button>
        <Link
          href={href({ fav: !fav })}
          aria-pressed={fav}
          className={`btn shrink-0 border ${fav ? "border-amber-400 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" : "border-line bg-surface text-muted hover:text-ink"}`}
        >
          <StarIcon className="h-4 w-4" filled={fav} />
          <span className="hidden sm:inline">Favourites</span>
        </Link>
      </form>

      <div className="mb-4 flex gap-1 rounded-xl bg-surface-2 p-1 text-sm">
        {(["meals", "dishes"] as const).map((t) => (
          <Link
            key={t}
            href={href({ tab: t })}
            className={`flex-1 rounded-lg py-1.5 text-center ${tab === t ? "bg-surface font-medium shadow-sm" : "text-muted"}`}
          >
            {t === "meals" ? `Meals (${meals.length})` : `Dishes (${recipes.length})`}
          </Link>
        ))}
      </div>

      {tab === "meals" ? (
        meals.length ? (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {meals.map((m) => (
              <li key={m.id} className="relative">
                <FavoriteButton kind="meal" id={m.id} favorite={m.favorite} className="absolute right-2 top-2 z-10" />
                <Link href={`/meals/${m.id}`} className="card block h-full p-4 pr-11 hover:border-accent">
                  <p className="font-display text-lg font-semibold leading-snug">{m.title}</p>
                  {m.subtitle && <p className="text-sm text-muted">{m.subtitle}</p>}
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    {m.total_minutes && <span className="chip gap-1"><ClockIcon className="h-3 w-3" />{m.total_minutes} min</span>}
                    <span className="chip">{m.dishes[0]?.count ?? 0} dishes</span>
                    {m.tags.slice(0, 3).map((t) => <span key={t} className="chip">{t}</span>)}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <Empty q={q} fav={fav} />
        )
      ) : recipes.length ? (
        <ul className="card divide-y divide-line">
          {recipes.map((r) => (
            <li key={r.id} className="flex items-center gap-1 pl-2">
              <FavoriteButton kind="recipe" id={r.id} favorite={r.favorite} />
              <Link href={`/recipes/${r.id}`} className="flex min-w-0 flex-1 items-center justify-between gap-3 py-3 pl-1 pr-4 hover:bg-surface-2">
                <span className="min-w-0">
                  <span className="block truncate font-medium">{r.title}</span>
                  <span className="block truncate text-sm text-muted">{r.tags.join(" · ") || r.description}</span>
                </span>
                {r.total_minutes && <span className="shrink-0 text-sm text-muted">{r.total_minutes} min</span>}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <Empty q={q} fav={fav} />
      )}
    </>
  );
}

function Empty({ q, fav }: { q: string; fav: boolean }) {
  return (
    <div className="card p-8 text-center">
      {fav ? (
        <p className="text-muted">
          No favourites{q ? <> matching &ldquo;{q}&rdquo;</> : ""} yet. Tap the <StarIcon className="inline h-4 w-4 align-[-2px]" /> on a
          meal or dish to add it here.
        </p>
      ) : q ? (
        <p className="text-muted">Nothing matches &ldquo;{q}&rdquo;.</p>
      ) : (
        <>
          <p className="font-medium">No recipes yet</p>
          <p className="mb-4 text-sm text-muted">Start by importing a HelloFresh card or any recipe saved as a PDF.</p>
          <Link href="/recipes/import" className="btn-primary"><UploadIcon className="h-4 w-4" /> Import a recipe</Link>
        </>
      )}
    </div>
  );
}
