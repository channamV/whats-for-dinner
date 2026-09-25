import type { Category } from "./types";

export type ParsedGroceryItem = { name: string; quantity: number | null; unit: string | null; note: string | null; category: Category };

const KEYWORDS: [Category, RegExp][] = [
  ["produce", /\b(apple|banana|lime|lemon|orange|berr|grape|tomato|onion|garlic|potato|carrot|celery|lettuce|spinach|kale|pepper|cucumber|zucchini|broccoli|avocado|herb|cilantro|parsley|basil|mushroom|fruit|veg|salad)/i],
  ["meat", /\b(chicken|beef|pork|bacon|sausage|turkey|lamb|ham|steak|ground|mince)/i],
  ["seafood", /\b(fish|salmon|tuna|shrimp|prawn|cod|tilapia|seafood)/i],
  ["dairy", /\b(milk|cheese|butter|yogurt|yoghurt|cream|egg)/i],
  ["bakery", /\b(bread|bun|bagel|tortilla|naan|pita|roll|muffin|croissant)/i],
  ["frozen", /\b(frozen|ice cream|popsicle)/i],
  ["spices", /\b(salt|spice|cumin|paprika|oregano|cinnamon|seasoning)/i],
  ["pantry", /\b(rice|pasta|flour|sugar|oil|vinegar|sauce|cereal|oat|bean|can|soup|coffee|tea|snack|chip|cracker|peanut|jam|honey|stock|broth)/i],
];

/** Used when the AI isn't available: pulls a leading quantity/unit and guesses the aisle from keywords. */
export function fallbackParse(line: string): ParsedGroceryItem {
  const m = line.trim().match(/^(\d+(?:[.,]\d+)?|\d+\/\d+)\s*(kg|g|lb|lbs|l|ml|pkg|packs?|cans?|bags?|dozen|bunch(?:es)?)?\s+(.+)$/i);
  const quantity = m ? (m[1].includes("/") ? Number(m[1].split("/")[0]) / Number(m[1].split("/")[1]) : Number(m[1].replace(",", "."))) : null;
  const name = (m ? m[3] : line).trim();
  const category = KEYWORDS.find(([, re]) => re.test(name))?.[0] ?? "other";
  return { name: name.charAt(0).toUpperCase() + name.slice(1), quantity, unit: m?.[2]?.toLowerCase() ?? null, note: null, category };
}
