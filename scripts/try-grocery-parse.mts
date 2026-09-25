// Tries the grocery-line tidy-up on sample Siri entries: npx tsx --conditions=react-server --env-file=.env.local scripts/try-grocery-parse.mts
import { parseGroceryLines } from "../src/lib/ai/grocery-items.ts";

const lines = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ["Milk", "2 dozen eggs", "Kirkland paper towels", "limes", "chicken thighs 2 kg", "Dish soap", "frozen blueberries", "coffee beans", "Sourdough bread"];
const started = Date.now();
const out = await parseGroceryLines(lines);
console.log(`Parsed ${lines.length} lines in ${((Date.now() - started) / 1000).toFixed(1)}s`);
out.forEach((o, i) => console.log(`${lines[i].padEnd(24)} → ${[o.quantity, o.unit].filter((x) => x != null).join(" ")} ${o.name} [${o.category}]${o.note ? ` · ${o.note}` : ""}`));
