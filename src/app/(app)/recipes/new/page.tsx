import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { RecipeForm } from "@/components/recipe-form";

export const metadata: Metadata = { title: "New dish" };

export default async function NewRecipePage(props: PageProps<"/recipes/new">) {
  const { meal } = await props.searchParams;
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="New dish" subtitle={meal ? "It will be added to the meal." : "Type it in, or import a PDF or photo instead."} />
      <RecipeForm mealId={typeof meal === "string" ? meal : undefined} />
    </div>
  );
}
