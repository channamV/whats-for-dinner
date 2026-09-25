import type { Category, Ingredient } from "./types";
import { scaleIngredients, scaleFactor } from "./quantity";

export type GroceryLine = {
  name: string;
  quantity: number | null;
  unit: string | null;
  category: Category;
  store: string | null;
  sources: string[];
  pantry: boolean;
};

type UnitInfo = { family: "mass" | "volume" | "count"; toBase: number; canonical: string };

const UNITS: Record<string, UnitInfo> = {
  g: { family: "mass", toBase: 1, canonical: "g" },
  gram: { family: "mass", toBase: 1, canonical: "g" },
  grams: { family: "mass", toBase: 1, canonical: "g" },
  kg: { family: "mass", toBase: 1000, canonical: "g" },
  oz: { family: "mass", toBase: 28.35, canonical: "g" },
  lb: { family: "mass", toBase: 453.6, canonical: "g" },
  lbs: { family: "mass", toBase: 453.6, canonical: "g" },
  ml: { family: "volume", toBase: 1, canonical: "ml" },
  l: { family: "volume", toBase: 1000, canonical: "ml" },
  tsp: { family: "volume", toBase: 4.93, canonical: "tsp" },
  teaspoon: { family: "volume", toBase: 4.93, canonical: "tsp" },
  teaspoons: { family: "volume", toBase: 4.93, canonical: "tsp" },
  tbsp: { family: "volume", toBase: 14.79, canonical: "tbsp" },
  tablespoon: { family: "volume", toBase: 14.79, canonical: "tbsp" },
  tablespoons: { family: "volume", toBase: 14.79, canonical: "tbsp" },
  cup: { family: "volume", toBase: 236.6, canonical: "cup" },
  cups: { family: "volume", toBase: 236.6, canonical: "cup" },
};

function unitInfo(unit: string | null): UnitInfo | null {
  if (!unit) return { family: "count", toBase: 1, canonical: "" };
  return UNITS[unit.trim().toLowerCase().replace(/\.$/, "")] ?? null;
}

/** "Roma Tomatoes" and "roma tomato" merge; so do "Sweet Bell Pepper" and "sweet bell peppers". */
export function normalizeName(name: string): string {
  const n = name
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (n.endsWith("oes")) return n.slice(0, -2);
  if (n.endsWith("ies")) return n.slice(0, -3) + "y";
  if (n.endsWith("s") && !n.endsWith("ss")) return n.slice(0, -1);
  return n;
}

function pickUnitForTotal(family: UnitInfo["family"], base: number, preferred: string): { q: number; unit: string } {
  if (family === "volume" && preferred !== "ml") {
    // keep kitchen units: 4 tbsp and up reads better as cups
    if (base >= 236.6 / 4 - 0.5) return { q: base / 236.6, unit: "cup" };
    if (base >= 14.79) return { q: base / 14.79, unit: "tbsp" };
    return { q: base / 4.93, unit: "tsp" };
  }
  if (family === "mass" && base >= 1000) return { q: base / 1000, unit: "kg" };
  return { q: base, unit: preferred };
}

export type IngredientSource = {
  label: string;
  ingredients: Ingredient[];
  baseServings: number;
  servings: number;
  /** Store these items should be bought at; the same item for different stores stays on separate lines. */
  store?: string | null;
};

/**
 * Combines ingredients from several recipes (already at their own base
 * servings) into grocery lines, scaling each to its planned servings and
 * merging duplicates with compatible units.
 */
export function buildGroceryLines(sources: IngredientSource[], opts: { includePantry?: boolean } = {}): GroceryLine[] {
  type Acc = {
    name: string;
    family: UnitInfo["family"] | "unknown";
    base: number | null;
    unit: string | null;
    preferredUnit: string;
    category: Category;
    store: string | null;
    sources: Set<string>;
    pantry: boolean;
  };
  const acc = new Map<string, Acc>();

  for (const src of sources) {
    const scaled = scaleIngredients(src.ingredients, scaleFactor(src.baseServings, src.servings));
    for (const ing of scaled) {
      if (ing.pantry && !opts.includePantry) continue;
      const info = unitInfo(ing.unit);
      const family = info?.family ?? "unknown";
      const store = src.store?.trim() || null;
      const key = `${normalizeName(ing.name)}|${family}|${family === "unknown" ? (ing.unit ?? "").toLowerCase() : ""}|${(store ?? "").toLowerCase()}`;
      const existing = acc.get(key);
      const baseQty = ing.quantity == null ? null : info ? ing.quantity * info.toBase : ing.quantity;
      if (existing) {
        existing.base = existing.base == null || baseQty == null ? (existing.base ?? baseQty) : existing.base + baseQty;
        existing.sources.add(src.label);
      } else {
        acc.set(key, {
          name: ing.name,
          family,
          base: baseQty,
          unit: ing.unit,
          preferredUnit: info?.canonical ?? ing.unit ?? "",
          category: ing.category,
          store,
          sources: new Set([src.label]),
          pantry: ing.pantry,
        });
      }
    }
  }

  const lines: GroceryLine[] = [];
  for (const a of acc.values()) {
    let quantity: number | null = a.base;
    let unit: string | null = a.unit;
    if (a.base != null && (a.family === "mass" || a.family === "volume")) {
      const picked = pickUnitForTotal(a.family, a.base, a.preferredUnit);
      quantity = picked.q;
      unit = picked.unit;
    } else if (a.family === "count") {
      unit = null;
    }
    lines.push({
      name: a.name,
      quantity,
      unit,
      category: a.category,
      store: a.store,
      sources: [...a.sources],
      pantry: a.pantry,
    });
  }
  return lines.sort((x, y) => x.category.localeCompare(y.category) || x.name.localeCompare(y.name));
}
