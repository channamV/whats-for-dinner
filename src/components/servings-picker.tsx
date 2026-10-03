"use client";

import { useRouter } from "next/navigation";
import { ServingsSelect } from "./servings-select";

/** "Feeds [n]" on recipe and meal pages; changing it rescales the page. */
export function ServingsPicker({ current, basePath }: { current: number; basePath: string }) {
  const router = useRouter();
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted">Feeds</span>
      <ServingsSelect
        key={current}
        defaultValue={current}
        ariaLabel="Feeds how many people"
        onChange={(n) => router.replace(`${basePath}?serves=${n}`, { scroll: false })}
      />
    </div>
  );
}
