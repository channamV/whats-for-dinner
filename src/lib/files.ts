import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { BUCKET } from "./supabase/env";

export const THUMB_SUFFIX = ".thumb.jpg";

/** Signed links to original recipe cards/photos (and PDF thumbnails), valid for an hour. */
export async function signedFileLinks(sb: SupabaseClient, paths: string[]) {
  if (!paths.length) return [];
  const pdfs = paths.filter(isPdf);
  const { data } = await sb.storage.from(BUCKET).createSignedUrls([...paths, ...pdfs.map((p) => p + THUMB_SUFFIX)], 60 * 60);
  const url = new Map((data ?? []).filter((s) => s.signedUrl && s.path).map((s) => [s.path!, s.signedUrl]));
  const photos = paths.filter((p) => !isPdf(p));
  return paths
    .filter((p) => url.has(p))
    .map((p) => ({
      path: p,
      url: url.get(p)!,
      isPdf: isPdf(p),
      thumbUrl: isPdf(p) ? (url.get(p + THUMB_SUFFIX) ?? null) : url.get(p)!,
      label: isPdf(p)
        ? "Original recipe card (PDF)"
        : `Original photo${photos.length > 1 ? ` ${photos.indexOf(p) + 1}` : ""}`,
    }));
}

function isPdf(path: string) {
  return path.toLowerCase().endsWith(".pdf");
}

/** A thumbnail is kept exactly as long as the file it was made from. */
function baseOf(path: string) {
  return path.endsWith(THUMB_SUFFIX) ? path.slice(0, -THUMB_SUFFIX.length) : path;
}

/** Of the given paths, the ones no meal or dish refers to any more. */
async function unreferenced(sb: SupabaseClient, paths: string[]) {
  if (!paths.length) return [];
  const bases = [...new Set(paths.map(baseOf))];
  const [{ data: meals }, { data: recipes }] = await Promise.all([
    sb.from("meals").select("source_files").overlaps("source_files", bases),
    sb.from("recipes").select("source_files").overlaps("source_files", bases),
  ]);
  const used = new Set([...(meals ?? []), ...(recipes ?? [])].flatMap((r) => r.source_files as string[]));
  return paths.filter((p) => !used.has(baseOf(p)));
}

/** Deletes stored files once nothing links to them. Call after deleting a meal or dish. */
export async function removeUnusedFiles(sb: SupabaseClient, paths: string[]) {
  const withThumbs = paths.flatMap((p) => (isPdf(p) ? [p, p + THUMB_SUFFIX] : [p]));
  const remove = await unreferenced(sb, [...new Set(withThumbs)]);
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
