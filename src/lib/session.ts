import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import type { Household } from "./types";

export type Family = Household & { displayName: string | null; role: string };

/**
 * The signed-in user and their current family (the one they last switched to,
 * created or joined - the same rule the database uses for access). Redirects
 * to login / setup as needed.
 */
export const requireHousehold = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const select = "household_id, display_name, role, created_at, households(id, name, invite_code, default_servings)";
  const { data, error } = await supabase
    .from("household_members")
    .select(select)
    .eq("user_id", user.id)
    .order("selected_at", { ascending: false, nullsFirst: false })
    .order("created_at")
    .order("household_id");
  // Before migration 0009 there's no selected_at and only the first family is used.
  const rows = error
    ? (await supabase.from("household_members").select(select).eq("user_id", user.id).order("created_at").limit(1)).data
    : data;

  const families: Family[] = (rows ?? [])
    .filter((r) => r.households)
    .map((r) => ({ ...(r.households as unknown as Household), displayName: r.display_name, role: r.role }));
  const current = families[0];
  if (!current) redirect("/welcome");

  return {
    supabase,
    user,
    household: { id: current.id, name: current.name, invite_code: current.invite_code, default_servings: current.default_servings } as Household,
    displayName: current.displayName,
    families: [...families].sort((a, b) => a.name.localeCompare(b.name)),
  };
});
