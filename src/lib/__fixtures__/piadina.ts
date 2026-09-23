import type { ImportResult } from "../ai/schema";

/** What the importer should produce for the HelloFresh Pesto Mozzarella Piadina card (W41 R18). */
export const piadina: ImportResult = {
  meal: {
    title: "Pesto Mozzarella Piadina",
    subtitle: "with Roasted Zucchini and Sweet Bell Pepper",
    description: null,
    total_minutes: 30,
    tags: ["veggie", "italian"],
    source: "HelloFresh",
    source_ref: "W41 R18",
    start_notes: ["Preheat the oven to 450°F.", "Wash and dry all produce."],
  },
  dishes: [
    {
      title: "Pesto Mozzarella Piadina",
      role: "main",
      description: "Naan folded over roasted zucchini, peppers, pesto and fresh mozzarella.",
      base_servings: 2,
      total_minutes: 25,
      tags: ["veggie"],
      equipment: ["baking sheet", "aluminum foil", "spatula"],
      ingredients: [
        { name: "Fresh Mozzarella", quantity: 125, unit: "g", note: "torn into small pieces", scales: true, pantry: false, category: "dairy" },
        { name: "Naan Bread", quantity: 2, unit: null, note: null, scales: true, pantry: false, category: "bakery" },
        { name: "Basil Pesto", quantity: 0.25, unit: "cup", note: null, scales: true, pantry: false, category: "pantry" },
        { name: "Zucchini", quantity: 200, unit: "g", note: null, scales: true, pantry: false, category: "produce" },
        { name: "Sweet Bell Pepper", quantity: 160, unit: "g", note: null, scales: true, pantry: false, category: "produce" },
        { name: "Chili Flakes", quantity: 0.5, unit: "tsp", note: "Mild ¼ tsp, Medium ½ tsp, Spicy 1 tsp", scales: false, pantry: false, category: "spices" },
        { name: "Oil", quantity: 1, unit: "tbsp", note: null, scales: true, pantry: true, category: "pantry" },
        { name: "Salt and Pepper", quantity: null, unit: null, note: "to taste", scales: true, pantry: true, category: "spices" },
      ],
      steps: [
        { title: "Roast veggies", text: "Preheat the oven to 450°F. Core, then cut peppers into ¼-inch slices. Cut zucchini in half lengthwise, then into ¼-inch half moons. Toss with {{1 tbsp}} oil and {{=0.5 tsp}} chili flakes on a foil-lined baking sheet. Season with salt and pepper. Roast in the middle of the oven, tossing halfway, until tender-crisp, 5-6 min." },
        { title: "Assemble", text: "Spread pesto over one half of each naan. Top the other side with the roasted veggies, then mozzarella. Fold the naan over the filling." },
        { title: "Bake", text: "Transfer to the same baking sheet and press with a spatula to flatten. Bake in the middle of the oven until golden-brown, 3-4 min. Flip and bake another 3-4 min. Halve to serve." },
      ],
    },
    {
      title: "Spinach and Tomato Salad",
      role: "side",
      description: null,
      base_servings: 2,
      total_minutes: 5,
      tags: ["veggie", "quick"],
      equipment: ["large bowl"],
      ingredients: [
        { name: "Baby Spinach", quantity: 113, unit: "g", note: null, scales: true, pantry: false, category: "produce" },
        { name: "Grape Tomatoes", quantity: 113, unit: "g", note: "halved", scales: true, pantry: false, category: "produce" },
      ],
      steps: [
        { title: null, text: "Halve the tomatoes. Add spinach and tomatoes to the bowl with the balsamic dressing and toss to combine. Season with salt and pepper." },
      ],
    },
    {
      title: "Balsamic Dressing",
      role: "dressing",
      description: null,
      base_servings: 2,
      total_minutes: 2,
      tags: ["veggie", "quick"],
      equipment: ["whisk", "large bowl"],
      ingredients: [
        { name: "Balsamic Vinegar", quantity: 1, unit: "tbsp", note: null, scales: true, pantry: false, category: "pantry" },
        { name: "Sugar", quantity: 0.5, unit: "tsp", note: null, scales: true, pantry: true, category: "pantry" },
        { name: "Oil", quantity: 2, unit: "tbsp", note: null, scales: true, pantry: true, category: "pantry" },
      ],
      steps: [
        { title: null, text: "Whisk together {{1 tbsp}} vinegar, {{0.5 tsp}} sugar and {{2 tbsp}} oil in a large bowl. Season with salt and pepper." },
      ],
    },
  ],
  warnings: [],
};
