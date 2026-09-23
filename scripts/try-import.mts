// Runs the recipe importer on local files: npx tsx --conditions=react-server scripts/try-import.mts card.pdf [more files]
import { readFileSync, writeFileSync } from "node:fs";
import { parseRecipeFiles } from "../src/lib/ai/parse-recipe.ts";

const files = process.argv.slice(2);
const started = Date.now();
const result = await parseRecipeFiles(
  files.map((f) => ({
    data: readFileSync(f),
    mediaType: f.toLowerCase().endsWith(".pdf") ? "application/pdf" : f.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg",
  })),
);
const out = process.env.OUT;
if (out) writeFileSync(out, JSON.stringify(result, null, 2));
console.log(`Read in ${Math.round((Date.now() - started) / 1000)}s`);
console.log(`${result.meal.title} — ${result.meal.subtitle ?? ""} (${result.meal.source ?? "?"} ${result.meal.source_ref ?? ""})`);
for (const d of result.dishes) {
  console.log(`\n[${d.role}] ${d.title} — serves ${d.base_servings}`);
  for (const i of d.ingredients) console.log(`  ${i.quantity ?? ""} ${i.unit ?? ""} ${i.name}${i.scales ? "" : " (fixed)"}${i.pantry ? " (pantry)" : ""} [${i.category}]`);
  for (const s of d.steps) console.log(`  - ${s.title ? s.title + ": " : ""}${s.text}`);
}
if (result.warnings.length) console.log("\nWarnings:", result.warnings);
