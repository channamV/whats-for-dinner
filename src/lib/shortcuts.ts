import { createHash, randomBytes } from "node:crypto";

/** A new Shortcuts key. Only its hash is stored; the key itself is shown to the user once. */
export function newShortcutKey() {
  const key = `wfd_${randomBytes(24).toString("base64url")}`;
  return { key, hash: hashShortcutKey(key) };
}

export function hashShortcutKey(key: string) {
  return createHash("sha256").update(key.trim()).digest("hex");
}

/** Reminders lists called "Grocery", "Groceries", "Shopping"… are for anywhere; any other list name is a store. */
export function storeForList(listName: string): string | null {
  const name = listName.trim();
  if (!name || /^(my\s+)?(grocery|groceries|grocery list|shopping|shopping list|food|list|items)$/i.test(name)) return null;
  return name.slice(0, 40);
}

export type ReminderLine = { text: string; store: string | null };

/**
 * Reads what the Shortcut sends. Accepts either
 *   { "lists": { "Grocery": "milk\neggs", "Costco": ["paper towels"] } }
 * or the same list-name keys at the top level. Values may be newline-separated
 * text (what Shortcuts' "Combine Text" produces) or arrays of strings.
 */
export function readRemindersPayload(body: unknown): ReminderLine[] {
  if (!body || typeof body !== "object") return [];
  const obj = body as Record<string, unknown>;
  const lists = obj.lists && typeof obj.lists === "object" ? (obj.lists as Record<string, unknown>) : obj;
  const seen = new Set<string>();
  const out: ReminderLine[] = [];
  for (const [listName, value] of Object.entries(lists)) {
    if (listName === "key" || listName === "lists") continue;
    const texts = Array.isArray(value) ? value.map(String) : typeof value === "string" ? value.split(/\r?\n/) : [];
    const store = storeForList(listName);
    for (const raw of texts) {
      const text = raw.replace(/^[-•*\s]+/, "").trim().slice(0, 200);
      const dedupe = `${text.toLowerCase()}|${store ?? ""}`;
      if (!text || seen.has(dedupe)) continue;
      seen.add(dedupe);
      out.push({ text, store });
    }
  }
  return out.slice(0, 200);
}
