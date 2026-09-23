import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { BUCKET } from "./supabase/env";

/** Signed links to original recipe cards/photos, valid for an hour. */
export async function signedFileLinks(sb: SupabaseClient, paths: string[]) {
  if (!paths.length) return [];
  const { data } = await sb.storage.from(BUCKET).createSignedUrls(paths, 60 * 60);
  return (data ?? [])
    .filter((s) => s.signedUrl && s.path)
    .map((s, i) => ({
      path: s.path!,
      url: s.signedUrl!,
      label: s.path!.toLowerCase().endsWith(".pdf") ? "Original recipe card (PDF)" : `Original photo${paths.length > 1 ? ` ${i + 1}` : ""}`,
    }));
}

/** Of the given paths, the ones no meal or dish refers to any more. */
async function unreferenced(sb: SupabaseClient, paths: string[]) {
  if (!paths.length) return [];
  const [{ data: meals }, { data: recipes }] = await Promise.all([
    sb.from("meals").select("source_files").overlaps("source_files", paths),
    sb.from("recipes").select("source_files").overlaps("source_files", paths),
  ]);
  const used = new Set([...(meals ?? []), ...(recipes ?? [])].flatMap((r) => r.source_files as string[]));
  return paths.filter((p) => !used.has(p));
}

/** Deletes stored files once nothing links to them. Call after deleting a meal or dish. */
export async function removeUnusedFiles(sb: SupabaseClient, paths: string[]) {
  const remove = await unreferenced(sb, [...new Set(paths)]);
  if (remove.length) await sb.storage.from(BUCKET).remove(remove);
}

const ABANDONED_AFTER_MS = 24 * 60 * 60 * 1000;

/**
 * Clears out uploads from imports that were never saved. Only touches files
 * older than a day, so an import someone is part-way through is left alone.
 */
export async function sweepAbandonedUploads(sb: SupabaseClient, householdId: string) {
  const folder = `${householdId}/imports`;
  const { data } = await sb.storage.from(BUCKET).list(folder, { limit: 1000, sortBy: { column: "created_at", order: "asc" } });
  const cutoff = Date.now() - ABANDONED_AFTER_MS;
  const old = (data ?? [])
    .filter((f) => f.id && f.created_at && new Date(f.created_at).getTime() < cutoff)
    .map((f) => `${folder}/${f.name}`);
  const remove = await unreferenced(sb, old);
  if (remove.length) await sb.storage.from(BUCKET).remove(remove);
}
