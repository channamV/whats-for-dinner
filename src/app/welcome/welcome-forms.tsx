"use client";

import { useActionState } from "react";
import { Spinner } from "@/components/spinner";
import { createHousehold, joinHousehold, type WelcomeState } from "./actions";

/** `another` is for someone already in a family adding a second one (from Settings or an invite link). */
export function WelcomeForms({ inviteCode, another = false }: { inviteCode: string; another?: boolean }) {
  const [createState, create, creating] = useActionState<WelcomeState, FormData>(createHousehold, {});
  const [joinState, join, joining] = useActionState<WelcomeState, FormData>(joinHousehold, {});
  const invited = Boolean(inviteCode);

  const joinForm = (
    <form action={join} className="card space-y-3 p-5">
      <h2 className="font-display text-xl font-semibold">{another ? "Join another family" : "Join your family"}</h2>
      <p className="text-sm text-muted">
        {invited
          ? "Your invite code is filled in. Add your name and join."
          : "Ask whoever set it up for the invite code (it's on their Settings page)."}
        {another && " You'll switch to it, and can switch back any time in Settings."}
      </p>
      <input className="input uppercase tracking-widest" name="code" placeholder="INVITE CODE" defaultValue={inviteCode} required />
      <input className="input" name="display_name" placeholder="Your first name (optional)" />
      {joinState.error && <p className="text-sm text-warn">{joinState.error}</p>}
      <button className={`${invited ? "btn-primary" : "btn-secondary"} w-full`} disabled={joining}>
        {joining && <Spinner />}
        Join household
      </button>
    </form>
  );

  const createForm = (
    <form action={create} className="card space-y-3 p-5">
      <h2 className="font-display text-xl font-semibold">{another ? "Start another family" : "Start a household"}</h2>
      <p className="text-sm text-muted">
        {another
          ? "It starts empty, with its own recipes, plan, grocery lists and invite code. You'll switch to it."
          : "You'll get an invite code to share with family."}
      </p>
      <input className="input" name="name" placeholder={another ? "Family name, e.g. The Smiths" : "Household name, e.g. The Hannams"} required />
      <input className="input" name="display_name" placeholder="Your first name (optional)" />
      {createState.error && <p className="text-sm text-warn">{createState.error}</p>}
      <button className={`${invited ? "btn-secondary" : "btn-primary"} w-full`} disabled={creating}>
        {creating && <Spinner />}
        Create household
      </button>
    </form>
  );

  // Someone arriving from an invite link most likely wants to join, so show that first.
  return (
    <div className="space-y-4">
      {invited ? joinForm : createForm}
      {invited ? createForm : joinForm}
    </div>
  );
}
