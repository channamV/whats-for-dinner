import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getList } from "@/lib/data";
import { requireHousehold } from "@/lib/session";
import { ListView } from "./list-view";

export const metadata: Metadata = { title: "Grocery list" };

export default async function ListPage(props: PageProps<"/lists/[id]">) {
  const { id } = await props.params;
  const { supabase } = await requireHousehold();
  const data = await getList(supabase, id);
  if (!data) notFound();
  return <ListView list={data.list} initialItems={data.items} />;
}
