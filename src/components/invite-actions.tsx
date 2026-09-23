"use client";

import { useState, useSyncExternalStore } from "react";

const noSubscribe = () => () => {};

/** "Send invite by email", plus Share (phones) and Copy for the invite link. */
export function InviteActions({ url, code, householdName, fromName }: { url: string; code: string; householdName: string; fromName: string | null }) {
  const [copied, setCopied] = useState(false);
  // Only phones (and some browsers) have a share sheet; decided after load so server and browser agree.
  const canShare = useSyncExternalStore(noSubscribe, () => typeof navigator.share === "function", () => false);

  const subject = `Join ${householdName} on What's for dinner`;
  const message = [
    "Hi,",
    "",
    `I've set up What's for dinner for our family. It's where we keep our recipes, the weekly meal plan and the grocery list, and it works on your phone.`,
    "",
    `1. Open this link: ${url}`,
    "2. Create an account with your email and a password.",
    `3. Choose "Join your family". The invite code (${code}) is already filled in.`,
    "",
    "Tip: on your phone, use \"Add to Home Screen\" so it opens like an app.",
    "",
    fromName ? `${fromName}` : "",
  ]
    .join("\n")
    .trimEnd();

  const mailto = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;

  async function share() {
    try {
      await navigator.share({ title: subject, text: `Join ${householdName} on What's for dinner. Invite code: ${code}`, url });
    } catch {
      // Closing the share sheet isn't an error worth showing.
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(`${url}\nInvite code: ${code}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  return (
    <div className="flex flex-wrap gap-2">
      <a href={mailto} className="btn-primary">
        <MailIcon className="h-4 w-4" /> Send invite by email
      </a>
      {canShare && (
        <button type="button" className="btn-secondary" onClick={share}>
          Share…
        </button>
      )}
      <button type="button" className="btn-secondary" onClick={copy}>
        {copied ? "Copied!" : "Copy link"}
      </button>
    </div>
  );
}

function MailIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </svg>
  );
}
