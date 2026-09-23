import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { anthropic, MODEL } from "./client";
import { AiImportSchema, normalizeImport, type ImportResult } from "./schema";

export type UploadedFile = {
  data: Buffer;
  mediaType: string;
};

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

const SYSTEM = `You turn scanned or photographed recipe cards (mostly HelloFresh) into structured recipes for a family meal-planning app.

A card usually describes one complete meal made of several dishes. Split the meal into its separate dishes so each can be cooked on its own or reused with other meals. For example "Pesto Mozzarella Piadina with Roasted Zucchini" becomes: the piadina (main), a spinach and tomato salad (side), and a balsamic dressing (dressing). "Pork Fajitas with Lime Crema and Salsa Fresca" becomes: the fajitas with roasted peppers (main), the salsa fresca (topping) and the lime crema (sauce). Always give sauces, dressings, salsas, cremas, dips, marinades and slaws their own dish, even when they are only one step, so they can be reused with other meals. Don't split out trivial steps like "warm the tortillas" or "halve the tomatoes".

Rules:
- Use the smallest serving column on the card as base_servings (usually 2 people) and take quantities from that column.
- Set scales=false when the card shows the same amount for both serving sizes (spice packets and chili flakes often don't double).
- Give each ingredient to the dish that uses it. If one card ingredient is shared between dishes (oil, half the onion, lime juice vs. lime zest), split the amount between the dishes as the steps describe.
- Use the step text to find amounts not in the ingredient table (e.g. "1 tbsp oil (dbl for 4 ppl)" means 1 tbsp at base servings, scales=true). Pantry items with no amount get quantity null.
- Mark oil, salt, pepper, sugar, water, butter-for-greasing as pantry=true.
- Units: use g, kg, ml, tsp, tbsp, cup, or null for whole items. Convert fractions to decimals (¼ cup -> 0.25, cup).
- Rewrite each dish's steps so they make sense for that dish alone. Wrap every amount in the step text in double braces so the app can scale it: "Toss with {{1 tbsp}} oil and {{0.5 tsp}} chili flakes". Prefix with = for amounts that don't scale: "{{=1 tsp}}". Keep oven temperatures and times as plain text, not in braces.
- Put 'Start here' items (preheat oven, wash produce) in meal.start_notes, and also as the first step of the dish that needs the oven when relevant.
- If the card has a heat guide, use the amount the steps call for (usually the medium level) as the quantity, mark it scales=false, and put the heat guide in the ingredient note.
- Tags: short lowercase words such as veggie, pork, chicken, beef, fish, quick, spicy, kid-friendly, mexican, italian.
- Ignore marketing text, allergen boilerplate, contact details and photos.
- If something is unreadable, make your best guess and add a warning.`;

export async function parseRecipeFiles(files: UploadedFile[], hint?: string): Promise<ImportResult> {
  const content: Anthropic.ContentBlockParam[] = [];
  for (const f of files) {
    const data = f.data.toString("base64");
    if (f.mediaType === "application/pdf") {
      content.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data } });
    } else if (IMAGE_TYPES.has(f.mediaType)) {
      content.push({
        type: "image",
        source: { type: "base64", media_type: f.mediaType as "image/jpeg", data },
      });
    } else {
      throw new Error(`Unsupported file type: ${f.mediaType}. Use PDF, JPEG, PNG or WebP.`);
    }
  }
  content.push({
    type: "text",
    text: `Extract the meal and its dishes from ${files.length > 1 ? "these pages" : "this recipe"}.${
      hint ? `\n\nNote from the user: ${hint}` : ""
    }`,
  });

  const response = await anthropic().messages.parse({
    model: MODEL,
    max_tokens: 16000,
    system: SYSTEM,
    thinking: { type: "adaptive" },
    output_config: { effort: "medium", format: zodOutputFormat(AiImportSchema) },
    messages: [{ role: "user", content }],
  });

  if (response.stop_reason === "refusal") {
    throw new Error("The AI declined to read this file. Try a clearer scan or enter the recipe by hand.");
  }
  if (response.stop_reason === "max_tokens") {
    throw new Error("The recipe was too long to read in one go. Try uploading fewer pages at a time.");
  }
  if (!response.parsed_output) {
    throw new Error("Couldn't read a recipe from that file. Try a clearer scan or photo.");
  }
  return normalizeImport(response.parsed_output);
}
