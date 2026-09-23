import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { requireHousehold } from "@/lib/session";
import { sweepAbandonedUploads } from "@/lib/files";
import { ImportFlow } from "./import-flow";

export const metadata: Metadata = { title: "Import a recipe" };

export default async function ImportPage() {
  const { supabase, household } = await requireHousehold();
  // Tidy up uploads from imports that were started more than a day ago but never saved.
  await sweepAbandonedUploads(supabase, household.id).catch(() => {});
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Import a recipe" subtitle="Upload a recipe card and the AI splits it into the meal and each of its dishes." />
      <ImportFlow householdId={household.id} />
    </div>
  );
}
