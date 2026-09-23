import { Nav } from "@/components/nav";
import { requireHousehold } from "@/lib/session";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const { household } = await requireHousehold();
  return (
    <>
      <Nav householdName={household.name} />
      <main className="mx-auto max-w-5xl px-4 pb-28 pt-5 md:px-6 md:pb-12 md:pt-8">{children}</main>
    </>
  );
}
