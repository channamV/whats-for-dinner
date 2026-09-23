"use client";

import { useTransition } from "react";
import { removePlanEntry, setPlanCooked, setPlanServings } from "../actions";
import { TrashIcon } from "@/components/icons";

export function EntryControls({ id, servings, cooked }: { id: string; servings: number; cooked: boolean }) {
  const [pending, start] = useTransition();
  return (
    <div className={`flex items-center gap-1 ${pending ? "opacity-50" : ""}`}>
      <select
        className="input w-auto py-1 pl-2 pr-6 text-xs"
        value={servings}
        onChange={(e) => start(() => setPlanServings(id, Number(e.target.value)))}
        aria-label="Servings"
      >
        {[1, 2, 3, 4, 5, 6, 8, 10].map((n) => (
          <option key={n} value={n}>Feeds {n}</option>
        ))}
      </select>
      <button
        className={`btn px-2 py-1 text-xs ${cooked ? "bg-accent-soft text-accent" : "text-muted hover:bg-surface-2"}`}
        onClick={() => start(() => setPlanCooked(id, !cooked))}
        title={cooked ? "Cooked" : "Mark as cooked"}
      >
        {cooked ? "✓ Cooked" : "Cooked?"}
      </button>
      <button className="btn-ghost px-2 py-1" onClick={() => start(() => removePlanEntry(id))} aria-label="Remove from plan">
        <TrashIcon className="h-4 w-4" />
      </button>
    </div>
  );
}
