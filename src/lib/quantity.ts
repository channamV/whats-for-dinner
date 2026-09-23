import type { Ingredient, Step } from "./types";

const UNICODE_FRACTIONS: Record<string, number> = {
  "¼": 0.25,
  "½": 0.5,
  "¾": 0.75,
  "⅓": 1 / 3,
  "⅔": 2 / 3,
  "⅛": 0.125,
  "⅜": 0.375,
  "⅝": 0.625,
  "⅞": 0.875,
};

/** Parses "1", "1.5", "1/2", "1 1/2", "1½", "½". Returns null if it isn't a number. */
export function parseQuantity(input: string): number | null {
  let s = input.trim();
  if (!s) return null;
  let total = 0;
  for (const [ch, v] of Object.entries(UNICODE_FRACTIONS)) {
    if (s.includes(ch)) {
      total += v;
      s = s.replace(ch, "").trim();
    }
  }
  if (!s) return total || null;
  const mixed = s.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) return total + Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  const frac = s.match(/^(\d+)\/(\d+)$/);
  if (frac) return total + Number(frac[1]) / Number(frac[2]);
  const n = Number(s);
  return Number.isFinite(n) ? total + n : null;
}

const NICE_FRACTIONS: [number, string][] = [
  [0, ""],
  [0.125, "⅛"],
  [0.25, "¼"],
  [1 / 3, "⅓"],
  [0.375, "⅜"],
  [0.5, "½"],
  [0.625, "⅝"],
  [2 / 3, "⅔"],
  [0.75, "¾"],
  [0.875, "⅞"],
  [1, ""],
];

const METRIC_UNITS = new Set(["g", "kg", "ml", "l", "mg"]);

/** Formats a quantity for people: 1.5 tbsp -> "1½", 227.4 g -> "227", 1.333 cup -> "1⅓". */
export function formatQuantity(q: number | null, unit?: string | null): string {
  if (q == null) return "";
  const u = (unit ?? "").toLowerCase();
  if (METRIC_UNITS.has(u)) {
    if (u === "kg" || u === "l") return trimNumber(Math.round(q * 100) / 100);
    return q >= 10 ? String(Math.round(q)) : trimNumber(Math.round(q * 10) / 10);
  }
  const whole = Math.floor(q);
  const frac = q - whole;
  let best = NICE_FRACTIONS[0];
  for (const f of NICE_FRACTIONS) {
    if (Math.abs(f[0] - frac) < Math.abs(best[0] - frac)) best = f;
  }
  if (Math.abs(best[0] - frac) > 0.07 && q < 10) {
    return trimNumber(Math.round(q * 100) / 100);
  }
  const w = best[0] === 1 ? whole + 1 : whole;
  if (w === 0 && best[1]) return best[1];
  return `${w}${best[1]}`;
}

function trimNumber(n: number): string {
  return String(n).replace(/\.0+$/, "");
}

export function scaleFactor(baseServings: number, targetServings: number): number {
  if (!baseServings || baseServings <= 0) return 1;
  return targetServings / baseServings;
}

export function scaleIngredient(ing: Ingredient, factor: number): Ingredient {
  if (ing.quantity == null || !ing.scales) return ing;
  return { ...ing, quantity: ing.quantity * factor };
}

export function scaleIngredients(ings: Ingredient[], factor: number): Ingredient[] {
  return ings.map((i) => scaleIngredient(i, factor));
}

const TOKEN = /\{\{\s*([^}]+?)\s*\}\}/g;

/**
 * Scales {{qty unit}} tokens inside step text: "Toss with {{1 tbsp}} oil"
 * becomes "Toss with 1½ tbsp oil" at factor 1.5. A token prefixed with "="
 * ({{=1 tsp}}) is fixed and never scaled.
 */
export function scaleStepText(text: string, factor: number): string {
  return text.replace(TOKEN, (_, inner: string) => {
    const fixed = inner.startsWith("=");
    const body = fixed ? inner.slice(1).trim() : inner;
    const m = body.match(/^([\d\s./¼½¾⅓⅔⅛⅜⅝⅞]+)\s*(.*)$/);
    if (!m) return body;
    const q = parseQuantity(m[1]);
    const unit = m[2].trim();
    if (q == null) return body;
    const scaled = fixed ? q : q * factor;
    return [formatQuantity(scaled, unit), unit].filter(Boolean).join(" ");
  });
}

export function scaleSteps(steps: Step[], factor: number): Step[] {
  return steps.map((s) => ({ ...s, text: scaleStepText(s.text, factor) }));
}

/** Strips the {{ }} markers without scaling, for plain display. */
export function plainStepText(text: string): string {
  return scaleStepText(text, 1);
}
