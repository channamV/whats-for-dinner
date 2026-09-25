import { describe, expect, it } from "vitest";
import { readRemindersPayload, storeForList, hashShortcutKey, newShortcutKey } from "./shortcuts";
import { fallbackParse } from "./grocery-parse";
import { buildGroceryLines } from "./grocery";

describe("storeForList", () => {
  it("treats general grocery lists as 'anywhere' and other list names as stores", () => {
    expect(storeForList("Grocery")).toBeNull();
    expect(storeForList("groceries")).toBeNull();
    expect(storeForList("Shopping List")).toBeNull();
    expect(storeForList("Costco")).toBe("Costco");
    expect(storeForList("Superstore ")).toBe("Superstore");
  });
});

describe("readRemindersPayload", () => {
  it("reads Combine Text output (newline-separated) keyed by Reminders list name", () => {
    const lines = readRemindersPayload({ Grocery: "Milk\n2 limes\n\n", Costco: "Paper towels\nmilk" });
    expect(lines).toEqual([
      { text: "Milk", store: null },
      { text: "2 limes", store: null },
      { text: "Paper towels", store: "Costco" },
      { text: "milk", store: "Costco" },
    ]);
  });

  it("accepts a lists object with arrays, ignores the key field and drops duplicates", () => {
    const lines = readRemindersPayload({ key: "wfd_x", lists: { Groceries: ["Eggs", "eggs", " - Bread"] } });
    expect(lines).toEqual([
      { text: "Eggs", store: null },
      { text: "Bread", store: null },
    ]);
  });

  it("returns nothing for junk", () => {
    expect(readRemindersPayload(null)).toEqual([]);
    expect(readRemindersPayload("milk")).toEqual([]);
  });
});

describe("shortcut keys", () => {
  it("hashes consistently and never returns the same key twice", () => {
    const a = newShortcutKey();
    const b = newShortcutKey();
    expect(a.key).toMatch(/^wfd_/);
    expect(a.key).not.toBe(b.key);
    expect(hashShortcutKey(` ${a.key} `)).toBe(a.hash);
  });
});

describe("fallbackParse (used when the AI isn't available)", () => {
  it("pulls out quantity, unit and a likely aisle", () => {
    expect(fallbackParse("2 limes")).toMatchObject({ name: "Limes", quantity: 2, category: "produce" });
    expect(fallbackParse("1.5 kg chicken thighs")).toMatchObject({ name: "Chicken thighs", quantity: 1.5, unit: "kg", category: "meat" });
    expect(fallbackParse("paper towels")).toMatchObject({ name: "Paper towels", quantity: null, category: "other" });
  });
});

describe("store-aware merging", () => {
  it("merges the same item for the same store but keeps Costco items separate", () => {
    const item = (name: string, quantity: number | null) => ({ name, quantity, unit: null, note: null, scales: true, pantry: false, category: "dairy" as const });
    const lines = buildGroceryLines([
      { label: "Plan", ingredients: [item("Milk", 1)], baseServings: 1, servings: 1 },
      { label: "Reminders", ingredients: [item("milk", 1)], baseServings: 1, servings: 1 },
      { label: "Reminders", ingredients: [item("Milk", 2)], baseServings: 1, servings: 1, store: "Costco" },
    ]);
    expect(lines).toHaveLength(2);
    expect(lines.find((l) => !l.store)).toMatchObject({ quantity: 2 });
    expect(lines.find((l) => l.store === "Costco")).toMatchObject({ quantity: 2 });
  });
});
