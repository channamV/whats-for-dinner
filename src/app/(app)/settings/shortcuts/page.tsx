import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { PageHeader } from "@/components/page-header";
import { requireHousehold } from "@/lib/session";
import { ShortcutSetup } from "./shortcut-setup";

export const metadata: Metadata = { title: "iPhone Reminders & Siri" };

export default async function ShortcutsPage() {
  const { supabase, household } = await requireHousehold();
  const { data } = await supabase.from("households").select("shortcut_key_created_at").eq("id", household.id).maybeSingle();
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host") ?? h.get("host")}`;

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/settings" className="text-sm text-accent">← Settings</Link>
      <PageHeader
        title="iPhone Reminders & Siri"
        subtitle="Optional. Send your grocery list to iPhone Reminders before you shop, or pull Siri and Reminders items into the app."
      />
      <ShortcutSetup
        endpoint={`${origin}/api/shortcuts/sync`}
        exportEndpoint={`${origin}/api/shortcuts/export`}
        enabledSince={(data?.shortcut_key_created_at as string | null) ?? null}
      />
    </div>
  );
}
