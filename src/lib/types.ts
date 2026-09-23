export const CATEGORIES = [
  "produce",
  "meat",
  "seafood",
  "dairy",
  "bakery",
  "pantry",
  "spices",
  "frozen",
  "other",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const DISH_ROLES = ["main", "side", "sauce", "dressing", "topping", "other"] as const;
export type DishRole = (typeof DISH_ROLES)[number];

export type Ingredient = {
  name: string;
  quantity: number | null;
  unit: string | null;
  note: string | null;
  /** false when the amount stays the same regardless of table size (e.g. HelloFresh spice packets) */
  scales: boolean;
  /** staples you usually have (oil, salt, pepper) - left off grocery lists by default */
  pantry: boolean;
  category: Category;
};

export type Step = {
  title: string | null;
  /** may contain {{1 tbsp}} tokens, which are scaled with the recipe */
  text: string;
};

export type Recipe = {
  id: string;
  household_id: string;
  title: string;
  description: string | null;
  base_servings: number;
  prep_minutes: number | null;
  total_minutes: number | null;
  tags: string[];
  ingredients: Ingredient[];
  steps: Step[];
  equipment: string[];
  notes: string | null;
  source: string | null;
  image_path: string | null;
  favorite: boolean;
  created_at: string;
  updated_at: string;
};

export type Meal = {
  id: string;
  household_id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  total_minutes: number | null;
  tags: string[];
  source: string | null;
  source_ref: string | null;
  source_files: string[];
  image_path: string | null;
  notes: string | null;
  favorite: boolean;
  created_at: string;
  updated_at: string;
};

export type MealDish = {
  meal_id: string;
  recipe_id: string;
  role: DishRole;
  position: number;
  recipe?: Recipe;
};

export type PlanEntry = {
  id: string;
  household_id: string;
  plan_date: string;
  slot: "breakfast" | "lunch" | "dinner" | "snack";
  meal_id: string | null;
  recipe_id: string | null;
  servings: number;
  note: string | null;
  cooked: boolean;
};

export type GroceryList = {
  id: string;
  household_id: string;
  name: string;
  archived: boolean;
  created_at: string;
};

export type GroceryItem = {
  id: string;
  list_id: string;
  household_id: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  category: Category;
  note: string | null;
  sources: string[];
  checked: boolean;
  position: number;
};

export type Household = {
  id: string;
  name: string;
  invite_code: string;
  default_servings: number;
};
