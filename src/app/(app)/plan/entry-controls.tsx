"use client";

import { useTransition } from "react";
import { removePlanEntry, setPlanCooked, setPlanServings } from "../actions";
import { TrashIcon } from "@/components/icons";
import { ServingsSelect } from "@/components/servings-select";

export function EntryControls({ id, servings, cooked }: { id: string; servings: number; cooked: boolean }) {
  const [pending, start] = useTransition();
  return (
    <div className={`flex items-center gap-1 ${pending ? "opacity-50" : ""}`}>
      <ServingsSelect
        key={servings}
        defaultValue={servings}
        prefix="Feeds "
        ariaLabel="Feeds how many people"
        onChange={(n) => start(() => setPlanServings(id, n))}
      />
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
