import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { getLists } from "@/lib/data";
import { requireHousehold } from "@/lib/session";
import { createList } from "../actions";

export const metadata: Metadata = { title: "Grocery lists" };

export default async function ListsPage() {
  const { supabase } = await requireHousehold();
  const lists = await getLists(supabase);
  const open = lists.filter((l) => !l.archived);
  const done = lists.filter((l) => l.archived);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Grocery lists" subtitle="Build one from your meal plan, a meal, or add items by hand." />
      <form action={createList} className="mb-5 flex gap-2">
        <input className="input" name="name" placeholder="New list name, e.g. Costco run" />
        <button className="btn-primary shrink-0">Create</button>
      </form>
      {open.length === 0 && (
        <p className="card p-6 text-center text-muted">
          No lists yet. Try <Link href="/plan" className="text-accent underline">building one from this week&apos;s plan</Link>.
        </p>
      )}
      <ul className="space-y-2">
        {open.map((l) => <ListRow key={l.id} list={l} />)}
      </ul>
      {done.length > 0 && (
        <>
          <h2 className="mb-2 mt-8 text-sm font-medium uppercase tracking-wide text-muted">Done</h2>
          <ul className="space-y-2 opacity-70">
            {done.map((l) => <ListRow key={l.id} list={l} />)}
          </ul>
        </>
      )}
    </div>
  );
}

function ListRow({ list }: { list: Awaited<ReturnType<typeof getLists>>[number] }) {
  const total = list.items.length;
  const checked = list.items.filter((i) => i.checked).length;
  return (
    <li>
      <Link href={`/lists/${list.id}`} className="card flex items-center justify-between gap-3 p-4 hover:border-accent">
        <span className="font-medium">{list.name}</span>
        <span className="text-sm text-muted">{total ? `${checked}/${total} done` : "empty"}</span>
      </Link>
    </li>
  );
}
