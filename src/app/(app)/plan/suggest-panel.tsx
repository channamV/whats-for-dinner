"use client";

import { useState, useTransition } from "react";
import { applySuggestions, suggestForWeek } from "../actions";
import type { PlanSuggestion } from "@/lib/ai/suggest-plan";
import { SparkleIcon } from "@/components/icons";

export function SuggestPanel({ weekStart, dayLabels }: { weekStart: string; dayLabels: Record<string, string> }) {
  const [prefs, setPrefs] = useState("");
  const [onlyEmpty, setOnlyEmpty] = useState(true);
  const [result, setResult] = useState<PlanSuggestion | null>(null);
  const [chosen, setChosen] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function suggest() {
    setError(null);
    setResult(null);
    start(async () => {
      const res = await suggestForWeek(weekStart, prefs, onlyEmpty);
      if ("error" in res) return setError(res.error);
      setResult(res);
      setChosen(new Set(res.picks.map((_, i) => i)));
    });
  }

  function apply() {
    if (!result) return;
    const picks = result.picks.filter((_, i) => chosen.has(i)).map((p) => ({ date: p.date, kind: p.item.kind, id: p.item.id }));
    start(async () => {
      await applySuggestions(picks);
      setResult(null);
    });
  }

  return (
    <details className="card p-4" open={Boolean(result)}>
      <summary className="flex cursor-pointer items-center gap-2 font-semibold">
        <SparkleIcon className="h-5 w-5 text-accent" /> Suggest dinners for this week
      </summary>
      <div className="mt-3 space-y-3">
        <input
          className="input"
          value={prefs}
          onChange={(e) => setPrefs(e.target.value)}
          placeholder="e.g. quick on weeknights, one veggie night, no pork this week"
        />
        <label className="flex items-center gap-2 text-sm text-muted">
          <input type="checkbox" checked={onlyEmpty} onChange={(e) => setOnlyEmpty(e.target.checked)} /> Only fill empty days
        </label>
        <button className="btn-primary" onClick={suggest} disabled={pending}>
          {pending && !result ? "Thinking…" : "Suggest"}
        </button>
        {error && <p className="text-sm text-warn">{error}</p>}

        {result && (
          <div className="space-y-3">
            <ul className="divide-y divide-line rounded-xl border border-line">
              {result.picks.map((p, i) => (
                <li key={i} className="flex items-start gap-3 px-3 py-2.5">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={chosen.has(i)}
                    onChange={(e) => {
                      const next = new Set(chosen);
                      if (e.target.checked) next.add(i);
                      else next.delete(i);
                      setChosen(next);
                    }}
                  />
                  <div className="text-sm">
                    <span className="font-medium">{dayLabels[p.date] ?? p.date}:</span> {p.item.title}
                    <span className="block text-muted">{p.reason}</span>
                  </div>
                </li>
              ))}
            </ul>
            <button className="btn-primary" onClick={apply} disabled={pending || !chosen.size}>
              Add {chosen.size} to plan
            </button>
            {result.new_ideas.length > 0 && (
              <div className="rounded-xl bg-surface-2 p-3 text-sm">
                <p className="mb-1 font-medium">Ideas to add to your library</p>
                <ul className="ml-4 list-disc text-muted">
                  {result.new_ideas.map((n, i) => (
                    <li key={i}><span className="text-ink">{n.title}</span> — {n.why}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </details>
  );
}
