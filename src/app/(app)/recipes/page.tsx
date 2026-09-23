import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { ClockIcon, PlusIcon, UploadIcon } from "@/components/icons";
import { listMeals, listRecipes } from "@/lib/data";
import { requireHousehold } from "@/lib/session";

export const metadata: Metadata = { title: "Recipes" };

export default async function RecipesPage(props: PageProps<"/recipes">) {
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const tab = sp.tab === "dishes" ? "dishes" : "meals";
  const { supabase } = await requireHousehold();
  const [meals, recipes] = await Promise.all([listMeals(supabase, q), listRecipes(supabase, q)]);

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
        <input className="input" name="q" defaultValue={q} placeholder="Search recipes…" type="search" />
        <button className="btn-secondary">Search</button>
      </form>

      <div className="mb-4 flex gap-1 rounded-xl bg-surface-2 p-1 text-sm">
        {(["meals", "dishes"] as const).map((t) => (
          <Link
            key={t}
            href={`/recipes?tab=${t}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
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
              <li key={m.id}>
                <Link href={`/meals/${m.id}`} className="card block h-full p-4 hover:border-accent">
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
          <Empty q={q} />
        )
      ) : recipes.length ? (
        <ul className="card divide-y divide-line">
          {recipes.map((r) => (
            <li key={r.id}>
              <Link href={`/recipes/${r.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-surface-2">
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
        <Empty q={q} />
      )}
    </>
  );
}

function Empty({ q }: { q: string }) {
  return (
    <div className="card p-8 text-center">
      {q ? (
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
