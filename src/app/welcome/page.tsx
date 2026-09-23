import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WelcomeForms } from "./welcome-forms";

export const metadata: Metadata = { title: "Welcome" };

export default async function WelcomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { count } = await supabase
    .from("household_members")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);
  if (count) redirect("/");

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <h1 className="mb-2 font-display text-3xl font-bold">Welcome!</h1>
      <p className="mb-6 text-muted">Recipes, plans and grocery lists are shared with everyone in your household.</p>
      <WelcomeForms />
    </main>
  );
}
