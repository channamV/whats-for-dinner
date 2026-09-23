"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookIcon, CalendarIcon, CartIcon, GearIcon, HomeIcon } from "./icons";

const ITEMS = [
  { href: "/", label: "Tonight", Icon: HomeIcon },
  { href: "/plan", label: "Plan", Icon: CalendarIcon },
  { href: "/recipes", label: "Recipes", Icon: BookIcon },
  { href: "/lists", label: "Groceries", Icon: CartIcon },
  { href: "/settings", label: "Settings", Icon: GearIcon },
];

function isActive(path: string, href: string) {
  return href === "/" ? path === "/" : path.startsWith(href) || (href === "/recipes" && path.startsWith("/meals"));
}

export function Nav({ householdName }: { householdName: string }) {
  const path = usePathname();
  return (
    <>
      <header className="sticky top-0 z-20 hidden border-b border-line bg-bg/90 backdrop-blur md:block">
        <div className="mx-auto flex max-w-5xl items-center gap-6 px-6 py-3">
          <Link href="/" className="font-display text-xl font-bold">What&apos;s for dinner</Link>
          <nav className="flex gap-1">
            {ITEMS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`rounded-lg px-3 py-1.5 text-sm ${isActive(path, href) ? "bg-accent-soft font-medium text-accent" : "text-muted hover:text-ink"}`}
              >
                {label}
              </Link>
            ))}
          </nav>
          <span className="ml-auto text-sm text-muted">{householdName}</span>
        </div>
      </header>
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <div className="grid grid-cols-5">
          {ITEMS.map(({ href, label, Icon }) => {
            const active = isActive(path, href);
            return (
              <Link key={href} href={href} className={`flex flex-col items-center gap-0.5 py-2 text-[11px] ${active ? "text-accent" : "text-muted"}`}>
                <Icon className="h-6 w-6" />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
