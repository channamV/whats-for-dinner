/** Names that mean "the normal grocery list", not a particular store. */
const GENERAL = /^(my\s+)?(grocery|groceries|grocery list|groceries list|shopping|shopping list|food|list|items|any|anywhere)$/i;

/**
 * A Reminders list name or typed store → the store to label items with.
 * "Grocery", "Groceries", "Shopping"… mean anywhere (null); anything else, e.g. "Costco", is a store.
 */
export function storeForList(listName: string | null | undefined): string | null {
  const name = (listName ?? "").trim();
  if (!name || GENERAL.test(name)) return null;
  return name.slice(0, 40);
}
