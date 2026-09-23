import { describe, expect, it } from "vitest";
import { buildGroceryLines, normalizeName } from "./grocery";
import { piadina } from "./__fixtures__/piadina";
import type { Ingredient } from "./types";

const ing = (name: string, quantity: number | null, unit: string | null, extra: Partial<Ingredient> = {}): Ingredient => ({
  name,
  quantity,
  unit,
  note: null,
  scales: true,
  pantry: false,
  category: "produce",
  ...extra,
});

describe("normalizeName", () => {
  it("merges plurals", () => {
    expect(normalizeName("Roma Tomatoes")).toBe(normalizeName("roma tomato"));
    expect(normalizeName("Sweet Bell Peppers")).toBe(normalizeName("Sweet Bell Pepper"));
    expect(normalizeName("Baby Spinach")).toBe("baby spinach");
  });
});

describe("buildGroceryLines", () => {
  it("builds a list for the whole piadina meal, leaving out pantry items", () => {
    const lines = buildGroceryLines(
      piadina.dishes.map((d) => ({ label: d.title, ingredients: d.ingredients, baseServings: d.base_servings, servings: 4 })),
    );
    const names = lines.map((l) => l.name);
    expect(names).not.toContain("Oil");
    expect(names).not.toContain("Sugar");
    expect(lines.find((l) => l.name === "Fresh Mozzarella")).toMatchObject({ quantity: 250, unit: "g" });
    expect(lines.find((l) => l.name === "Balsamic Vinegar")).toMatchObject({ quantity: 2, unit: "tbsp" });
  });

  it("merges the same ingredient across recipes and converts units", () => {
    const lines = buildGroceryLines([
      { label: "Fajitas", ingredients: [ing("Red Onion", 113, "g"), ing("Lime", 1, null)], baseServings: 2, servings: 2 },
      { label: "Salsa", ingredients: [ing("red onions", 0.5, "kg"), ing("Limes", 2, null)], baseServings: 4, servings: 4 },
    ]);
    expect(lines.find((l) => l.name === "Red Onion")).toMatchObject({ quantity: 613, unit: "g", sources: ["Fajitas", "Salsa"] });
    expect(lines.find((l) => l.name === "Lime")).toMatchObject({ quantity: 3, unit: null });
  });

  it("rolls spoons up into cups", () => {
    const lines = buildGroceryLines([
      { label: "A", ingredients: [ing("Sour Cream", 6, "tbsp", { category: "dairy" })], baseServings: 2, servings: 4 },
    ]);
    expect(lines[0].unit).toBe("cup");
    expect(lines[0].quantity).toBeCloseTo(0.75, 2);
  });

  it("keeps pantry items when asked", () => {
    const lines = buildGroceryLines(
      piadina.dishes.map((d) => ({ label: d.title, ingredients: d.ingredients, baseServings: 2, servings: 2 })),
      { includePantry: true },
    );
    expect(lines.find((l) => l.name === "Oil")).toMatchObject({ quantity: 3, unit: "tbsp" });
  });
});

describe("real import: pork fajitas", () => {
  it("recombines ingredients the importer split between dishes", async () => {
    const { fajitas } = await import("./__fixtures__/fajitas");
    const lines = buildGroceryLines(
      fajitas.dishes.map((d) => ({ label: d.title, ingredients: d.ingredients, baseServings: d.base_servings, servings: 4 })),
    );
    expect(lines.find((l) => l.name === "Lime")?.quantity).toBe(2);
    expect(lines.find((l) => l.name === "Red Onion")).toMatchObject({ quantity: 226, unit: "g" });
    expect(lines.find((l) => l.name === "Pork Strips")).toMatchObject({ quantity: 680, unit: "g" });
    expect(lines.find((l) => l.name.startsWith("Chipotle"))?.quantity).toBe(0.125); // fixed amount
  });
});
