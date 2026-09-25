import { NextResponse, type NextRequest } from "next/server";
import { createClient as createSupabase } from "@supabase/supabase-js";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase/env";
import { hashShortcutKey, readRemindersPayload } from "@/lib/shortcuts";
import { fallbackParse, parseGroceryLines, type ParsedGroceryItem } from "@/lib/ai/grocery-items";
import { buildGroceryLines, type IngredientSource } from "@/lib/grocery";
import type { GroceryItem } from "@/lib/types";

export const maxDuration = 60;

/**
 * Called by the household's Apple Shortcut ("Sync groceries"). Adds items from
 * iPhone Reminders lists to the household's current grocery list, merging with
 * what's already there. The Shortcuts key is the only credential; the database
 * functions check it and only touch that household's list.
 *
 * Two ways to call it:
 * - Simple (what the setup guide uses): POST the list's items as plain text, one per
 *   line, to /api/shortcuts/sync?list=Costco. The reply is a plain sentence that
 *   starts with "Added" on success, so the Shortcut can show it and check it.
 * - JSON: { "Grocery": "milk\neggs", "Costco": [...] } (or { lists: {...} }); JSON reply.
 */
export async function POST(request: NextRequest) {
  const raw = await request.text().catch(() => "");
  let json: unknown = null;
  try {
    json = raw.trim().startsWith("{") ? JSON.parse(raw) : null;
  } catch {}
  const listParam = request.nextUrl.searchParams.get("list")?.trim() || "Grocery";
  const body = json ?? { [listParam]: raw };
  const asText = !json || request.nextUrl.searchParams.get("format") === "text";
  const reply = (status: number, message: string, extra: Record<string, unknown> = {}) =>
    asText
      ? new NextResponse(status < 300 ? message : `Sync failed: ${message}`, { status, headers: { "content-type": "text/plain; charset=utf-8" } })
      : NextResponse.json({ ok: status < 300, message, ...extra }, { status });

  const auth = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  const key = auth || (json && typeof json === "object" ? String((json as Record<string, unknown>).key ?? "") : "");
  if (!key) return reply(401, "Missing Shortcuts key. Add it to the Authorization header in the Shortcut.");

  const supabase = createSupabase(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
  const keyHash = hashShortcutKey(key);

  const lines = readRemindersPayload(body);

  const { data: snap, error: snapError } = await supabase.rpc("shortcut_snapshot", { p_key_hash: keyHash });
  if (snapError || !snap) {
    return snapError?.message.includes("invalid shortcuts key")
      ? reply(401, "That Shortcuts key isn't valid any more. Create a new one in What's for dinner → Settings.")
      : reply(500, "Couldn't reach your grocery list. Try again in a minute.");
  }
  const { list_id: listId, list_name: listName, items } = snap as { list_id: string; list_name: string; items: GroceryItem[] };

  if (!lines.length) return reply(200, `Nothing new to add from ${listParam}.`, { added: 0, list: listName });

  let parsed: ParsedGroceryItem[];
  try {
    parsed = process.env.ANTHROPIC_API_KEY ? await parseGroceryLines(lines.map((l) => l.text)) : lines.map((l) => fallbackParse(l.text));
  } catch {
    parsed = lines.map((l) => fallbackParse(l.text));
  }

  const existing: IngredientSource[] = items.map((item) => ({
    label: item.sources?.join(" · ") || "Added by hand",
    ingredients: [{ name: item.name, quantity: item.quantity == null ? null : Number(item.quantity), unit: item.unit, note: item.note, scales: true, pantry: false, category: item.category }],
    baseServings: 1,
    servings: 1,
    store: item.store,
  }));
  const incoming: IngredientSource[] = parsed.map((p, i) => ({
    label: "Reminders",
    ingredients: [{ name: p.name, quantity: p.quantity, unit: p.unit, note: p.note, scales: true, pantry: false, category: p.category }],
    baseServings: 1,
    servings: 1,
    store: lines[i].store,
  }));
  const merged = buildGroceryLines([...existing, ...incoming], { includePantry: true });
  const notes = new Map([...items.map((i) => [i.name.toLowerCase(), i.note] as const), ...parsed.map((p) => [p.name.toLowerCase(), p.note] as const)]);

  const { error: saveError } = await supabase.rpc("shortcut_replace_items", {
    p_key_hash: keyHash,
    p_list_id: listId,
    p_remove: items.map((i) => i.id),
    p_items: merged.map((l, i) => ({
      name: l.name,
      quantity: l.quantity == null ? null : Math.round(l.quantity * 1000) / 1000,
      unit: l.unit,
      category: l.category,
      store: l.store,
      note: notes.get(l.name.toLowerCase()) ?? null,
      sources: [...new Set(l.sources.flatMap((s) => s.split(" · ")))].filter((s) => s !== "Added by hand"),
      position: i,
    })),
  });
  if (saveError) return reply(500, "Couldn't save to your grocery list. Nothing was changed; try again.");

  const stores = [...new Set(lines.map((l) => l.store).filter(Boolean))];
  const message = `Added ${lines.length} item${lines.length === 1 ? "" : "s"} to "${listName}"${stores.length ? ` (incl. ${stores.join(", ")})` : ""}.`;
  return reply(200, message, { added: lines.length, list: listName });
}

