"use client";

import { useOptimistic, useTransition } from "react";
import { setFavorite } from "@/app/(app)/actions";
import { StarIcon } from "./icons";

export function FavoriteButton({
  kind,
  id,
  favorite,
  withLabel = false,
  className = "",
}: {
  kind: "meal" | "recipe";
  id: string;
  favorite: boolean;
  withLabel?: boolean;
  className?: string;
}) {
  const [on, setOn] = useOptimistic(favorite);
  const [, start] = useTransition();
  const label = on ? "Remove from favourites" : "Add to favourites";

  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={label}
      title={label}
      className={`inline-flex items-center gap-1.5 rounded-lg p-1.5 text-sm transition-colors hover:bg-surface-2 ${
        on ? "text-amber-500" : "text-muted hover:text-ink"
      } ${className}`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        start(async () => {
          setOn(!on);
          await setFavorite(kind, id, !on);
        });
      }}
    >
      <StarIcon className="h-5 w-5" filled={on} />
      {withLabel && <span className={on ? "text-ink" : ""}>{on ? "Favourite" : "Favourite?"}</span>}
    </button>
  );
}
