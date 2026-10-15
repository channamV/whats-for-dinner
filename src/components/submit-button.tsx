"use client";

import { useFormStatus } from "react-dom";
import { Spinner } from "./spinner";

/**
 * A form's submit button that shows a spinner from the moment it's tapped
 * until the server action finishes, and ignores repeat taps meanwhile.
 */
export function SubmitButton({ className = "btn-primary", children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { pending } = useFormStatus();
  return (
    <button {...rest} className={`${className} ${pending ? "pointer-events-none" : ""}`} aria-busy={pending || undefined}>
      {pending && <Spinner />}
      {children}
    </button>
  );
}
