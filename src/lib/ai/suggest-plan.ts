import "server-only";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { anthropic, MODEL } from "./client";

export type LibraryItem = {
  key: string;
  kind: "meal" | "recipe";
  id: string;
  title: string;
  tags: string[];
  total_minutes: number | null;
  favorite: boolean;
  last_planned: string | null;
};

const SuggestionSchema = z.object({
  picks: z.array(
    z.object({
      date: z.string().describe("YYYY-MM-DD, one of the requested dates"),
      key: z.string().describe("The library key, e.g. m3"),
      reason: z.string().describe("A few words on why, e.g. 'quick weeknight, not had in 3 weeks'"),
    }),
  ),
  new_ideas: z
    .array(z.object({ title: z.string(), why: z.string() }))
    .describe("Up to 3 dishes worth adding to the library that fit the request"),
});

export type PlanSuggestion = {
  picks: { date: string; item: LibraryItem; reason: string }[];
  new_ideas: { title: string; why: string }[];
};

export async function suggestPlan(opts: {
  library: LibraryItem[];
  dates: string[];
  preferences: string;
  today: string;
}): Promise<PlanSuggestion> {
  const libraryText = opts.library
    .map(
      (i) =>
        `${i.key} | ${i.title}${i.favorite ? " ★ favourite" : ""} | tags: ${i.tags.join(", ") || "-"} | ${
          i.total_minutes ?? "?"
        } min | last planned: ${i.last_planned ?? "never"}`,
    )
    .join("\n");

  const response = await anthropic().messages.parse({
    model: MODEL,
    max_tokens: 8000,
    thinking: { type: "adaptive" },
    output_config: { effort: "low", format: zodOutputFormat(SuggestionSchema) },
    system:
      "You plan family dinners from the household's own recipe library. Pick one library item per requested date. Prefer variety across proteins and cuisines, avoid repeating anything planned in the last two weeks unless the library is small, favour quicker meals on weekdays, include the family's ★ favourites more often (while still avoiding recent repeats), and follow the user's preferences. Only use keys that appear in the library.",
    messages: [
      {
        role: "user",
        content: `Today is ${opts.today}.\n\nDates to plan: ${opts.dates.join(", ")}\n\nPreferences: ${
          opts.preferences.trim() || "none"
        }\n\nLibrary (key | title | tags | time | last planned):\n${libraryText}`,
      },
    ],
  });

  if (response.stop_reason === "refusal" || !response.parsed_output) {
    throw new Error("Couldn't come up with suggestions this time. Try again or adjust your preferences.");
  }

  const byKey = new Map(opts.library.map((i) => [i.key, i]));
  const wanted = new Set(opts.dates);
  const picks = response.parsed_output.picks
    .filter((p) => wanted.has(p.date) && byKey.has(p.key))
    .map((p) => ({ date: p.date, item: byKey.get(p.key)!, reason: p.reason }));
  return { picks, new_ideas: response.parsed_output.new_ideas.slice(0, 3) };
}
