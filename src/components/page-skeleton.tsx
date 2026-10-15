/** Shown instantly while a page loads, so tapping a link always changes the screen right away. */
export function PageSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="mx-auto max-w-3xl animate-pulse space-y-4" role="status" aria-label="Loading">
      <div className="h-8 w-48 rounded-lg bg-surface-2" />
      <div className="h-4 w-72 max-w-full rounded bg-surface-2" />
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="card h-20 bg-surface-2/60" />
      ))}
    </div>
  );
}
