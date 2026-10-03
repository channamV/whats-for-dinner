/** Table sizes offered in the list; anything bigger is typed in ("More…"). */
export const LISTED_SERVINGS = Array.from({ length: 12 }, (_, i) => i + 1);
/** Largest table size we accept anywhere (matches the database checks). */
export const MAX_SERVINGS = 100;

export function isServings(n: unknown): n is number {
  return typeof n === "number" && Number.isInteger(n) && n >= 1 && n <= MAX_SERVINGS;
}

export function parseServes(v: string | string[] | undefined | null, fallback: number) {
  const n = Number(Array.isArray(v) ? v[0] : v);
  return isServings(n) ? n : fallback;
}
