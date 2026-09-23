import Link from "next/link";

const SIZES = [1, 2, 3, 4, 5, 6];

export function ServingsPicker({ current, basePath }: { current: number; basePath: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted">Feeds</span>
      <div className="flex rounded-xl border border-line bg-surface p-0.5">
        {SIZES.map((n) => (
          <Link
            key={n}
            href={`${basePath}?serves=${n}`}
            scroll={false}
            replace
            className={`min-w-9 rounded-lg px-2.5 py-1.5 text-center text-sm ${n === current ? "bg-accent font-semibold text-accent-ink" : "text-muted hover:text-ink"}`}
          >
            {n}
          </Link>
        ))}
      </div>
    </div>
  );
}

export function parseServes(v: string | string[] | undefined, fallback: number) {
  const n = Number(Array.isArray(v) ? v[0] : v);
  return Number.isInteger(n) && n >= 1 && n <= 24 ? n : fallback;
}
