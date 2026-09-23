import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ClockIcon, PlusIcon } from "@/components/icons";
import { ConfirmButton } from "@/components/confirm-button";
import { PlanAndListForms } from "@/components/plan-and-list-forms";
import { IngredientList, StepList } from "@/components/recipe-body";
import { ServingsPicker, parseServes } from "@/components/servings-picker";
import { getLists, getMeal, listRecipes } from "@/lib/data";
import { requireHousehold } from "@/lib/session";
import { BUCKET } from "@/lib/supabase/env";
import { DISH_ROLES } from "@/lib/types";
import { addDishToMeal, deleteMeal, removeDishFromMeal } from "../../actions";

export async function generateMetadata(props: PageProps<"/meals/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const { supabase } = await requireHousehold();
  const meal = await getMeal(supabase, id);
  return { title: meal?.title ?? "Meal" };
}

export default async function MealPage(props: PageProps<"/meals/[id]">) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  const { supabase, household } = await requireHousehold();
  const [meal, lists, allRecipes] = await Promise.all([getMeal(supabase, id), getLists(supabase), listRecipes(supabase)]);
  if (!meal) notFound();
  const servings = parseServes(sp.serves, household.default_servings);

  const signed = meal.source_files.length
    ? (await supabase.storage.from(BUCKET).createSignedUrls(meal.source_files, 60 * 60)).data ?? []
    : [];
  const image = meal.image_path ? signed.find((s) => s.path === meal.image_path)?.signedUrl : null;
  const inMeal = new Set(meal.dishes.map((d) => d.recipe_id));

  return (
    <article className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-3">
        {image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" className="aspect-[16/9] w-full rounded-2xl object-cover" />
        )}
        <div>
          <h1 className="font-display text-3xl font-bold leading-tight">{meal.title}</h1>
          {meal.subtitle && <p className="text-lg text-muted">{meal.subtitle}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {meal.total_minutes && <span className="chip gap-1"><ClockIcon className="h-3 w-3" />{meal.total_minutes} min</span>}
          {meal.source && <span className="chip">{meal.source}{meal.source_ref ? ` · ${meal.source_ref}` : ""}</span>}
          {meal.tags.map((t) => <span key={t} className="chip">{t}</span>)}
        </div>
      </header>

      <ServingsPicker current={servings} basePath={`/meals/${id}`} />

      {meal.notes && <p className="whitespace-pre-line rounded-xl bg-accent-soft p-4 text-sm">{meal.notes}</p>}

      {meal.dishes.map((d) => (
        <section key={d.recipe_id} className="card overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-line bg-surface-2/60 px-4 py-3">
            <div>
              <span className="chip mr-2">{d.role}</span>
              <Link href={`/recipes/${d.recipe_id}?serves=${servings}`} className="font-display text-lg font-semibold hover:text-accent">
                {d.recipe.title}
              </Link>
            </div>
            <form action={removeDishFromMeal.bind(null, meal.id, d.recipe_id)}>
              <ConfirmButton message="Remove this dish from the meal? The dish stays in your library." className="btn-ghost px-2 py-1 text-xs">
                Remove
              </ConfirmButton>
            </form>
          </div>
          <div className="grid gap-6 p-4 md:grid-cols-[2fr_3fr]">
            <IngredientList recipe={d.recipe} servings={servings} />
            <StepList recipe={d.recipe} servings={servings} />
          </div>
        </section>
      ))}

      <PlanAndListForms target={`meal:${meal.id}`} servings={servings} lists={lists} />

      <details className="card p-4">
        <summary className="cursor-pointer font-semibold">Add a dish to this meal</summary>
        <form action={addDishToMeal.bind(null, meal.id)} className="mt-3 flex flex-wrap gap-2">
          <select name="recipe_id" className="input flex-1" required defaultValue="">
            <option value="" disabled>Choose from your dishes…</option>
            {allRecipes.filter((r) => !inMeal.has(r.id)).map((r) => (
              <option key={r.id} value={r.id}>{r.title}</option>
            ))}
          </select>
          <select name="role" className="input w-auto" defaultValue="side">
            {DISH_ROLES.map((r) => <option key={r}>{r}</option>)}
          </select>
          <button className="btn-primary">Add</button>
        </form>
        <Link href={`/recipes/new?meal=${meal.id}`} className="btn-ghost mt-2 px-0"><PlusIcon className="h-4 w-4" /> Or write a new dish</Link>
      </details>

      {signed.length > 0 && (
        <p className="text-sm text-muted">
          Original:{" "}
          {signed.map((s, i) => (
            <a key={s.path ?? String(i)} href={s.signedUrl ?? undefined} target="_blank" rel="noreferrer" className="mr-3 text-accent underline">
              {s.path?.toLowerCase().endsWith(".pdf") ? "recipe card (PDF)" : `photo ${i + 1}`}
            </a>
          ))}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Link href={`/meals/${id}/edit`} className="btn-secondary">Edit meal</Link>
        <form action={deleteMeal.bind(null, id, false)}>
          <ConfirmButton message="Delete this meal? Its dishes stay in your library." className="btn-danger">Delete meal</ConfirmButton>
        </form>
        <form action={deleteMeal.bind(null, id, true)}>
          <ConfirmButton message="Delete this meal and its dishes? Dishes used by other meals are kept." className="btn-danger">Delete meal and dishes</ConfirmButton>
        </form>
      </div>
    </article>
  );
}
