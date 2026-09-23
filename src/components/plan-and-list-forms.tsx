import { addToGroceryList, addToPlan } from "@/app/(app)/actions";
import { today } from "@/lib/dates";
import type { GroceryList } from "@/lib/types";
import { CalendarIcon, CartIcon } from "./icons";

/** "Add to plan" and "Add to grocery list" for a meal or a single dish. */
export function PlanAndListForms({ target, servings, lists }: { target: string; servings: number; lists: GroceryList[] }) {
  const open = lists.filter((l) => !l.archived);
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <form action={addToPlan} className="card space-y-2 p-4">
        <input type="hidden" name="target" value={target} />
        <input type="hidden" name="servings" value={servings} />
        <input type="hidden" name="redirect" value="plan" />
        <p className="flex items-center gap-2 font-semibold"><CalendarIcon className="h-5 w-5 text-accent" /> Add to meal plan</p>
        <div className="flex gap-2">
          <input className="input" type="date" name="date" defaultValue={today()} required />
          <button className="btn-primary shrink-0">Add</button>
        </div>
        <p className="text-xs text-muted">Planned for {servings}.</p>
      </form>
      <form action={addToGroceryList} className="card space-y-2 p-4">
        <input type="hidden" name="target" value={target} />
        <input type="hidden" name="servings" value={servings} />
        <p className="flex items-center gap-2 font-semibold"><CartIcon className="h-5 w-5 text-accent" /> Add to grocery list</p>
        <div className="flex gap-2">
          <select className="input" name="list_id" defaultValue={open[0]?.id ?? "new"}>
            {open.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
            <option value="new">+ New list</option>
          </select>
          <button className="btn-primary shrink-0">Add</button>
        </div>
        <label className="flex items-center gap-2 text-xs text-muted">
          <input type="checkbox" name="include_pantry" /> Include pantry staples (oil, salt, sugar…)
        </label>
      </form>
    </div>
  );
}
