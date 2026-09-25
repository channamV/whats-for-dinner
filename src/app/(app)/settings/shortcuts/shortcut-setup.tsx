"use client";

import { useState, useTransition } from "react";
import { createShortcutKey, turnOffShortcuts } from "../../actions";

function CopyField({ label, value, secret = false }: { label: string; value: string; secret?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <p className="label">{label}</p>
      <div className="flex gap-2">
        <code className={`input flex-1 overflow-x-auto whitespace-nowrap font-mono text-xs ${secret ? "bg-warn-soft" : ""}`}>{value}</code>
        <button
          type="button"
          className="btn-secondary shrink-0"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(value);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            } catch {}
          }}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}

export function ShortcutSetup({ endpoint, enabledSince }: { endpoint: string; enabledSince: string | null }) {
  const [key, setKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const enabled = Boolean(key || enabledSince);

  const create = () =>
    start(async () => {
      setError(null);
      const res = await createShortcutKey();
      if ("error" in res) setError(res.error);
      else setKey(res.key);
    });

  return (
    <div className="space-y-5">
      <section className="card space-y-3 p-4 text-sm">
        <h2 className="text-base font-semibold">How it works</h2>
        <ol className="ml-5 list-decimal space-y-1 text-muted">
          <li>Keep saying &ldquo;Hey Siri, add milk to my grocery list&rdquo; or &ldquo;…to my Costco list&rdquo; as usual.</li>
          <li>
            Before you shop, run the <b className="text-ink">Sync groceries</b> Shortcut (tap it, or &ldquo;Hey Siri, sync groceries&rdquo;).
          </li>
          <li>
            Everything unticked on those Reminders lists moves into your current grocery list here, sorted by aisle and merged
            with the meal plan. Items from a list named after a store (like Costco) are marked with that store.
          </li>
          <li>The Shortcut then ticks them off in Reminders so nothing is added twice.</li>
        </ol>
      </section>

      <section className="card space-y-3 p-4">
        <h2 className="font-semibold">1. Your Shortcuts key</h2>
        {key ? (
          <>
            <p className="text-sm text-warn">
              Copy this now. For your security it won&apos;t be shown again (you can always make a new one).
            </p>
            <CopyField label="Shortcuts key" value={key} secret />
          </>
        ) : enabled ? (
          <p className="text-sm text-muted">
            A key has been active since {new Date(enabledSince!).toLocaleDateString("en-CA", { month: "long", day: "numeric", year: "numeric" })}.
            Making a new one stops the old one working, so you&apos;d need to paste the new key into the Shortcut.
          </p>
        ) : (
          <p className="text-sm text-muted">
            The key lets your Shortcut add items to this household&apos;s grocery list without signing in. Anyone with the key can add
            items, so keep it to your own phones.
          </p>
        )}
        {error && <p className="text-sm text-warn">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <button className={key ? "btn-secondary" : "btn-primary"} onClick={create} disabled={pending}>
            {pending ? "One moment…" : enabled ? "Make a new key" : "Turn on & create key"}
          </button>
          {enabled && (
            <button
              className="btn-danger"
              disabled={pending}
              onClick={() =>
                confirm("Turn off Reminders sync? Your Shortcut will stop working until you create a new key.") &&
                start(async () => {
                  await turnOffShortcuts();
                  setKey(null);
                })
              }
            >
              Turn off
            </button>
          )}
        </div>
      </section>

      <section className="card space-y-4 p-4">
        <h2 className="font-semibold">2. Build the Shortcut on your iPhone (about 5 minutes, once)</h2>
        <CopyField label="Web address for the Shortcut" value={endpoint} />
        <ol className="ml-5 list-decimal space-y-3 text-sm">
          <li>
            Open the <b>Shortcuts</b> app, tap <b>+</b>, and name the shortcut <b>Sync groceries</b> (that&apos;s also what you&apos;ll say to Siri).
          </li>
          <li>
            Add <b>Find Reminders</b>. Tap <b>Add Filter</b>: <i>List is Grocery</i>, then add a second filter <i>Is Completed is off</i>.
            <span className="block text-muted">Use the exact name of your list, e.g. Groceries.</span>
          </li>
          <li>
            Add <b>Combine Text</b> with the Reminders from the step above, separated by <b>New Lines</b>.
          </li>
          <li>
            Repeat steps 2–3 for your <b>Costco</b> list (and any other store lists). The list&apos;s name becomes the store label, so any
            list not called Grocery/Groceries/Shopping is treated as a store.
          </li>
          <li>
            Add <b>Get Contents of URL</b> and paste the web address above. Tap <b>Show More</b>:
            <ul className="ml-5 mt-1 list-disc space-y-1 text-muted">
              <li><b className="text-ink">Method:</b> POST</li>
              <li>
                <b className="text-ink">Headers:</b> add <code>Authorization</code> with the value <code>Bearer </code> followed by your key
                (one space after Bearer).
              </li>
              <li>
                <b className="text-ink">Request Body:</b> JSON. Add a <i>Text</i> field for each list: key <code>Grocery</code> with the
                first Combined Text, key <code>Costco</code> with the second.
              </li>
            </ul>
          </li>
          <li>
            Add <b>Get Dictionary Value</b> for key <code>message</code>, then <b>Show Notification</b> with that value, so you see
            &ldquo;Added 7 items to …&rdquo;.
          </li>
          <li>
            Add <b>If</b> (the <i>Contents of URL</i>’s <code>ok</code> value is <i>true</i>), and inside it mark the reminders from each Find
            Reminders step as completed. Depending on your iOS version the action is <b>Edit Reminder</b> (set <i>Is Completed</i>), or
            use <b>Remove Reminders</b> if you&apos;d rather delete them. Doing this inside the If means nothing is lost if the sync fails.
          </li>
          <li>Tap <b>Done</b>. Try it: add &ldquo;test&rdquo; to your grocery list with Siri, run the shortcut, and check your list here.</li>
        </ol>
        <p className="text-sm text-muted">
          Optional: in the Shortcuts app&apos;s <b>Automation</b> tab you can run it automatically when you arrive at a store.
        </p>
      </section>
    </div>
  );
}
