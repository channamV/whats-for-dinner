import { describe, expect, it } from "vitest";
import { LISTED_SERVINGS, MAX_SERVINGS, parseServes } from "./servings";

describe("table sizes", () => {
  it("lists 1 to 12", () => {
    expect(LISTED_SERVINGS).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });
  it("accepts typed-in sizes over 12, up to the maximum", () => {
    expect(parseServes("7", 2)).toBe(7);
    expect(parseServes("15", 2)).toBe(15);
    expect(parseServes(String(MAX_SERVINGS), 2)).toBe(MAX_SERVINGS);
    expect(parseServes(String(MAX_SERVINGS + 1), 2)).toBe(2);
    expect(parseServes("0", 2)).toBe(2);
    expect(parseServes("abc", 2)).toBe(2);
  });
});
