import { formatQuantity, scaleFactor, scaleIngredients, scaleSteps } from "@/lib/quantity";
import type { Recipe } from "@/lib/types";

export function IngredientList({ recipe, servings }: { recipe: Recipe; servings: number }) {
  const ings = scaleIngredients(recipe.ingredients, scaleFactor(recipe.base_servings, servings));
  return (
    <ul className="divide-y divide-line">
      {ings.map((i, idx) => (
        <li key={idx} className="flex gap-3 py-2 text-sm">
          <span className="w-20 shrink-0 text-right font-medium tabular-nums">
            {formatQuantity(i.quantity, i.unit)} {i.unit}
          </span>
          <span className="min-w-0">
            {i.name}
            {i.note && <span className="text-muted"> — {i.note}</span>}
            {i.pantry && <span className="ml-2 chip">pantry</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function StepList({ recipe, servings }: { recipe: Recipe; servings: number }) {
  const steps = scaleSteps(recipe.steps, scaleFactor(recipe.base_servings, servings));
  return (
    <ol className="space-y-4">
      {steps.map((s, i) => (
        <li key={i} className="flex gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent">{i + 1}</span>
          <div className="pt-0.5">
            {s.title && <p className="font-semibold">{s.title}</p>}
            <p className="text-[15px] leading-relaxed">{s.text}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
