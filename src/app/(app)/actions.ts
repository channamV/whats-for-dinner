"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { DishSchema } from "@/lib/ai/schema";
import { requireHousehold } from "@/lib/session";
import { getPlan, sourcesFor } from "@/lib/data";
import { buildGroceryLines, type IngredientSource } from "@/lib/grocery";
import { suggestPlan, type LibraryItem, type PlanSuggestion } from "@/lib/ai/suggest-plan";
import { formatDay, isIsoDate, today, weekDates } from "@/lib/dates";
import type { GroceryItem, Ingredient } from "@/lib/types";
import { removeUnusedFiles } from "@/lib/files";
import { newShortcutKey } from "@/lib/shortcuts";

function refresh() {
  revalidatePath("/", "layout");
}

// ---------------------------------------------------------------------------
// Recipes and meals
// ---------------------------------------------------------------------------

const DishInput = DishSchema.extend({
  id: z.string().uuid().optional(),
  notes: z.string().nullable().optional(),
  prep_minutes: z.number().int().nullable().optional(),
  base_servings: z.number().int().min(1).max(24),
});
export type DishInput = z.infer<typeof DishInput>;

const ImportInput = z.object({
  saveAsMeal: z.boolean(),
  meal: z.object({
    title: z.string().min(1),
    subtitle: z.string().nullable(),
    description: z.string().nullable(),
    total_minutes: z.number().int().nullable(),
    tags: z.array(z.string()),
    source: z.string().nullable(),
    source_ref: z.string().nullable(),
    notes: z.string().nullable(),
  }),
  dishes: z.array(DishInput).min(1),
  sourceFiles: z.array(z.string()),
});
export type ImportInput = z.infer<typeof ImportInput>;

function recipeRow(d: DishInput, householdId: string, source: string | null) {
  return {
    household_id: householdId,
    title: d.title.trim(),
    description: d.description,
    base_servings: d.base_servings,
    prep_minutes: d.prep_minutes ?? null,
    total_minutes: d.total_minutes,
    tags: normalizeTags(d.tags),
    ingredients: d.ingredients.filter((i) => i.name.trim()),
    steps: d.steps.filter((s) => s.text.trim()),
    equipment: d.equipment,
    notes: d.notes ?? null,
    source,
  };
}

function normalizeTags(tags: string[]) {
  return [...new Set(tags.map((t) => t.trim().toLowerCase()).filter(Boolean))];
}

