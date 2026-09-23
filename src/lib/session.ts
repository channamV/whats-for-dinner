import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import type { Household } from "./types";

/** The signed-in user and their household. Redirects to login / setup as needed. */
export const requireHousehold = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("household_members")
    .select("household_id, display_name, households(id, name, invite_code, default_servings)")
    .eq("user_id", user.id)
    .order("created_at")
    .limit(1)
    .maybeSingle();

  if (!membership?.households) redirect("/welcome");

  return {
    supabase,
    user,
    household: membership.households as unknown as Household,
    displayName: membership.display_name as string | null,
  };
});
