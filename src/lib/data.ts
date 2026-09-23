import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { GroceryItem, GroceryList, Ingredient, Meal, MealDish, PlanEntry, Recipe } from "./types";
import type { IngredientSource } from "./grocery";

export type MealWithDishes = Meal & { dishes: (MealDish & { recipe: Recipe })[] };
export type PlanEntryFull = PlanEntry & { meal: Meal | null; recipe: Recipe | null };

export async function getMeal(sb: SupabaseClient, id: string): Promise<MealWithDishes | null> {
  const { data } = await sb
    .from("meals")
    .select("*, dishes:meal_dishes(meal_id, recipe_id, role, position, recipe:recipes(*))")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const meal = data as MealWithDishes;
  meal.dishes = meal.dishes.filter((d) => d.recipe).sort((a, b) => a.position - b.position);
  return meal;
}

export async function getRecipe(sb: SupabaseClient, id: string) {
  const { data } = await sb
    .from("recipes")
    .select("*, meals:meal_dishes(role, meal:meals(id, title))")
    .eq("id", id)
    .maybeSingle();
  return data as (Recipe & { meals: { role: string; meal: { id: string; title: string } | null }[] }) | null;
}

/** PostgREST filter strings treat , ( ) as syntax, so strip them from search text. */
function searchTerm(q: string) {
  return q.replace(/[,()%*\\]/g, " ").trim();
}

export async function listMeals(sb: SupabaseClient, q?: string) {
  let query = sb
    .from("meals")
    .select("id, title, subtitle, tags, total_minutes, image_path, source, dishes:meal_dishes(count)")
    .order("title");
  const t = q && searchTerm(q);
  if (t) query = query.or(`title.ilike.%${t}%,subtitle.ilike.%${t}%`);
  const { data } = await query;
  return (data ?? []) as (Pick<Meal, "id" | "title" | "subtitle" | "tags" | "total_minutes" | "image_path" | "source"> & {
    dishes: { count: number }[];
  })[];
}

export async function listRecipes(sb: SupabaseClient, q?: string) {
  let query = sb.from("recipes").select("id, title, description, tags, total_minutes, base_servings").order("title");
  const t = q && searchTerm(q);
  if (t) query = query.or(`title.ilike.%${t}%,description.ilike.%${t}%`);
  const { data } = await query;
  return (data ?? []) as Pick<Recipe, "id" | "title" | "description" | "tags" | "total_minutes" | "base_servings">[];
}

export async function getPlan(sb: SupabaseClient, from: string, to: string): Promise<PlanEntryFull[]> {
  const { data } = await sb
    .from("meal_plan_entries")
    .select("*, meal:meals(*), recipe:recipes(*)")
    .gte("plan_date", from)
    .lte("plan_date", to)
    .order("plan_date")
    .order("created_at");
  return (data ?? []) as PlanEntryFull[];
}

export async function getLists(sb: SupabaseClient) {
  const { data } = await sb
    .from("grocery_lists")
    .select("*, items:grocery_items(checked)")
    .order("archived")
    .order("created_at", { ascending: false });
  return (data ?? []) as (GroceryList & { items: { checked: boolean }[] })[];
}

export async function getList(sb: SupabaseClient, id: string) {
  const [{ data: list }, { data: items }] = await Promise.all([
    sb.from("grocery_lists").select("*").eq("id", id).maybeSingle(),
    sb.from("grocery_items").select("*").eq("list_id", id).order("position").order("created_at"),
  ]);
  if (!list) return null;
  return { list: list as GroceryList, items: (items ?? []) as GroceryItem[] };
}

/** Ingredient sources for a meal or a single recipe at the given table size. */
export async function sourcesFor(
  sb: SupabaseClient,
  target: { mealId?: string | null; recipeId?: string | null },
  servings: number,
): Promise<IngredientSource[]> {
  if (target.mealId) {
    const meal = await getMeal(sb, target.mealId);
    if (!meal) return [];
    return meal.dishes.map((d) => ({
      label: meal.title,
      ingredients: d.recipe.ingredients as Ingredient[],
      baseServings: d.recipe.base_servings,
      servings,
    }));
  }
  if (target.recipeId) {
    const { data } = await sb.from("recipes").select("title, ingredients, base_servings").eq("id", target.recipeId).maybeSingle();
    if (!data) return [];
    return [{ label: data.title, ingredients: data.ingredients as Ingredient[], baseServings: data.base_servings, servings }];
  }
  return [];
}
