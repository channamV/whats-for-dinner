import Link from "next/link";
import { Nav } from "@/components/nav";
import { requireHousehold } from "@/lib/session";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const { household, families } = await requireHousehold();
  return (
    <>
      <Nav householdName={household.name} />
      {families.length > 1 && (
        // The phone layout has no header, so show which family you're in.
        <Link href="/settings#families" className="block border-b border-line px-4 py-1.5 text-center text-xs text-muted md:hidden">
          {household.name} · <span className="text-accent">switch</span>
        </Link>
      )}
      <main className="mx-auto max-w-5xl px-4 pb-28 pt-5 md:px-6 md:pb-12 md:pt-8">{children}</main>
    </>
  );
}
