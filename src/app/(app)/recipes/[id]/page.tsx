import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ClockIcon } from "@/components/icons";
import { PlanAndListForms } from "@/components/plan-and-list-forms";
import { IngredientList, StepList } from "@/components/recipe-body";
import { ServingsPicker, parseServes } from "@/components/servings-picker";
import { ConfirmButton } from "@/components/confirm-button";
import { FavoriteButton } from "@/components/favorite-button";
import { getLists, getRecipe } from "@/lib/data";
import { signedFileLinks } from "@/lib/files";
import { OriginalLinks } from "@/components/original-links";
import { requireHousehold } from "@/lib/session";
import { deleteRecipe } from "../../actions";

export async function generateMetadata(props: PageProps<"/recipes/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const { supabase } = await requireHousehold();
  const r = await getRecipe(supabase, id);
  return { title: r?.title ?? "Recipe" };
}

export default async function RecipePage(props: PageProps<"/recipes/[id]">) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  const { supabase, household } = await requireHousehold();
  const [recipe, lists] = await Promise.all([getRecipe(supabase, id), getLists(supabase)]);
  if (!recipe) notFound();
  const servings = parseServes(sp.serves, household.default_servings);
  const originals = await signedFileLinks(supabase, recipe.source_files ?? []);

  return (
    <article className="mx-auto max-w-3xl space-y-6">
      <header>
        {recipe.meals.filter((m) => m.meal).map((m) => (
          <Link key={m.meal!.id} href={`/meals/${m.meal!.id}`} className="text-sm text-accent">
            ← {m.meal!.title}
          </Link>
        ))}
        <div className="flex items-start justify-between gap-3">
          <h1 className="font-display text-3xl font-bold leading-tight">{recipe.title}</h1>
          <FavoriteButton kind="recipe" id={recipe.id} favorite={recipe.favorite} withLabel className="mt-1 shrink-0" />
        </div>
        {recipe.description && <p className="mt-1 text-muted">{recipe.description}</p>}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {recipe.total_minutes && <span className="chip gap-1"><ClockIcon className="h-3 w-3" />{recipe.total_minutes} min</span>}
          {recipe.tags.map((t) => <span key={t} className="chip">{t}</span>)}
        </div>
      </header>

      <ServingsPicker current={servings} basePath={`/recipes/${id}`} />

      <section className="card p-4">
        <h2 className="mb-1 font-semibold">Ingredients</h2>
        <IngredientList recipe={recipe} servings={servings} />
      </section>

      {recipe.steps.length > 0 && (
        <section>
          <h2 className="mb-3 font-semibold">Method</h2>
          <StepList recipe={recipe} servings={servings} />
        </section>
      )}

      {recipe.equipment.length > 0 && <p className="text-sm text-muted">You&apos;ll need: {recipe.equipment.join(", ")}</p>}
      {recipe.notes && <p className="whitespace-pre-line rounded-xl bg-surface-2 p-4 text-sm">{recipe.notes}</p>}

      <OriginalLinks links={originals} />

      <PlanAndListForms target={`recipe:${recipe.id}`} servings={servings} lists={lists} />

      <div className="flex gap-2">
        <Link href={`/recipes/${id}/edit`} className="btn-secondary">Edit</Link>
        <form action={deleteRecipe.bind(null, id)}>
          <ConfirmButton message="Delete this dish? It will be removed from any meals too." className="btn-danger">Delete</ConfirmButton>
        </form>
      </div>
    </article>
  );
}
