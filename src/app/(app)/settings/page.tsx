import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { InviteActions } from "@/components/invite-actions";
import { PageHeader } from "@/components/page-header";
import { requireHousehold } from "@/lib/session";
import { signOut } from "@/app/login/actions";
import { updateHousehold } from "../actions";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { supabase, user, household, displayName } = await requireHousehold();
  const { data: members } = await supabase
    .from("household_members")
    .select("user_id, display_name, role")
    .eq("household_id", household.id)
    .order("created_at");
  const { data: sync } = await supabase.from("households").select("shortcut_key_created_at").eq("id", household.id).maybeSingle();
  const shortcutsOn = Boolean(sync?.shortcut_key_created_at);
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
  const inviteUrl = `${origin}/welcome?invite=${encodeURIComponent(household.invite_code)}`;

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <PageHeader title="Settings" />

      <form action={updateHousehold} className="card space-y-3 p-4">
        <h2 className="font-semibold">Household</h2>
        <div>
          <label className="label">Household name</label>
          <input className="input" name="name" defaultValue={household.name} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Usual table size</label>
            <select className="input" name="servings" defaultValue={household.default_servings}>
              {[1, 2, 3, 4, 5, 6, 8].map((n) => <option key={n} value={n}>Feeds {n}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Your name</label>
            <input className="input" name="display_name" defaultValue={displayName ?? ""} />
          </div>
        </div>
        <button className="btn-primary">Save</button>
      </form>

      <section className="card space-y-3 p-4">
        <h2 className="font-semibold">Invite family</h2>
        <p className="text-sm text-muted">
          Send them an invite, or have them create an account, choose &ldquo;Join your family&rdquo; and enter this code:
        </p>
        <p className="rounded-xl bg-surface-2 py-3 text-center font-mono text-2xl font-semibold tracking-[0.3em]">{household.invite_code}</p>
        <InviteActions url={inviteUrl} code={household.invite_code} householdName={household.name} fromName={displayName} />
        <ul className="divide-y divide-line text-sm">
          {(members ?? []).map((m) => (
            <li key={m.user_id} className="flex justify-between py-2">
              <span>{m.display_name ?? (m.user_id === user.id ? user.email : "Family member")}{m.user_id === user.id && " (you)"}</span>
              <span className="text-muted">{m.role}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card space-y-2 p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold">iPhone Reminders &amp; Siri</h2>
          <span className={`chip ${shortcutsOn ? "bg-accent-soft text-accent" : ""}`}>{shortcutsOn ? "On" : "Optional"}</span>
        </div>
        <p className="text-sm text-muted">
          Keep adding things with Siri or the Reminders app (including store lists like Costco), then pull them into your grocery list
          with one tap before you shop.
        </p>
        <Link href="/settings/shortcuts" className="btn-secondary">{shortcutsOn ? "Manage" : "Set up"}</Link>
      </section>

      <form action={signOut}>
        <p className="mb-2 text-sm text-muted">Signed in as {user.email}</p>
        <div className="flex gap-2">
          <Link href="/reset-password" className="btn-secondary">Change password</Link>
          <button className="btn-secondary">Sign out</button>
        </div>
      </form>
    </div>
  );
}
