"use client";

import { useFormStatus } from "react-dom";
import { Spinner } from "./spinner";

export function ConfirmButton({ message, className, children }: { message: string; className?: string; children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      className={`${className ?? ""} ${pending ? "pointer-events-none" : ""}`}
      aria-busy={pending || undefined}
      onClick={(e) => {
        if (!confirm(message)) e.preventDefault();
      }}
    >
      {pending && <Spinner />}
      {children}
    </button>
  );
}
