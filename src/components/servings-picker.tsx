"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "./spinner";
import { ServingsSelect } from "./servings-select";

/** "Feeds [n]" on recipe and meal pages; changing it rescales the page. */
export function ServingsPicker({ current, basePath }: { current: number; basePath: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted">Feeds</span>
      <ServingsSelect
        key={current}
        defaultValue={current}
        ariaLabel="Feeds how many people"
        onChange={(n) => start(() => router.replace(`${basePath}?serves=${n}`, { scroll: false }))}
      />
      {pending && <Spinner className="h-4 w-4 text-muted" />}
    </div>
  );
}
