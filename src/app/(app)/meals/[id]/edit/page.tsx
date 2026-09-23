import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { getMeal } from "@/lib/data";
import { requireHousehold } from "@/lib/session";
import { updateMeal } from "../../../actions";

export const metadata: Metadata = { title: "Edit meal" };

export default async function EditMealPage(props: PageProps<"/meals/[id]/edit">) {
  const { id } = await props.params;
  const { supabase } = await requireHousehold();
  const meal = await getMeal(supabase, id);
  if (!meal) notFound();
  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Edit meal" subtitle="To change a dish, open it from the meal page." />
      <form action={updateMeal.bind(null, id)} className="card space-y-3 p-4">
        <div>
          <label className="label">Name</label>
          <input className="input" name="title" defaultValue={meal.title} required />
        </div>
        <div>
          <label className="label">Subtitle</label>
          <input className="input" name="subtitle" defaultValue={meal.subtitle ?? ""} />
        </div>
        <div className="grid grid-cols-[8rem_1fr] gap-3">
          <div>
            <label className="label">Minutes</label>
            <input className="input" name="total_minutes" type="number" defaultValue={meal.total_minutes ?? ""} />
          </div>
          <div>
            <label className="label">Tags</label>
            <input className="input" name="tags" defaultValue={meal.tags.join(", ")} />
          </div>
        </div>
        <div>
          <label className="label">Notes</label>
          <textarea className="input min-h-24" name="notes" defaultValue={meal.notes ?? ""} />
        </div>
        <button className="btn-primary">Save</button>
      </form>
    </div>
  );
}
