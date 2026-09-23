import type { ImportResult } from "../ai/schema";

/** Real importer output for the HelloFresh Sizzling Pork Fajitas card (W07 EN 13). */
export const fajitas: ImportResult = {
  "meal": {
    "title": "Sizzling Pork Fajitas",
    "subtitle": "with Roasted Peppers, Lime Crema and Salsa Fresca",
    "description": "This Tex-Mex classic is the ultimate crowd-pleaser.",
    "total_minutes": 30,
    "tags": [
      "pork",
      "mexican",
      "kid-friendly"
    ],
    "source": "HelloFresh",
    "source_ref": "W07 EN 13",
    "start_notes": [
      "Before starting, preheat the oven to 450°F.",
      "Wash and dry all produce."
    ]
  },
  "dishes": [
    {
      "title": "Sizzling Pork Fajitas with Roasted Peppers",
      "role": "main",
      "description": "Mexican-spiced pork strips with roasted peppers and onions, wrapped in warm flour tortillas.",
      "base_servings": 2,
      "total_minutes": 30,
      "tags": [
        "pork",
        "mexican",
        "kid-friendly"
      ],
      "equipment": [
        "baking sheet",
        "large non-stick pan",
        "medium bowl",
        "aluminum foil",
        "paper towels"
      ],
      "ingredients": [
        {
          "name": "Pork Strips",
          "quantity": 340,
          "unit": "g",
          "note": null,
          "scales": true,
          "pantry": false,
          "category": "meat"
        },
        {
          "name": "Flour Tortillas, 6-inch",
          "quantity": 6,
          "unit": null,
          "note": null,
          "scales": true,
          "pantry": false,
          "category": "bakery"
        },
        {
          "name": "Sweet Bell Pepper",
          "quantity": 160,
          "unit": "g",
          "note": "cored and sliced",
          "scales": true,
          "pantry": false,
          "category": "produce"
        },
        {
          "name": "Red Onion",
          "quantity": 56,
          "unit": "g",
          "note": "half the onion, thinly sliced",
          "scales": true,
          "pantry": false,
          "category": "produce"
        },
        {
          "name": "Mexican Seasoning",
          "quantity": 2,
          "unit": "tbsp",
          "note": "half for veggies, half for pork",
          "scales": true,
          "pantry": false,
          "category": "spices"
        },
        {
          "name": "Chipotle Powder",
          "quantity": 0.125,
          "unit": "tsp",
          "note": "Heat guide: mild 1/8 tsp, medium 1/4 tsp, spicy 1/2 tsp, extra-spicy 1 tsp (dbl for 4 ppl)",
          "scales": false,
          "pantry": false,
          "category": "spices"
        },
        {
          "name": "Oil",
          "quantity": 2,
          "unit": "tbsp",
          "note": "1 tbsp for veggies, 1 tbsp for pork",
          "scales": true,
          "pantry": true,
          "category": "pantry"
        },
        {
          "name": "Salt and Pepper",
          "quantity": null,
          "unit": null,
          "note": null,
          "scales": false,
          "pantry": true,
          "category": "pantry"
        }
      ],
      "steps": [
        {
          "title": "Start here",
          "text": "Before starting, preheat the oven to 450°F. Wash and dry all produce."
        },
        {
          "title": "Roast veggies",
          "text": "Core, then cut pepper into ¼-inch slices. Peel, halve then thinly slice the onion. Toss peppers, {{56 g}} sliced onion, {{1 tbsp}} Mexican Seasoning, {{1 tbsp}} oil and {{=0.125 tsp}} chipotle powder on a baking sheet. Season with salt and pepper. Roast in the middle of the oven, stirring halfway through cooking, until tender, 18-20 min."
        },
        {
          "title": "Prep pork",
          "text": "Pat pork dry with paper towels, then cut into 1-inch pieces. Toss together pork and the remaining {{1 tbsp}} Mexican Seasoning in a medium bowl. Season with salt and pepper."
        },
        {
          "title": "Cook pork",
          "text": "Heat a large non-stick pan over medium-high heat. When hot, add {{1 tbsp}} oil, then pork. Cook, stirring occasionally, until golden-brown and cooked through, 3-4 min. (Don't overcrowd the pan; for 4 ppl cook pork in 2 batches using 1 tbsp oil for each batch.) Cook to a minimum internal temperature of 71°C/160°F."
        },
        {
          "title": "Finish and serve",
          "text": "While pork cooks, wrap {{6}} tortillas in foil. Heat in the middle of the oven, until warm and flexible, 4-5 min. (For 4 ppl, divide tortillas into 2 stacks.) Fill each tortilla with pork and veggies."
        }
      ]
    },
    {
      "title": "Salsa Fresca",
      "role": "topping",
      "description": "Fresh tomato, red onion and lime salsa.",
      "base_servings": 2,
      "total_minutes": 10,
      "tags": [
        "veggie",
        "quick",
        "mexican"
      ],
      "equipment": [
        "small bowl",
        "zester"
      ],
      "ingredients": [
        {
          "name": "Roma Tomato",
          "quantity": 160,
          "unit": "g",
          "note": "cut into ¼-inch pieces",
          "scales": true,
          "pantry": false,
          "category": "produce"
        },
        {
          "name": "Red Onion",
          "quantity": 57,
          "unit": "g",
          "note": "remaining onion, finely chopped",
          "scales": true,
          "pantry": false,
          "category": "produce"
        },
        {
          "name": "Lime",
          "quantity": 0.5,
          "unit": null,
          "note": "juiced (zest reserved for crema)",
          "scales": true,
          "pantry": false,
          "category": "produce"
        },
        {
          "name": "Oil",
          "quantity": 2,
          "unit": "tbsp",
          "note": null,
          "scales": true,
          "pantry": true,
          "category": "pantry"
        },
        {
          "name": "Salt and Pepper",
          "quantity": null,
          "unit": null,
          "note": null,
          "scales": false,
          "pantry": true,
          "category": "pantry"
        }
      ],
      "steps": [
        {
          "title": "Make salsa fresca",
          "text": "Zest, then juice lime (reserve zest for the crema). Cut tomatoes into ¼-inch pieces. Finely chop {{57 g}} onion. Combine tomatoes, chopped onion, {{2 tbsp}} lime juice and {{2 tbsp}} oil in a small bowl. Season with salt and pepper. Set aside."
        }
      ]
    },
    {
      "title": "Lime Crema",
      "role": "sauce",
      "description": "Sour cream brightened with lime zest.",
      "base_servings": 2,
      "total_minutes": 5,
      "tags": [
        "quick",
        "veggie"
      ],
      "equipment": [
        "small bowl",
        "zester"
      ],
      "ingredients": [
        {
          "name": "Sour Cream",
          "quantity": 6,
          "unit": "tbsp",
          "note": null,
          "scales": true,
          "pantry": false,
          "category": "dairy"
        },
        {
          "name": "Lime",
          "quantity": 0.5,
          "unit": null,
          "note": "zested",
          "scales": true,
          "pantry": false,
          "category": "produce"
        },
        {
          "name": "Salt and Pepper",
          "quantity": null,
          "unit": null,
          "note": null,
          "scales": false,
          "pantry": true,
          "category": "pantry"
        }
      ],
      "steps": [
        {
          "title": "Make crema",
          "text": "Combine {{6 tbsp}} sour cream and lime zest in a small bowl. Season with salt and pepper. Set aside."
        }
      ]
    }
  ],
  "warnings": [
    "The card lists one lime (2 person); the zest is used for the crema and the juice for the salsa, so it was split 0.5/0.5 between the two dishes.",
    "Red onion 113 g was split roughly in half between the roasted veggies and the salsa fresca."
  ]
};
