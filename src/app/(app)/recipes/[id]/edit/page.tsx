import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { RecipeForm } from "@/components/recipe-form";
import { getRecipe } from "@/lib/data";
import { requireHousehold } from "@/lib/session";
import type { DishRole } from "@/lib/types";

export const metadata: Metadata = { title: "Edit dish" };

export default async function EditRecipePage(props: PageProps<"/recipes/[id]/edit">) {
  const { id } = await props.params;
  const { supabase } = await requireHousehold();
  const r = await getRecipe(supabase, id);
  if (!r) notFound();
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={`Edit ${r.title}`} />
      <RecipeForm
        initial={{
          id: r.id,
          title: r.title,
          role: (r.meals[0]?.role as DishRole) ?? "main",
          description: r.description,
          base_servings: r.base_servings,
          total_minutes: r.total_minutes,
          tags: r.tags,
          equipment: r.equipment,
          ingredients: r.ingredients,
          steps: r.steps,
          notes: r.notes,
        }}
      />
    </div>
  );
}
