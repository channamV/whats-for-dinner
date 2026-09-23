import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { CartIcon } from "@/components/icons";
import { getLists, getPlan, listMeals, listRecipes } from "@/lib/data";
import { addDays, formatDay, isIsoDate, today, weekDates, weekStart } from "@/lib/dates";
import { requireHousehold } from "@/lib/session";
import { addToPlan, groceryListFromPlan } from "../actions";
import { EntryControls } from "./entry-controls";
import { SuggestPanel } from "./suggest-panel";

export const metadata: Metadata = { title: "Meal plan" };

export default async function PlanPage(props: PageProps<"/plan">) {
  const sp = await props.searchParams;
  const now = today();
  const start = weekStart(isIsoDate(sp.week) ? sp.week : now);
  const dates = weekDates(start);
  const { supabase, household } = await requireHousehold();
  const [entries, meals, recipes, lists] = await Promise.all([
    getPlan(supabase, dates[0], dates[6]),
    listMeals(supabase),
    listRecipes(supabase),
    getLists(supabase),
  ]);
  const dayLabels = Object.fromEntries(dates.map((d) => [d, formatDay(d, { weekday: "long" })]));

  return (
    <>
      <PageHeader
        title="Meal plan"
        subtitle={`${formatDay(dates[0], { month: "long", day: "numeric" })} – ${formatDay(dates[6], { month: "long", day: "numeric" })}`}
        actions={
          <div className="flex gap-1">
            <Link href={`/plan?week=${addDays(start, -7)}`} className="btn-secondary px-3">‹ Prev</Link>
            <Link href="/plan" className="btn-secondary px-3">This week</Link>
            <Link href={`/plan?week=${addDays(start, 7)}`} className="btn-secondary px-3">Next ›</Link>
          </div>
        }
      />

      <div className="mb-5">
        <SuggestPanel weekStart={start} dayLabels={dayLabels} />
      </div>

      <ol className="space-y-3">
        {dates.map((date) => {
          const day = entries.filter((e) => e.plan_date === date);
          const isToday = date === now;
          return (
            <li key={date} className={`card p-4 ${isToday ? "border-accent" : ""}`}>
              <div className="mb-2 flex items-baseline justify-between">
                <h2 className="font-semibold">
                  {formatDay(date, { weekday: "long" })}{" "}
                  <span className="font-normal text-muted">{formatDay(date, { month: "short", day: "numeric" })}</span>
                </h2>
                {isToday && <span className="chip bg-accent-soft text-accent">Today</span>}
              </div>
              {day.length > 0 && (
                <ul className="mb-3 space-y-2">
                  {day.map((e) => {
                    const title = e.meal?.title ?? e.recipe?.title ?? e.note;
                    const href = e.meal ? `/meals/${e.meal.id}?serves=${e.servings}` : e.recipe ? `/recipes/${e.recipe.id}?serves=${e.servings}` : null;
                    return (
                      <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface-2/60 px-3 py-2">
                        {href ? (
                          <Link href={href} className={`font-medium hover:text-accent ${e.cooked ? "text-muted line-through" : ""}`}>{title}</Link>
                        ) : (
                          <span className="font-medium">{title}</span>
                        )}
                        <EntryControls id={e.id} servings={e.servings} cooked={e.cooked} />
                      </li>
                    );
                  })}
                </ul>
              )}
              <form action={addToPlan} className="flex flex-wrap gap-2">
                <input type="hidden" name="date" value={date} />
                <select name="target" className="input min-w-0 flex-1 py-1.5 text-sm" defaultValue="">
                  <option value="">{day.length ? "Add another…" : "What's for dinner?"}</option>
                  {meals.length > 0 && (
                    <optgroup label="Meals">
                      {meals.map((m) => <option key={m.id} value={`meal:${m.id}`}>{m.favorite ? "★ " : ""}{m.title}</option>)}
                    </optgroup>
                  )}
                  {recipes.length > 0 && (
                    <optgroup label="Dishes">
                      {recipes.map((r) => <option key={r.id} value={`recipe:${r.id}`}>{r.favorite ? "★ " : ""}{r.title}</option>)}
                    </optgroup>
                  )}
                </select>
                <input name="note" className="input w-32 py-1.5 text-sm" placeholder="or a note" />
                <select name="servings" className="input w-auto py-1.5 text-sm" defaultValue={household.default_servings}>
                  {[1, 2, 3, 4, 5, 6, 8, 10].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
                <button className="btn-secondary py-1.5">Add</button>
              </form>
            </li>
          );
        })}
      </ol>

      <form action={groceryListFromPlan} className="card mt-5 space-y-3 p-4">
        <input type="hidden" name="from" value={dates[0]} />
        <input type="hidden" name="to" value={dates[6]} />
        <p className="flex items-center gap-2 font-semibold"><CartIcon className="h-5 w-5 text-accent" /> Grocery list for this week</p>
        <p className="text-sm text-muted">Adds everything not yet cooked, scaled to each night&apos;s table size and combined.</p>
        <div className="flex flex-wrap gap-2">
          <select name="list_id" className="input w-auto flex-1" defaultValue="new">
            <option value="new">New list</option>
            {lists.filter((l) => !l.archived).map((l) => <option key={l.id} value={l.id}>Add to: {l.name}</option>)}
          </select>
          <button className="btn-primary" disabled={!entries.length}>Build list</button>
        </div>
        <label className="flex items-center gap-2 text-xs text-muted">
          <input type="checkbox" name="include_pantry" /> Include pantry staples
        </label>
      </form>
    </>
  );
}
