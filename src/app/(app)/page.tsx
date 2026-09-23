import Link from "next/link";
import { CalendarIcon, CartIcon, ClockIcon, UploadIcon } from "@/components/icons";
import { getLists, getPlan } from "@/lib/data";
import { addDays, formatDay, today } from "@/lib/dates";
import { requireHousehold } from "@/lib/session";

export default async function HomePage() {
  const { supabase, displayName } = await requireHousehold();
  const now = today();
  const [upcoming, lists] = await Promise.all([getPlan(supabase, now, addDays(now, 6)), getLists(supabase)]);
  const tonight = upcoming.filter((e) => e.plan_date === now);
  const later = upcoming.filter((e) => e.plan_date !== now);
  const openLists = lists.filter((l) => !l.archived).slice(0, 3);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-muted">{formatDay(now, { weekday: "long", month: "long", day: "numeric" })}</p>
        <h1 className="font-display text-4xl font-bold">{displayName ? `Hi ${displayName}.` : "What's for dinner?"}</h1>
      </div>

      <section className="card overflow-hidden">
        <div className="bg-accent px-5 py-4 text-accent-ink">
          <p className="text-sm opacity-80">Tonight</p>
          {tonight.length ? (
            tonight.map((e) => {
              const title = e.meal?.title ?? e.recipe?.title ?? e.note;
              const href = e.meal ? `/meals/${e.meal.id}?serves=${e.servings}` : e.recipe ? `/recipes/${e.recipe.id}?serves=${e.servings}` : "/plan";
              const minutes = e.meal?.total_minutes ?? e.recipe?.total_minutes;
              return (
                <Link key={e.id} href={href} className="block py-1">
                  <span className="font-display text-2xl font-semibold">{title}</span>
                  <span className="mt-1 flex items-center gap-3 text-sm opacity-90">
                    <span>Feeds {e.servings}</span>
                    {minutes && <span className="flex items-center gap-1"><ClockIcon className="h-4 w-4" />{minutes} min</span>}
                  </span>
                </Link>
              );
            })
          ) : (
            <p className="font-display text-2xl font-semibold">Nothing planned yet</p>
          )}
        </div>
        {!tonight.length && (
          <div className="flex flex-wrap gap-2 p-4">
            <Link href="/plan" className="btn-primary"><CalendarIcon className="h-4 w-4" /> Plan the week</Link>
            <Link href="/recipes" className="btn-secondary">Browse recipes</Link>
          </div>
        )}
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="card p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold">Coming up</h2>
            <Link href="/plan" className="text-sm text-accent">Full plan</Link>
          </div>
          {later.length ? (
            <ul className="divide-y divide-line">
              {later.map((e) => (
                <li key={e.id} className="flex justify-between gap-3 py-2 text-sm">
                  <span className="text-muted">{formatDay(e.plan_date, { weekday: "short" })}</span>
                  <span className="truncate text-right">{e.meal?.title ?? e.recipe?.title ?? e.note}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Nothing else planned this week.</p>
          )}
        </section>

        <section className="card p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold">Grocery lists</h2>
            <Link href="/lists" className="text-sm text-accent">All lists</Link>
          </div>
          {openLists.length ? (
            <ul className="space-y-1">
              {openLists.map((l) => (
                <li key={l.id}>
                  <Link href={`/lists/${l.id}`} className="flex items-center justify-between rounded-lg px-2 py-2 text-sm hover:bg-surface-2">
                    <span className="flex items-center gap-2"><CartIcon className="h-4 w-4 text-accent" />{l.name}</span>
                    <span className="text-muted">{l.items.filter((i) => !i.checked).length} left</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">No open lists.</p>
          )}
        </section>
      </div>

      <Link href="/recipes/import" className="card flex items-center gap-3 p-4 hover:border-accent">
        <UploadIcon className="h-6 w-6 text-accent" />
        <span>
          <span className="block font-medium">Import a recipe card</span>
          <span className="block text-sm text-muted">Upload a HelloFresh PDF or a photo; the AI does the typing.</span>
        </span>
      </Link>
    </div>
  );
}
