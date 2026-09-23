"use client";

import { useState, useTransition } from "react";
import { saveRecipe } from "@/app/(app)/actions";
import { DishEditor, emptyDish, type DishDraft } from "./dish-editor";

export function RecipeForm({ initial, mealId }: { initial?: DishDraft; mealId?: string }) {
  const [dish, setDish] = useState<DishDraft>(initial ?? emptyDish());
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const res = await saveRecipe({ ...dish, notes: dish.notes ?? null, mealId });
          if (res?.error) setError(res.error);
        });
      }}
    >
      <div className="card p-4">
        <DishEditor dish={dish} onChange={setDish} showRole={Boolean(mealId)} />
      </div>
      {error && <p className="rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn">{error}</p>}
      <button className="btn-primary" disabled={pending}>{pending ? "Saving…" : "Save dish"}</button>
    </form>
  );
}
