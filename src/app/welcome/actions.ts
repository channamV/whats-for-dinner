"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type WelcomeState = { error?: string };

export async function createHousehold(_: WelcomeState, form: FormData): Promise<WelcomeState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_household", {
    p_name: String(form.get("name") ?? ""),
    p_display_name: String(form.get("display_name") ?? "") || null,
  });
  if (error) return { error: error.message };
  redirect("/");
}

export async function joinHousehold(_: WelcomeState, form: FormData): Promise<WelcomeState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("join_household", {
    p_code: String(form.get("code") ?? ""),
    p_display_name: String(form.get("display_name") ?? "") || null,
  });
  if (error) return { error: error.message.includes("invalid") ? "That invite code didn't match a household." : error.message };
  redirect("/");
}
