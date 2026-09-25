import "server-only";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { anthropic, MODEL } from "./client";
import { CATEGORIES, type Category } from "../types";
import { fallbackParse, type ParsedGroceryItem } from "../grocery-parse";

export { fallbackParse, type ParsedGroceryItem };


const Schema = z.object({
  items: z.array(
    z.object({
      index: z.number().int().describe("Index of the input line"),
      name: z.string().describe("What to look for in the store, singular-or-plural as a shopper says it, e.g. 'Paper towels', 'Lime'"),
      quantity: z.number().nullable(),
      unit: z.string().nullable().describe("g, kg, ml, l, lb, pkg, can, bag, dozen… or null"),
      note: z.string().nullable().describe("Brand or detail that isn't the item itself, e.g. 'Kirkland', 'large'"),
      category: z.string().describe(`One of: ${CATEGORIES.join(", ")}. Non-food (paper towels, soap, batteries) is "other".`),
    }),
  ),
});

/** Turns free-typed/dictated lines ("2 dozen eggs", "Kirkland paper towels") into grocery items with an aisle. */
export async function parseGroceryLines(lines: string[]): Promise<ParsedGroceryItem[]> {
  const response = await anthropic().messages.parse({
    model: MODEL,
    max_tokens: 8000,
    output_config: { effort: "low", format: zodOutputFormat(Schema) },
    system:
      "You tidy up grocery list entries that were typed or dictated to Siri. For each line give the item name (capitalised, without the quantity), quantity and unit if stated, any brand/detail as a note, and the store aisle. Keep words that change what you'd pick up (frozen, ground, whole wheat, unsalted) in the name; brands and sizes go in the note. Keep one output per input line and never invent items.",
    messages: [{ role: "user", content: lines.map((l, i) => `${i}: ${l}`).join("\n") }],
  });
  const parsed = response.parsed_output;
  if (response.stop_reason === "refusal" || !parsed) throw new Error("grocery parse failed");
  const byIndex = new Map(parsed.items.map((it) => [it.index, it]));
  return lines.map((line, i) => {
    const it = byIndex.get(i);
    if (!it || !it.name.trim()) return fallbackParse(line);
    const category = (CATEGORIES as readonly string[]).includes(it.category.toLowerCase()) ? (it.category.toLowerCase() as Category) : "other";
    return { name: it.name.trim(), quantity: it.quantity, unit: it.unit?.trim() || null, note: it.note?.trim() || null, category };
  });
}
