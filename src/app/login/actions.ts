"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error?: string; message?: string; unconfirmed?: boolean };

function safeNext(next: FormDataEntryValue | null) {
  const n = typeof next === "string" ? next : "/";
  return n.startsWith("/") && !n.startsWith("//") ? n : "/";
}

async function origin() {
  const h = await headers();
  return h.get("origin") ?? `https://${h.get("host")}`;
}

function email(form: FormData) {
  return String(form.get("email") ?? "").trim();
}

/** Supabase's messages are terse; say what to do next instead. */
function friendly(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "That email and password don't match. Try again, or reset your password.";
  if (m.includes("rate limit") || m.includes("security purposes"))
    return "Too many emails have been sent recently. Wait a few minutes, then try again.";
  if (m.includes("already registered")) return "There's already an account with that email. Sign in instead, or reset your password.";
  if (m.includes("password") && m.includes("characters")) return "Use a password with at least 8 characters.";
  return message;
}

export async function signIn(_: AuthState, form: FormData): Promise<AuthState> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: email(form),
    password: String(form.get("password") ?? ""),
  });
  if (error) {
    if (error.code === "email_not_confirmed" || error.message.toLowerCase().includes("not confirmed")) {
      return { error: "Your email isn't confirmed yet. Check your inbox, or send a new confirmation link.", unconfirmed: true };
    }
    return { error: friendly(error.message) };
  }
  redirect(safeNext(form.get("next")));
}

/** Where to go after creating an account: the welcome page, keeping an ?invite= code if there is one. */
function welcomeDestination(form: FormData) {
  const next = safeNext(form.get("next"));
  return next.startsWith("/welcome") ? next : "/welcome";
}

export async function signUp(_: AuthState, form: FormData): Promise<AuthState> {
  const supabase = await createClient();
  const welcome = welcomeDestination(form);
  const { data, error } = await supabase.auth.signUp({
    email: email(form),
    password: String(form.get("password") ?? ""),
    options: { emailRedirectTo: `${await origin()}/auth/confirm?next=${encodeURIComponent(welcome)}` },
  });
  if (error) return { error: friendly(error.message) };
  if (data.session) redirect(welcome);
  return {
    message: "Check your email for a confirmation link. Open it in this browser, then you'll be signed in.",
    unconfirmed: true,
  };
}

export async function resendConfirmation(_: AuthState, form: FormData): Promise<AuthState> {
  const address = email(form);
  if (!address) return { error: "Enter your email address first." };
  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: address,
    options: { emailRedirectTo: `${await origin()}/auth/confirm?next=${encodeURIComponent(welcomeDestination(form))}` },
  });
  if (error) return { error: friendly(error.message), unconfirmed: true };
  return { message: `We sent a new confirmation link to ${address}. Open it in this browser.`, unconfirmed: true };
}

export async function requestPasswordReset(_: AuthState, form: FormData): Promise<AuthState> {
  const address = email(form);
  if (!address) return { error: "Enter your email address." };
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(address, {
    redirectTo: `${await origin()}/auth/confirm?next=/reset-password`,
  });
  if (error) return { error: friendly(error.message) };
  // Same message whether or not the account exists.
  return { message: `If there's an account for ${address}, a reset link is on its way. Open it in this browser.` };
}

export async function updatePassword(_: AuthState, form: FormData): Promise<AuthState> {
  const password = String(form.get("password") ?? "");
  if (password.length < 8) return { error: "Use a password with at least 8 characters." };
  if (password !== String(form.get("confirm") ?? "")) return { error: "The two passwords don't match." };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: friendly(error.message) };
  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
