import { BookIcon } from "./icons";

/** Links back to the scanned card or photo a meal or dish was imported from. */
export function OriginalLinks({ links }: { links: { path: string; url: string; label: string }[] }) {
  if (!links.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {links.map((l) => (
        <a key={l.path} href={l.url} target="_blank" rel="noreferrer" className="btn-secondary py-1.5 text-sm">
          <BookIcon className="h-4 w-4 text-accent" />
          {l.label}
        </a>
      ))}
    </div>
  );
}
