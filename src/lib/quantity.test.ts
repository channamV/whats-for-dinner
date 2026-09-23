import { describe, expect, it } from "vitest";
import { formatQuantity, parseQuantity, scaleFactor, scaleIngredients, scaleStepText } from "./quantity";
import { piadina } from "./__fixtures__/piadina";

describe("parseQuantity", () => {
  it.each([
    ["1", 1],
    ["1.5", 1.5],
    ["1/2", 0.5],
    ["1 1/2", 1.5],
    ["1½", 1.5],
    ["¼", 0.25],
    ["abc", null],
  ])("%s -> %s", (input, expected) => {
    expect(parseQuantity(input)).toBe(expected);
  });
});

describe("formatQuantity", () => {
  it("uses kitchen fractions for spoons and cups", () => {
    expect(formatQuantity(1.5, "tbsp")).toBe("1½");
    expect(formatQuantity(0.375, "cup")).toBe("⅜");
    expect(formatQuantity(0.75, "tsp")).toBe("¾");
    expect(formatQuantity(3, null)).toBe("3");
  });
  it("rounds metric amounts", () => {
    expect(formatQuantity(187.5, "g")).toBe("188");
    expect(formatQuantity(1.2345, "kg")).toBe("1.23");
  });
});

describe("scaling the piadina", () => {
  const main = piadina.dishes[0];

  it("feeds 4 by doubling scalable ingredients only", () => {
    const scaled = scaleIngredients(main.ingredients, scaleFactor(2, 4));
    const byName = Object.fromEntries(scaled.map((i) => [i.name, i.quantity]));
    expect(byName["Fresh Mozzarella"]).toBe(250);
    expect(byName["Naan Bread"]).toBe(4);
    expect(byName["Chili Flakes"]).toBe(0.5); // same on the card for 2 and 4
    expect(byName["Salt and Pepper"]).toBeNull();
  });

  it("feeds 3 at 1.5x", () => {
    const scaled = scaleIngredients(main.ingredients, scaleFactor(2, 3));
    expect(scaled.find((i) => i.name === "Zucchini")?.quantity).toBe(300);
  });

  it("scales amounts inside step text but leaves fixed ones", () => {
    expect(scaleStepText(main.steps[0].text, 2)).toContain("Toss with 2 tbsp oil and ½ tsp chili flakes");
    expect(scaleStepText("Whisk {{1 tbsp}} vinegar and {{0.5 tsp}} sugar", 1.5)).toBe("Whisk 1½ tbsp vinegar and ¾ tsp sugar");
  });
});

describe("normalizeImport", () => {
  it("maps unexpected roles and aisles onto known values", async () => {
    const { normalizeImport } = await import("./ai/schema");
    const dish = piadina.dishes[1];
    const out = normalizeImport({
      ...piadina,
      dishes: [{ ...dish, role: "Side Dish", base_servings: 0, ingredients: [{ ...dish.ingredients[0], category: "Produce" }] }],
    });
    expect(out.dishes[0].role).toBe("other");
    expect(out.dishes[0].base_servings).toBe(2);
    expect(out.dishes[0].ingredients[0].category).toBe("produce");
  });
});
