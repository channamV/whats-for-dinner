import { NextResponse, type NextRequest } from "next/server";
import { createClient as createSupabase } from "@supabase/supabase-js";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase/env";
import { hashShortcutKey, storeForList } from "@/lib/shortcuts";
import { formatQuantity } from "@/lib/quantity";

/**
 * Sends the grocery list to iPhone Reminders (called by the household's
 * "Send groceries" Shortcut). Replies with one item per line, e.g. "2 kg Potatoes"
 * or "Paper towels (Kirkland)", for the Reminders list named in ?list=:
 *   ?list=Grocery (or Groceries, Shopping…) → items not marked for a store
 *   ?list=Costco (any other name)           → items marked for that store
 *   ?list=all                               → everything
 *
 * POST sends the items and ticks them off in the app, so they're never sent twice.
 * GET (e.g. opening the address in Safari) only previews and changes nothing.
 */
export async function GET(request: NextRequest) {
  return exportItems(request, false);
}

export async function POST(request: NextRequest) {
  return exportItems(request, true);
}

async function exportItems(request: NextRequest, commit: boolean) {
  const text = (body: string, status = 200) =>
    new NextResponse(body, { status, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });

  const key =
    request.nextUrl.searchParams.get("key")?.trim() || request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (!key) return text("Sync failed: Missing Shortcuts key. Use the web address with your key from the setup page.", 401);

  const listName = request.nextUrl.searchParams.get("list")?.trim() || "Grocery";
  const store = listName.toLowerCase() === "all" ? "*" : storeForList(listName);

  const supabase = createSupabase(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
  const { data, error } = await supabase.rpc("shortcut_export", {
    p_key_hash: hashShortcutKey(key),
    p_store: store,
    p_commit: commit,
  });
  if (error) {
    return error.message.includes("invalid shortcuts key")
      ? text("Sync failed: That Shortcuts key isn't valid any more. Create a new one in What's for dinner → Settings.", 401)
      : text("Sync failed: Couldn't reach your grocery list. Try again in a minute.", 500);
  }

  const rows = (data ?? []) as { name: string; quantity: number | null; unit: string | null; note: string | null; store: string | null }[];
  console.log("[shortcuts/export]", { list: listName, commit, items: rows.length });
  const lines = rows.map((r) => {
    const amount = r.quantity == null ? "" : `${formatQuantity(Number(r.quantity), r.unit)}${r.unit ? ` ${r.unit}` : ""} `;
    const extras = [r.note, store === "*" ? r.store : null].filter(Boolean).join(", ");
    return `${amount}${r.name}${extras ? ` (${extras})` : ""}`.trim();
  });

  if (!commit) {
    return text(
      lines.length
        ? `Preview: the Shortcut would send these ${lines.length} item(s) to "${listName}" and tick them off in the app:\n\n${lines.join("\n")}`
        : `Preview: nothing to send to "${listName}" right now.`,
    );
  }
  // An empty reply means there's nothing to add; the Shortcut checks for that before adding reminders.
  return text(lines.join("\n"));
}
