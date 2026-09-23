import type { Metadata } from "next";
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
        <p className="text-sm text-muted">They create an account, choose &ldquo;Join your family&rdquo;, and enter this code:</p>
        <p className="rounded-xl bg-surface-2 py-3 text-center font-mono text-2xl font-semibold tracking-[0.3em]">{household.invite_code}</p>
        <ul className="divide-y divide-line text-sm">
          {(members ?? []).map((m) => (
            <li key={m.user_id} className="flex justify-between py-2">
              <span>{m.display_name ?? (m.user_id === user.id ? user.email : "Family member")}{m.user_id === user.id && " (you)"}</span>
              <span className="text-muted">{m.role}</span>
            </li>
          ))}
        </ul>
      </section>

      <form action={signOut}>
        <p className="mb-2 text-sm text-muted">Signed in as {user.email}</p>
        <button className="btn-secondary">Sign out</button>
      </form>
    </div>
  );
}
