"use client";

import { useActionState, useState } from "react";
import { requestPasswordReset, resendConfirmation, signIn, signUp, type AuthState } from "./actions";

type Mode = "in" | "up" | "forgot";

const TITLES: Record<Mode, string> = { in: "Sign in", up: "Create account", forgot: "Send reset link" };

export function LoginForm({ next, linkError, invited }: { next: string; linkError: boolean; invited: boolean }) {
  const [mode, setMode] = useState<Mode>(invited ? "up" : "in");
  const [email, setEmail] = useState("");
  const [wantResend, setWantResend] = useState(false);
  const [signInState, signInAction, signingIn] = useActionState<AuthState, FormData>(signIn, {});
  const [signUpState, signUpAction, signingUp] = useActionState<AuthState, FormData>(signUp, {});
  const [forgotState, forgotAction, sendingReset] = useActionState<AuthState, FormData>(requestPasswordReset, {});
  const [resendState, resendAction, resending] = useActionState<AuthState, FormData>(resendConfirmation, {});

  const state = mode === "in" ? signInState : mode === "up" ? signUpState : forgotState;
  const action = mode === "in" ? signInAction : mode === "up" ? signUpAction : forgotAction;
  const pending = signingIn || signingUp || sendingReset;
  const showResend = mode !== "forgot" && (wantResend || state.unconfirmed || resendState.unconfirmed);

  const switchTo = (m: Mode) => (
    <button type="button" className="font-medium text-accent" onClick={() => setMode(m)}>
      {m === "in" ? "Sign in" : m === "up" ? "Create an account" : "Forgot password?"}
    </button>
  );

  return (
    <div className="card space-y-4 p-6">
      {invited && (
        <p className="rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent">
          You&apos;ve been invited to join a household. {mode === "up" ? "Create an account" : "Sign in"} and you&apos;ll join it
          straight away.
        </p>
      )}
      {linkError && !state.error && !state.message && (
        <p className="rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn">
          That link has expired or was opened in a different browser. Sign in, or request a new link below.
        </p>
      )}

      <form action={action} className="space-y-4">
        <input type="hidden" name="next" value={next} />
        {mode === "forgot" && <p className="text-sm text-muted">Enter your email and we&apos;ll send a link to set a new password.</p>}
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input
            className="input"
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        {mode !== "forgot" && (
          <div>
            <div className="flex items-baseline justify-between">
              <label className="label" htmlFor="password">Password</label>
              {mode === "in" && <span className="text-xs">{switchTo("forgot")}</span>}
            </div>
            <input
              className="input"
              id="password"
              name="password"
              type="password"
              minLength={8}
              autoComplete={mode === "in" ? "current-password" : "new-password"}
              required
            />
            {mode === "up" && <p className="mt-1 text-xs text-muted">At least 8 characters.</p>}
          </div>
        )}
        {state.error && <p className="rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn">{state.error}</p>}
        {state.message && <p className="rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent">{state.message}</p>}
        <button className="btn-primary w-full" disabled={pending}>
          {pending ? "One moment…" : TITLES[mode]}
        </button>
      </form>

      {showResend && (
        <form action={resendAction} className="space-y-2 border-t border-line pt-4">
          <input type="hidden" name="email" value={email} />
          <input type="hidden" name="next" value={next} />
          {resendState.error && <p className="rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn">{resendState.error}</p>}
          {resendState.message && <p className="rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent">{resendState.message}</p>}
          <button className="btn-secondary w-full" disabled={resending || !email}>
            {resending ? "Sending…" : "Resend confirmation email"}
          </button>
        </form>
      )}

      <p className="text-center text-sm text-muted">
        {mode === "in" ? (
          <>New here? {switchTo("up")}</>
        ) : mode === "up" ? (
          <>Already have an account? {switchTo("in")}</>
        ) : (
          <>Remembered it? {switchTo("in")}</>
        )}
      </p>
      {mode !== "forgot" && !showResend && (
        <p className="text-center text-sm text-muted">
          Didn&apos;t get a confirmation email?{" "}
          <button type="button" className="font-medium text-accent" onClick={() => setWantResend(true)}>
            Resend it
          </button>
        </p>
      )}
    </div>
  );
}
