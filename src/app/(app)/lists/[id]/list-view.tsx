"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatQuantity, parseQuantity } from "@/lib/quantity";
import { CATEGORIES, type Category, type GroceryItem, type GroceryList } from "@/lib/types";
import { TrashIcon } from "@/components/icons";
import { deleteList, updateList } from "../../actions";

const AISLE_LABELS: Record<Category, string> = {
  produce: "Produce",
  meat: "Meat",
  seafood: "Seafood",
  dairy: "Dairy & eggs",
  bakery: "Bakery",
  pantry: "Pantry",
  spices: "Spices",
  frozen: "Frozen",
  other: "Other",
};

// "Show completed" is remembered on this device; it's a viewing preference, not shared.
const NO_STORE = "__anywhere__";

const SHOW_COMPLETED_KEY = "wfd:show-completed";
const prefListeners = new Set<() => void>();
let memoryPref = false; // used when storage is unavailable (private mode etc.)

function readShowCompleted() {
  try {
    return localStorage.getItem(SHOW_COMPLETED_KEY) === "1";
  } catch {
    return memoryPref;
  }
}

function writeShowCompleted(value: boolean) {
  memoryPref = value;
  try {
    localStorage.setItem(SHOW_COMPLETED_KEY, value ? "1" : "0");
  } catch {}
  prefListeners.forEach((l) => l());
}

function subscribePref(listener: () => void) {
  prefListeners.add(listener);
  return () => prefListeners.delete(listener);
}

const UNIT_WORDS = new Set(["g", "kg", "ml", "l", "tsp", "tbsp", "cup", "cups", "oz", "lb", "lbs", "pkg", "can", "cans", "bunch", "bag"]);

/** "2 kg potatoes" -> { quantity: 2, unit: "kg", name: "potatoes" } */
function parseLine(text: string) {
  const words = text.trim().split(/\s+/);
  const q = words.length > 1 ? parseQuantity(words[0]) : null;
  if (q == null) return { quantity: null, unit: null, name: text.trim() };
  const unit = words.length > 2 && UNIT_WORDS.has(words[1].toLowerCase()) ? words[1] : null;
  return { quantity: q, unit, name: words.slice(unit ? 2 : 1).join(" ") };
}

