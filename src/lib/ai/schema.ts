import { z } from "zod";
import { CATEGORIES, DISH_ROLES } from "../types";

export const IngredientSchema = z.object({
  name: z.string().describe("Ingredient name as a shopper would look for it, e.g. 'Roma Tomato'"),
  quantity: z.number().nullable().describe("Amount for base_servings; null for 'to taste' items"),
  unit: z.string().nullable().describe("g, kg, ml, tsp, tbsp, cup, or null for whole items like '1 lime'"),
  note: z.string().nullable().describe("Prep note, e.g. 'zested and juiced'"),
  scales: z.boolean().describe("false if the amount is the same for 2 and 4 people on the card"),
  pantry: z.boolean().describe("true for pantry staples: oil, salt, pepper, sugar, water"),
  category: z.enum(CATEGORIES),
});

export const StepSchema = z.object({
  title: z.string().nullable(),
  text: z.string().describe("Instruction text with every amount wrapped as {{qty unit}}"),
});

export const DishSchema = z.object({
  title: z.string(),
  role: z.enum(DISH_ROLES),
  description: z.string().nullable(),
  base_servings: z.number().int(),
  total_minutes: z.number().int().nullable(),
  tags: z.array(z.string()),
  equipment: z.array(z.string()),
  ingredients: z.array(IngredientSchema),
  steps: z.array(StepSchema),
});

export const ImportResultSchema = z.object({
  meal: z.object({
    title: z.string(),
    subtitle: z.string().nullable(),
    description: z.string().nullable(),
    total_minutes: z.number().int().nullable(),
    tags: z.array(z.string()),
    source: z.string().nullable().describe("e.g. 'HelloFresh'"),
    source_ref: z.string().nullable().describe("Card code if printed, e.g. 'W41 R18'"),
    start_notes: z.array(z.string()).describe("'Start here' prep such as preheating the oven"),
  }),
  dishes: z.array(DishSchema),
  warnings: z.array(z.string()).describe("Anything unreadable or guessed"),
});

export type ImportResult = z.infer<typeof ImportResultSchema>;
export type ImportedDish = z.infer<typeof DishSchema>;

// Structured outputs don't enforce enums, so the model-facing schema takes plain
// strings for role/category and normalizeImport() maps them onto the real values.
const AiIngredientSchema = IngredientSchema.extend({
  category: z.string().describe(`One of: ${CATEGORIES.join(", ")}`),
});
const AiDishSchema = DishSchema.extend({
  role: z.string().describe(`One of: ${DISH_ROLES.join(", ")}`),
  ingredients: z.array(AiIngredientSchema),
});
export const AiImportSchema = ImportResultSchema.extend({ dishes: z.array(AiDishSchema) });
type AiImport = z.infer<typeof AiImportSchema>;

function oneOf<T extends string>(allowed: readonly T[], value: string, fallback: T): T {
  const v = value.trim().toLowerCase();
  return (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}

export function normalizeImport(raw: AiImport): ImportResult {
  return {
    ...raw,
    dishes: raw.dishes.map((d) => ({
      ...d,
      role: oneOf(DISH_ROLES, d.role, "other"),
      base_servings: Math.min(24, Math.max(1, Math.round(d.base_servings) || 2)),
      ingredients: d.ingredients.map((i) => ({ ...i, category: oneOf(CATEGORIES, i.category, "other") })),
    })),
  };
}
