"use client";

import { useActionState, useState } from "react";
import { signIn, signUp, type AuthState } from "./actions";

export function LoginForm({ next }: { next: string }) {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [state, action, pending] = useActionState<AuthState, FormData>(mode === "in" ? signIn : signUp, {});

  return (
    <form action={action} className="card space-y-4 p-6">
      <input type="hidden" name="next" value={next} />
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input className="input" id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div>
        <label className="label" htmlFor="password">Password</label>
        <input
          className="input"
          id="password"
          name="password"
          type="password"
          minLength={8}
          autoComplete={mode === "in" ? "current-password" : "new-password"}
          required
        />
      </div>
      {state.error && <p className="rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn">{state.error}</p>}
      {state.message && <p className="rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent">{state.message}</p>}
      <button className="btn-primary w-full" disabled={pending}>
        {pending ? "One moment…" : mode === "in" ? "Sign in" : "Create account"}
      </button>
      <p className="text-center text-sm text-muted">
        {mode === "in" ? "New here?" : "Already have an account?"}{" "}
        <button type="button" className="font-medium text-accent" onClick={() => setMode(mode === "in" ? "up" : "in")}>
          {mode === "in" ? "Create an account" : "Sign in"}
        </button>
      </p>
    </form>
  );
}
