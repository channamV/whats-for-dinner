"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * A thin bar across the top of the screen from the moment an in-app link is
 * tapped until the new page shows, so a tap never looks ignored.
 */
export function NavProgress() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const here = search ? `${pathname}?${search}` : pathname;
  // The URL we were on when the tap happened; the bar hides once the URL moves on.
  const [from, setFrom] = useState<string | null>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || (a.target && a.target !== "_self") || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || url.pathname.startsWith("/api/")) return;
      const current = location.pathname + location.search;
      if (url.pathname + url.search === current) return; // same page, e.g. a #hash link
      setFrom(current);
      window.setTimeout(() => setFrom((f) => (f === current ? null : f)), 15000);
    };
    // iOS Safari only shows :active (pressed) styles when a touch listener exists.
    const noop = () => {};
    document.addEventListener("click", onClick);
    document.addEventListener("touchstart", noop, { passive: true });
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("touchstart", noop);
    };
  }, []);

  if (from === null || from !== here) return null;
  return <div className="nav-progress" role="progressbar" aria-label="Loading" />;
}