export function ListView({ list, initialItems }: { list: GroceryList; initialItems: GroceryItem[] }) {
  const supabase = useMemo(() => createClient(), []);
  const [items, setItems] = useState(initialItems);
  const [text, setText] = useState("");
  const [category, setCategory] = useState<Category>("produce");
  // "" = everything, NO_STORE = items that can be bought anywhere, otherwise a store name such as "Costco".
  const [storeFilter, setStoreFilter] = useState("");
  const [name, setName] = useState(list.name);
  const [, start] = useTransition();
  const showCompleted = useSyncExternalStore(subscribePref, readShowCompleted, () => false);
  const [undo, setUndo] = useState<GroceryItem | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function changeShowCompleted(value: boolean) {
    writeShowCompleted(value);
    if (value) setUndo(null);
  }

  useEffect(() => () => {
    if (undoTimer.current) clearTimeout(undoTimer.current);
  }, []);

  // Everyone in the household sees check-offs as they happen.
  useEffect(() => {
    const channel = supabase
      .channel(`list-${list.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "grocery_items", filter: `list_id=eq.${list.id}` }, (payload) => {
        const row = payload.new as GroceryItem;
        setItems((cur) => (cur.some((i) => i.id === row.id) ? cur : [...cur, row]));
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "grocery_items", filter: `list_id=eq.${list.id}` }, (payload) => {
        const row = payload.new as GroceryItem;
        setItems((cur) => cur.map((i) => (i.id === row.id ? row : i)));
      })
      // Delete events can't be filtered by list (they only carry the id), so match locally.
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "grocery_items" }, (payload) => {
        const id = (payload.old as Partial<GroceryItem>).id;
        setItems((cur) => cur.filter((i) => i.id !== id));
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, list.id]);

  async function toggle(item: GroceryItem) {
    const checked = !item.checked;
    setItems((cur) => cur.map((i) => (i.id === item.id ? { ...i, checked } : i)));
    // A ticked item disappears when completed items are hidden, so offer a quick undo.
    if (undoTimer.current) clearTimeout(undoTimer.current);
    if (checked && !showCompleted) {
      setUndo(item);
      undoTimer.current = setTimeout(() => setUndo(null), 5000);
    } else {
      setUndo(null);
    }
    await supabase.from("grocery_items").update({ checked }).eq("id", item.id);
  }

  async function undoTick() {
    if (!undo) return;
    const item = undo;
    setUndo(null);
    setItems((cur) => cur.map((i) => (i.id === item.id ? { ...i, checked: false } : i)));
    await supabase.from("grocery_items").update({ checked: false }).eq("id", item.id);
  }

  async function remove(id: string) {
    setItems((cur) => cur.filter((i) => i.id !== id));
    await supabase.from("grocery_items").delete().eq("id", id);
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    const parsed = parseLine(text);
    setText("");
    const { data } = await supabase
      .from("grocery_items")
      .insert({
        list_id: list.id,
        household_id: list.household_id,
        category,
        // Adding while looking at the Costco items puts the new item on the Costco run too.
        store: storeFilter && storeFilter !== NO_STORE ? storeFilter : null,
        position: items.length,
        ...parsed,
      })
      .select()
      .single();
    if (data) setItems((cur) => (cur.some((i) => i.id === data.id) ? cur : [...cur, data as GroceryItem]));
  }

  async function clearChecked() {
    const ids = items.filter((i) => i.checked).map((i) => i.id);
    setItems((cur) => cur.filter((i) => !i.checked));
    if (ids.length) await supabase.from("grocery_items").delete().in("id", ids);
  }

  const stores = [...new Set(items.map((i) => i.store).filter((x): x is string => Boolean(x)))].sort();
  const activeStore = storeFilter && (storeFilter === NO_STORE || stores.includes(storeFilter)) ? storeFilter : "";
  const inStore = (i: GroceryItem) => !activeStore || (activeStore === NO_STORE ? !i.store : i.store === activeStore);
  const visible = items.filter((i) => inStore(i) && (showCompleted || !i.checked));
  const grouped = CATEGORIES.map((c) => ({
    category: c,
    items: visible.filter((i) => i.category === c).sort((a, b) => Number(a.checked) - Number(b.checked) || a.position - b.position),
  })).filter((g) => g.items.length);
  const remaining = items.filter((i) => !i.checked).length;
  const completed = items.length - remaining;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4">
        <input
          className="w-full bg-transparent font-display text-3xl font-bold outline-none"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => name.trim() && name !== list.name && start(() => updateList(list.id, { name: name.trim() }))}
          aria-label="List name"
        />
        <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
          <p className="text-muted">{remaining ? `${remaining} to get` : items.length ? "All done!" : "Nothing on the list yet"}</p>
          {completed > 0 && (
            <label className="flex cursor-pointer items-center gap-2 text-sm text-muted">
              <span>Show completed ({completed})</span>
              <button
                type="button"
                role="switch"
                aria-checked={showCompleted}
                aria-label="Show completed items"
                onClick={() => changeShowCompleted(!showCompleted)}
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${showCompleted ? "bg-accent" : "bg-line"}`}
              >
                <span
                  className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${showCompleted ? "translate-x-5" : ""}`}
                />
              </button>
            </label>
          )}
        </div>
      </div>

      <form onSubmit={add} className="sticky top-2 z-10 mb-4 flex gap-2 rounded-2xl bg-bg/90 py-1 backdrop-blur md:top-16">
        <input
          className="input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={activeStore && activeStore !== NO_STORE ? `Add to ${activeStore}, e.g. paper towels` : "Add item, e.g. 2 kg potatoes"}
        />
        <select className="input w-auto" value={category} onChange={(e) => setCategory(e.target.value as Category)} aria-label="Aisle">
          {CATEGORIES.map((c) => <option key={c} value={c}>{AISLE_LABELS[c]}</option>)}
        </select>
        <button className="btn-primary shrink-0">Add</button>
      </form>

      {stores.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5" role="group" aria-label="Filter by store">
          {[
            { value: "", label: "Everything", count: remaining },
            ...stores.map((st) => ({ value: st, label: st, count: items.filter((i) => !i.checked && i.store === st).length })),
            { value: NO_STORE, label: "Everywhere else", count: items.filter((i) => !i.checked && !i.store).length },
          ].map((f) => (
            <button
              key={f.value || "all"}
              type="button"
              aria-pressed={activeStore === f.value}
              onClick={() => setStoreFilter(f.value)}
              className={`rounded-full border px-3 py-1 text-sm ${
                activeStore === f.value ? "border-accent bg-accent-soft font-medium text-accent" : "border-line bg-surface text-muted hover:text-ink"
              }`}
            >
              {f.label} <span className="tabular-nums opacity-70">{f.count}</span>
            </button>
          ))}
        </div>
      )}

      {!showCompleted && items.length > 0 && remaining === 0 && (
        <div className="card p-6 text-center">
          <p className="font-medium">Everything&apos;s ticked off. 🎉</p>
          <button className="mt-2 text-sm font-medium text-accent" onClick={() => changeShowCompleted(true)}>
            Show the {completed} completed item{completed === 1 ? "" : "s"}
          </button>
        </div>
      )}

      <div className="space-y-4">
        {grouped.map((g) => (
          <section key={g.category}>
            <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">{AISLE_LABELS[g.category]}</h2>
            <ul className="card divide-y divide-line">
              {g.items.map((item) => (
                <li key={item.id} className="flex items-center gap-3 px-3 py-2.5">
                  <input type="checkbox" className="h-5 w-5 shrink-0 accent-[var(--accent)]" checked={item.checked} onChange={() => toggle(item)} aria-label={item.name} />
                  <button className="min-w-0 flex-1 text-left" onClick={() => toggle(item)}>
                    <span className={item.checked ? "text-muted line-through" : ""}>
                      {item.quantity != null && (
                        <span className="font-medium tabular-nums">{formatQuantity(Number(item.quantity), item.unit)}{item.unit ? ` ${item.unit}` : ""} </span>
                      )}
                      {item.name}
                    </span>
                    {item.store && (
                      <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 align-[1px] text-[11px] font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                        {item.store}
                      </span>
                    )}
                    {item.note && <span className="ml-1 text-xs text-muted">· {item.note}</span>}
                    {item.sources.length > 0 && <span className="block truncate text-xs text-muted">{item.sources.join(", ")}</span>}
                  </button>
                  <button className="btn-ghost px-2 py-1" onClick={() => remove(item.id)} aria-label={`Remove ${item.name}`}>
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <button className="btn-secondary" onClick={clearChecked} disabled={!items.some((i) => i.checked)}>Clear checked</button>
        <button className="btn-secondary" onClick={() => start(() => updateList(list.id, { archived: !list.archived }))}>
          {list.archived ? "Reopen list" : "Mark list done"}
        </button>
        <button
          className="btn-danger"
          onClick={() => confirm("Delete this list?") && start(() => deleteList(list.id))}
        >
          Delete list
        </button>
      </div>
      {undo && (
        <div className="fixed inset-x-0 bottom-20 z-30 flex justify-center px-4 md:bottom-6" role="status">
          <div className="flex items-center gap-3 rounded-xl bg-ink px-4 py-2.5 text-sm text-bg shadow-lg">
            <span className="max-w-56 truncate">Ticked {undo.name}</span>
            <button className="font-semibold text-accent-soft underline" onClick={undoTick}>
              Undo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
