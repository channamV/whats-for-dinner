"use client";

import { useState } from "react";
import { CATEGORIES, DISH_ROLES, type Category, type DishRole, type Ingredient, type Step } from "@/lib/types";
import { PlusIcon, TrashIcon } from "./icons";

export type DishDraft = {
  id?: string;
  title: string;
  role: DishRole;
  description: string | null;
  base_servings: number;
  total_minutes: number | null;
  tags: string[];
  equipment: string[];
  ingredients: Ingredient[];
  steps: Step[];
  notes?: string | null;
};

export const emptyIngredient = (): Ingredient => ({
  name: "",
  quantity: null,
  unit: null,
  note: null,
  scales: true,
  pantry: false,
  category: "produce",
});

export const emptyDish = (): DishDraft => ({
  title: "",
  role: "main",
  description: null,
  base_servings: 2,
  total_minutes: null,
  tags: [],
  equipment: [],
  ingredients: [emptyIngredient()],
  steps: [{ title: null, text: "" }],
  notes: null,
});

function numOrNull(v: string): number | null {
  if (v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Keeps its own text so partial input like "0." or "1/" isn't wiped while typing. */
function QtyInput({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  const [text, setText] = useState(value == null ? "" : String(value));
  return (
    <input
      className="input px-2"
      inputMode="decimal"
      placeholder="Qty"
      aria-label="Quantity"
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        const t = e.target.value.trim();
        const frac = t.match(/^(\d+)\/(\d+)$/);
        onChange(frac ? Number(frac[1]) / Number(frac[2]) : numOrNull(t));
      }}
    />
  );
}

let keySeq = 0;
const make = () => `row${keySeq++}`;

/** Stable React keys for rows that can be added and removed. */
function useRowKeys(length: number) {
  const [keys, setKeys] = useState(() => Array.from({ length }, make));
  const current = keys.length === length ? keys : Array.from({ length }, (_, i) => keys[i] ?? make());
  return {
    keys: current,
    add: () => setKeys([...current, make()]),
    remove: (i: number) => setKeys(current.filter((_, j) => j !== i)),
  };
}

export function DishEditor({
  dish,
  onChange,
  showRole = true,
}: {
  dish: DishDraft;
  onChange: (d: DishDraft) => void;
  showRole?: boolean;
}) {
  const set = <K extends keyof DishDraft>(k: K, v: DishDraft[K]) => onChange({ ...dish, [k]: v });
  const setIng = (i: number, patch: Partial<Ingredient>) =>
    set("ingredients", dish.ingredients.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const setStep = (i: number, patch: Partial<Step>) => set("steps", dish.steps.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const ingKeys = useRowKeys(dish.ingredients.length);
  const stepKeys = useRowKeys(dish.steps.length);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
        <div>
          <label className="label">Dish name</label>
          <input className="input" value={dish.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Lime Crema" required />
        </div>
        {showRole && (
          <div>
            <label className="label">Part of meal</label>
            <select className="input" value={dish.role} onChange={(e) => set("role", e.target.value as DishRole)}>
              {DISH_ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="label">Serves</label>
          <input className="input w-20" type="number" min={1} max={24} value={dish.base_servings} onChange={(e) => set("base_servings", Number(e.target.value) || 1)} />
        </div>
        <div>
          <label className="label">Minutes</label>
          <input className="input w-24" type="number" min={0} value={dish.total_minutes ?? ""} onChange={(e) => set("total_minutes", numOrNull(e.target.value))} />
        </div>
      </div>

      <div>
        <label className="label">Tags (comma separated)</label>
        <input
          className="input"
          defaultValue={dish.tags.join(", ")}
          onBlur={(e) => set("tags", e.target.value.split(",").map((t) => t.trim()).filter(Boolean))}
          placeholder="veggie, quick, mexican"
        />
      </div>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h4 className="font-semibold">Ingredients <span className="font-normal text-muted">for {dish.base_servings}</span></h4>
        </div>
        <div className="space-y-2">
          {dish.ingredients.map((ing, i) => (
            <div key={ingKeys.keys[i]} className="rounded-xl border border-line bg-surface-2/50 p-2">
              <div className="grid grid-cols-[4.5rem_4.5rem_1fr_auto] gap-2">
                <QtyInput value={ing.quantity} onChange={(quantity) => setIng(i, { quantity })} />
                <input className="input px-2" placeholder="Unit" value={ing.unit ?? ""} onChange={(e) => setIng(i, { unit: e.target.value || null })} aria-label="Unit" />
                <input className="input" placeholder="Ingredient" value={ing.name} onChange={(e) => setIng(i, { name: e.target.value })} aria-label="Ingredient" />
                <button type="button" className="btn-ghost px-2" onClick={() => {
                    ingKeys.remove(i);
                    set("ingredients", dish.ingredients.filter((_, j) => j !== i));
                  }} aria-label="Remove ingredient">
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted">
                <input className="input max-w-56 py-1 text-xs" placeholder="Note (optional)" value={ing.note ?? ""} onChange={(e) => setIng(i, { note: e.target.value || null })} />
                <select className="input w-auto py-1 text-xs" value={ing.category} onChange={(e) => setIng(i, { category: e.target.value as Category })} aria-label="Aisle">
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <label className="flex items-center gap-1.5">
                  <input type="checkbox" checked={ing.pantry} onChange={(e) => setIng(i, { pantry: e.target.checked })} /> Pantry staple
                </label>
                <label className="flex items-center gap-1.5" title="Keep this amount the same whatever the table size">
                  <input type="checkbox" checked={!ing.scales} onChange={(e) => setIng(i, { scales: !e.target.checked })} /> Fixed amount
                </label>
              </div>
            </div>
          ))}
        </div>
        <button type="button" className="btn-ghost mt-2" onClick={() => {
            ingKeys.add();
            set("ingredients", [...dish.ingredients, emptyIngredient()]);
          }}>
          <PlusIcon className="h-4 w-4" /> Add ingredient
        </button>
      </section>

      <section>
        <h4 className="mb-1 font-semibold">Steps</h4>
        <p className="mb-2 text-xs text-muted">
          Amounts in double braces, like {"{{1 tbsp}}"}, change with the table size. Use {"{{=1 tsp}}"} for an amount that stays the same.
        </p>
        <div className="space-y-2">
          {dish.steps.map((s, i) => (
            <div key={stepKeys.keys[i]} className="flex gap-2">
              <span className="mt-2 w-5 shrink-0 text-right text-sm font-semibold text-muted">{i + 1}</span>
              <div className="flex-1 space-y-1">
                <input className="input py-1.5 text-sm font-medium" placeholder="Step title (optional)" value={s.title ?? ""} onChange={(e) => setStep(i, { title: e.target.value || null })} />
                <textarea className="input min-h-20 text-sm" value={s.text} onChange={(e) => setStep(i, { text: e.target.value })} />
              </div>
              <button type="button" className="btn-ghost self-start px-2" onClick={() => {
                  stepKeys.remove(i);
                  set("steps", dish.steps.filter((_, j) => j !== i));
                }} aria-label="Remove step">
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        <button type="button" className="btn-ghost mt-2" onClick={() => {
            stepKeys.add();
            set("steps", [...dish.steps, { title: null, text: "" }]);
          }}>
          <PlusIcon className="h-4 w-4" /> Add step
        </button>
      </section>

      <div>
        <label className="label">Notes</label>
        <textarea className="input min-h-16 text-sm" value={dish.notes ?? ""} onChange={(e) => set("notes", e.target.value || null)} placeholder="Family tweaks, substitutions…" />
      </div>
    </div>
  );
}