export async function saveImport(raw: ImportInput): Promise<{ error: string } | void> {
  const parsed = ImportInput.safeParse(raw);
  if (!parsed.success) return { error: "Some fields are missing or invalid. Check each dish has a title." };
  const input = parsed.data;
  const { supabase, user, household } = await requireHousehold();

  const sourceFiles = input.sourceFiles.filter((p) => p.startsWith(`${household.id}/`));
  const { data: recipes, error } = await supabase
    .from("recipes")
    .insert(
      input.dishes.map((d) => ({ ...recipeRow(d, household.id, input.meal.source), source_files: sourceFiles, created_by: user.id })),
    )
    .select("id");
  if (error || !recipes) return { error: error?.message ?? "Couldn't save the recipes." };

  if (!input.saveAsMeal) {
    refresh();
    redirect(recipes.length === 1 ? `/recipes/${recipes[0].id}` : "/recipes");
  }

  const { data: meal, error: mealError } = await supabase
    .from("meals")
    .insert({
      household_id: household.id,
      ...input.meal,
      tags: normalizeTags(input.meal.tags),
      source_files: sourceFiles,
      image_path: sourceFiles.find((p) => /\.(jpe?g|png|webp)$/i.test(p)) ?? null,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (mealError || !meal) return { error: mealError?.message ?? "Couldn't save the meal." };

  const { error: linkError } = await supabase.from("meal_dishes").insert(
    recipes.map((r, i) => ({
      meal_id: meal.id,
      recipe_id: r.id,
      household_id: household.id,
      role: input.dishes[i].role,
      position: i,
    })),
  );
  if (linkError) return { error: linkError.message };

  refresh();
  redirect(`/meals/${meal.id}`);
}

export async function saveRecipe(raw: DishInput & { mealId?: string | null }): Promise<{ error: string } | void> {
  const parsed = DishInput.safeParse(raw);
  if (!parsed.success) return { error: "Give the recipe a title and check the amounts are numbers." };
  const d = parsed.data;
  const { supabase, user, household } = await requireHousehold();

  if (d.id) {
    const row: Partial<ReturnType<typeof recipeRow>> = recipeRow(d, household.id, null);
    delete row.household_id;
    delete row.source;
    const { error } = await supabase.from("recipes").update(row).eq("id", d.id);
    if (error) return { error: error.message };
    refresh();
    redirect(`/recipes/${d.id}`);
  }

  const { data, error } = await supabase
    .from("recipes")
    .insert({ ...recipeRow(d, household.id, null), created_by: user.id })
    .select("id")
    .single();
  if (error || !data) return { error: error?.message ?? "Couldn't save." };

  if (raw.mealId) {
    const { count } = await supabase.from("meal_dishes").select("*", { count: "exact", head: true }).eq("meal_id", raw.mealId);
    await supabase
      .from("meal_dishes")
      .insert({ meal_id: raw.mealId, recipe_id: data.id, household_id: household.id, role: d.role, position: count ?? 0 });
    refresh();
    redirect(`/meals/${raw.mealId}`);
  }
  refresh();
  redirect(`/recipes/${data.id}`);
}

/** Deletes uploads from an import the user started over on (only files nothing refers to). */
export async function discardUploads(paths: string[]) {
  const { supabase, household } = await requireHousehold();
  await removeUnusedFiles(supabase, paths.filter((p) => p.startsWith(`${household.id}/imports/`)));
}

export async function setFavorite(kind: "meal" | "recipe", id: string, favorite: boolean) {
  const { supabase } = await requireHousehold();
  await supabase.from(kind === "meal" ? "meals" : "recipes").update({ favorite }).eq("id", id);
  refresh();
}

export async function deleteRecipe(id: string) {
  const { supabase } = await requireHousehold();
  const { data } = await supabase.from("recipes").select("source_files").eq("id", id).maybeSingle();
  await supabase.from("recipes").delete().eq("id", id);
  await removeUnusedFiles(supabase, (data?.source_files as string[] | undefined) ?? []);
  refresh();
  redirect("/recipes");
}

export async function deleteMeal(id: string, withDishes: boolean) {
  const { supabase } = await requireHousehold();
  const { data: meal } = await supabase.from("meals").select("source_files").eq("id", id).maybeSingle();
  const files = [...((meal?.source_files as string[] | undefined) ?? [])];
  if (withDishes) {
    const { data } = await supabase.from("meal_dishes").select("recipe_id").eq("meal_id", id);
    const ids = (data ?? []).map((d) => d.recipe_id);
    // Keep dishes that another meal still uses.
    const { data: shared } = await supabase.from("meal_dishes").select("recipe_id").in("recipe_id", ids).neq("meal_id", id);
    const keep = new Set((shared ?? []).map((s) => s.recipe_id));
    const remove = ids.filter((r) => !keep.has(r));
    if (remove.length) {
      const { data: gone } = await supabase.from("recipes").select("source_files").in("id", remove);
      files.push(...(gone ?? []).flatMap((r) => r.source_files as string[]));
      await supabase.from("recipes").delete().in("id", remove);
    }
  }
  await supabase.from("meals").delete().eq("id", id);
  // Files stay while any remaining dish still links to them.
  await removeUnusedFiles(supabase, files);
  refresh();
  redirect("/recipes?tab=meals");
}

export async function updateMeal(id: string, form: FormData) {
  const { supabase } = await requireHousehold();
  const minutes = Number(form.get("total_minutes"));
  await supabase
    .from("meals")
    .update({
      title: String(form.get("title") ?? "").trim() || "Untitled meal",
      subtitle: String(form.get("subtitle") ?? "").trim() || null,
      total_minutes: Number.isFinite(minutes) && minutes > 0 ? Math.round(minutes) : null,
      tags: normalizeTags(String(form.get("tags") ?? "").split(",")),
      notes: String(form.get("notes") ?? "").trim() || null,
    })
    .eq("id", id);
  refresh();
  redirect(`/meals/${id}`);
}

export async function addDishToMeal(mealId: string, form: FormData) {
  const { supabase, household } = await requireHousehold();
  const recipeId = String(form.get("recipe_id") ?? "");
  if (!recipeId) return;
  const { count } = await supabase.from("meal_dishes").select("*", { count: "exact", head: true }).eq("meal_id", mealId);
  await supabase.from("meal_dishes").upsert({
    meal_id: mealId,
    recipe_id: recipeId,
    household_id: household.id,
    role: String(form.get("role") ?? "side"),
    position: count ?? 0,
  });
  refresh();
}

export async function removeDishFromMeal(mealId: string, recipeId: string) {
  const { supabase } = await requireHousehold();
  await supabase.from("meal_dishes").delete().eq("meal_id", mealId).eq("recipe_id", recipeId);
  refresh();
}

/** Builds a new meal out of dishes already in the library. */
export async function createMealFromDishes(form: FormData) {
  const { supabase, user, household } = await requireHousehold();
  const ids = form.getAll("recipe_id").map(String).filter(Boolean);
  const title = String(form.get("title") ?? "").trim();
  if (!title || !ids.length) return;
  const { data: meal } = await supabase
    .from("meals")
    .insert({ household_id: household.id, title, created_by: user.id })
    .select("id")
    .single();
  if (!meal) return;
  await supabase
    .from("meal_dishes")
    .insert(ids.map((recipe_id, i) => ({ meal_id: meal.id, recipe_id, household_id: household.id, role: i === 0 ? "main" : "side", position: i })));
  refresh();
  redirect(`/meals/${meal.id}`);
}

// ---------------------------------------------------------------------------
// Meal plan
// ---------------------------------------------------------------------------

function servingsFrom(form: FormData, fallback: number) {
  const n = Number(form.get("servings"));
  return Number.isInteger(n) && n >= 1 && n <= 24 ? n : fallback;
}

export async function addToPlan(form: FormData) {
  const { supabase, household } = await requireHousehold();
  const date = String(form.get("date") ?? "");
  if (!isIsoDate(date)) return;
  const target = String(form.get("target") ?? ""); // "meal:<id>" | "recipe:<id>" | ""
  const [kind, id] = target.split(":");
  const note = String(form.get("note") ?? "").trim() || null;
  if (!id && !note) return;
  await supabase.from("meal_plan_entries").insert({
    household_id: household.id,
    plan_date: date,
    meal_id: kind === "meal" ? id : null,
    recipe_id: kind === "recipe" ? id : null,
    servings: servingsFrom(form, household.default_servings),
    note,
  });
  refresh();
  if (form.get("redirect") === "plan") redirect(`/plan?week=${date}`);
}

export async function removePlanEntry(id: string) {
  const { supabase } = await requireHousehold();
  await supabase.from("meal_plan_entries").delete().eq("id", id);
  refresh();
}

export async function setPlanCooked(id: string, cooked: boolean) {
  const { supabase } = await requireHousehold();
  await supabase.from("meal_plan_entries").update({ cooked }).eq("id", id);
  refresh();
}

export async function setPlanServings(id: string, servings: number) {
  const { supabase } = await requireHousehold();
  if (!Number.isInteger(servings) || servings < 1 || servings > 24) return;
  await supabase.from("meal_plan_entries").update({ servings }).eq("id", id);
  refresh();
}

export async function suggestForWeek(
  start: string,
  preferences: string,
  onlyEmpty: boolean,
): Promise<{ error: string } | PlanSuggestion> {
  if (!isIsoDate(start)) return { error: "Bad date" };
  const { supabase } = await requireHousehold();
  const dates = weekDates(start);

  const [{ data: meals }, { data: recipes }, { data: history }, planned] = await Promise.all([
    supabase.from("meals").select("id, title, tags, total_minutes, favorite"),
    supabase.from("recipes").select("id, title, tags, total_minutes, favorite, role:meal_dishes(role)"),
    supabase.from("meal_plan_entries").select("meal_id, recipe_id, plan_date").order("plan_date", { ascending: false }).limit(500),
    getPlan(supabase, dates[0], dates[6]),
  ]);

  const last = new Map<string, string>();
  for (const h of history ?? []) {
    const key = h.meal_id ?? h.recipe_id;
    if (key && !last.has(key)) last.set(key, h.plan_date);
  }

  // Standalone dishes are only offered if they're mains or not part of any meal.
  const library: LibraryItem[] = [
    ...(meals ?? []).map((m, i) => ({ key: `m${i + 1}`, kind: "meal" as const, id: m.id, title: m.title, tags: m.tags, total_minutes: m.total_minutes, favorite: m.favorite, last_planned: last.get(m.id) ?? null })),
    ...(recipes ?? [])
      .filter((r) => !r.role?.length || r.role.some((x: { role: string }) => x.role === "main"))
      .map((r, i) => ({ key: `r${i + 1}`, kind: "recipe" as const, id: r.id, title: r.title, tags: r.tags, total_minutes: r.total_minutes, favorite: r.favorite, last_planned: last.get(r.id) ?? null })),
  ];
  if (!library.length) return { error: "Add a few recipes first, then I can suggest a plan." };

  const taken = new Set(planned.map((p) => p.plan_date));
  const wanted = onlyEmpty ? dates.filter((d) => !taken.has(d)) : dates;
  if (!wanted.length) return { error: "Every day this week already has something planned." };

  try {
    return await suggestPlan({
      library,
      dates: wanted.map((d) => d),
      preferences: `${preferences}\n(Days: ${wanted.map((d) => `${d} is ${formatDay(d, { weekday: "long" })}`).join("; ")})`,
      today: today(),
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Suggestion failed." };
  }
}

export async function applySuggestions(picks: { date: string; kind: "meal" | "recipe"; id: string }[]) {
  const { supabase, household } = await requireHousehold();
  const rows = picks
    .filter((p) => isIsoDate(p.date))
    .map((p) => ({
      household_id: household.id,
      plan_date: p.date,
      meal_id: p.kind === "meal" ? p.id : null,
      recipe_id: p.kind === "recipe" ? p.id : null,
      servings: household.default_servings,
    }));
  if (rows.length) await supabase.from("meal_plan_entries").insert(rows);
  refresh();
}

// ---------------------------------------------------------------------------
// Grocery lists
// ---------------------------------------------------------------------------

async function resolveList(form: FormData, fallbackName: string) {
  const { supabase, household } = await requireHousehold();
  const listId = String(form.get("list_id") ?? "");
  if (listId && listId !== "new") return listId;
  const name = String(form.get("new_list_name") ?? "").trim() || fallbackName;
  const { data } = await supabase.from("grocery_lists").insert({ household_id: household.id, name }).select("id").single();
  return data!.id as string;
}

/** Merges new lines into a list's unchecked items so the same thing isn't listed twice. */
async function mergeIntoList(listId: string, sources: IngredientSource[], includePantry: boolean) {
  const { supabase, household } = await requireHousehold();
  const { data: existing } = await supabase.from("grocery_items").select("*").eq("list_id", listId).eq("checked", false);
  const current = (existing ?? []) as GroceryItem[];

  const existingSources: IngredientSource[] = current.map((item) => ({
    label: item.sources.join(" · ") || "Added by hand",
    ingredients: [
      { name: item.name, quantity: item.quantity, unit: item.unit, note: item.note, scales: true, pantry: false, category: item.category } satisfies Ingredient,
    ],
    baseServings: 1,
    servings: 1,
    store: item.store,
  }));
  const lines = buildGroceryLines([...existingSources, ...sources], { includePantry });

  if (current.length) await supabase.from("grocery_items").delete().in("id", current.map((i) => i.id));
  if (lines.length) {
    await supabase.from("grocery_items").insert(
      lines.map((l, i) => ({
        list_id: listId,
        household_id: household.id,
        name: l.name,
        quantity: l.quantity == null ? null : Math.round(l.quantity * 1000) / 1000,
        unit: l.unit,
        category: l.category,
        store: l.store,
        sources: [...new Set(l.sources.flatMap((s) => s.split(" · ")))].filter((s) => s !== "Added by hand"),
        position: i,
      })),
    );
  }
}

export async function addToGroceryList(form: FormData) {
  const { supabase, household } = await requireHousehold();
  const [kind, id] = String(form.get("target") ?? "").split(":");
  const servings = servingsFrom(form, household.default_servings);
  const sources = await sourcesFor(supabase, { mealId: kind === "meal" ? id : null, recipeId: kind === "recipe" ? id : null }, servings);
  const listId = await resolveList(form, `Groceries ${formatDay(today(), { month: "short", day: "numeric" })}`);
  await mergeIntoList(listId, sources, form.get("include_pantry") === "on");
  refresh();
  redirect(`/lists/${listId}`);
}

export async function groceryListFromPlan(form: FormData) {
  const { supabase } = await requireHousehold();
  const from = String(form.get("from") ?? "");
  const to = String(form.get("to") ?? "");
  if (!isIsoDate(from) || !isIsoDate(to)) return;
  const entries = (await getPlan(supabase, from, to)).filter((e) => !e.cooked);
  const sources = (
    await Promise.all(entries.map((e) => sourcesFor(supabase, { mealId: e.meal_id, recipeId: e.recipe_id }, e.servings)))
  ).flat();
  const listId = await resolveList(form, `Week of ${formatDay(from, { month: "short", day: "numeric" })}`);
  await mergeIntoList(listId, sources, form.get("include_pantry") === "on");
  refresh();
  redirect(`/lists/${listId}`);
}

export async function createList(form: FormData) {
  const { supabase, household } = await requireHousehold();
  const name = String(form.get("name") ?? "").trim() || "Groceries";
  const { data } = await supabase.from("grocery_lists").insert({ household_id: household.id, name }).select("id").single();
  refresh();
  redirect(`/lists/${data!.id}`);
}

export async function updateList(id: string, patch: { name?: string; archived?: boolean }) {
  const { supabase } = await requireHousehold();
  await supabase.from("grocery_lists").update(patch).eq("id", id);
  refresh();
}

export async function deleteList(id: string) {
  const { supabase } = await requireHousehold();
  await supabase.from("grocery_lists").delete().eq("id", id);
  refresh();
  redirect("/lists");
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export async function updateHousehold(form: FormData) {
  const { supabase, user, household } = await requireHousehold();
  const servings = servingsFrom(form, household.default_servings);
  await supabase
    .from("households")
    .update({ name: String(form.get("name") ?? "").trim() || household.name, default_servings: servings })
    .eq("id", household.id);
  const displayName = String(form.get("display_name") ?? "").trim() || null;
  await supabase.from("household_members").update({ display_name: displayName }).eq("household_id", household.id).eq("user_id", user.id);
  refresh();
}

// ---------------------------------------------------------------------------
// iPhone Reminders / Siri sync (optional)
// ---------------------------------------------------------------------------

/** Creates (or replaces) the household's Shortcuts key. The key is returned once and only its hash is kept. */
export async function createShortcutKey(): Promise<{ key: string } | { error: string }> {
  const { supabase, household } = await requireHousehold();
  const { key, hash } = newShortcutKey();
  const { error } = await supabase
    .from("households")
    .update({ shortcut_key_hash: hash, shortcut_key_created_at: new Date().toISOString() })
    .eq("id", household.id);
  if (error) return { error: error.message };
  refresh();
  return { key };
}

export async function turnOffShortcuts() {
  const { supabase, household } = await requireHousehold();
  await supabase.from("households").update({ shortcut_key_hash: null, shortcut_key_created_at: null }).eq("id", household.id);
  refresh();
}
