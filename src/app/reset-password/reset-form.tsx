"use client";

import { useActionState } from "react";
import { updatePassword, type AuthState } from "../login/actions";

export function ResetForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(updatePassword, {});
  return (
    <form action={action} className="card space-y-4 p-6">
      <div>
        <label className="label" htmlFor="password">New password</label>
        <input className="input" id="password" name="password" type="password" minLength={8} autoComplete="new-password" required />
      </div>
      <div>
        <label className="label" htmlFor="confirm">Type it again</label>
        <input className="input" id="confirm" name="confirm" type="password" minLength={8} autoComplete="new-password" required />
      </div>
      {state.error && <p className="rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn">{state.error}</p>}
      <button className="btn-primary w-full" disabled={pending}>{pending ? "Saving…" : "Save password"}</button>
    </form>
  );
}
