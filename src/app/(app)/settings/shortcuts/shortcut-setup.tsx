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
        <h2 className="font-semibold">2. Build the Shortcut on your iPhone (once)</h2>
        <p className="text-sm text-muted">
          Each Reminders list gets its own small block of 5 actions. Build the Grocery block first and test it, then add Costco.
          Tip: open this page on your iPhone so you can copy and paste as you go.
        </p>
        {key ? (
          <CopyField label="Authorization value (includes your key)" value={`Bearer ${key}`} secret />
        ) : (
          <p className="rounded-lg bg-surface-2 px-3 py-2 text-sm text-muted">
            You&apos;ll paste <code>Bearer</code> + your key in step D. {enabled ? "If you no longer have the key, make a new one above." : "Create a key above first."}
          </p>
        )}

        <div className="space-y-3 text-sm">
          <p className="font-medium">Start: open <b>Shortcuts</b>, tap <b>+</b>, and rename the new shortcut <b>Sync groceries</b>.</p>

          <h3 className="pt-1 font-semibold">Grocery block</h3>
          <ol className="ml-5 list-[upper-alpha] space-y-3">
            <li>
              <b>Find Reminders</b>: tap <i>Add Filter</i> → <i>List</i> is <b>Grocery</b> (your list&apos;s exact name). Add a second filter:{" "}
              <i>Is Completed</i> is <b>off</b>.
            </li>
            <li>
              <b>Combine Text</b>: it should say <i>Combine Reminders with New Lines</i>.
            </li>
            <li>
              <b>Get Contents of URL</b>: tap the blue <i>URL</i> placeholder and paste:
              <div className="mt-2">
                <CopyField label="Grocery web address" value={`${endpoint}?list=Grocery`} />
              </div>
            </li>
            <li>
              Still in <b>Get Contents of URL</b>, tap the arrow to <i>Show More</i>, then:
              <ul className="ml-5 mt-1 list-disc space-y-1 text-muted">
                <li><b className="text-ink">Method</b> → POST</li>
                <li>
                  <b className="text-ink">Headers</b> → <i>Add new header</i>. Key: <code>Authorization</code>. Text: paste the{" "}
                  <i>Authorization value</i> from above (it starts with <code>Bearer</code>).
                </li>
                <li>
                  <b className="text-ink">Request Body</b> → <b>File</b>. Tap the <i>File</i> field and choose the <b>Combined Text</b> variable.
                  <span className="block">No JSON or text fields needed.</span>
                </li>
              </ul>
            </li>
            <li>
              <b>Show Notification</b>: it should show <i>Contents of URL</i>. (The app replies with a sentence like &ldquo;Added 5 items to
              Week of Sep 21&rdquo;.)
            </li>
            <li>
              <b>If</b>: set it to <i>If <b>Contents of URL</b> contains <b>Added</b></i>. Inside the If, add <b>Remove Reminders</b> and choose
              the <b>Reminders</b> variable from the Find Reminders step. Leave the <i>Otherwise</i> part empty.
              <span className="block text-muted">
                This clears them from Reminders only once they&apos;re safely in the app. If the sync fails, nothing is removed.
              </span>
            </li>
          </ol>

          <p>
            <b>Test it:</b> say &ldquo;Hey Siri, add test to my grocery list&rdquo;, tap ▶︎ in the shortcut, and check the grocery list here.
          </p>

          <h3 className="pt-1 font-semibold">Costco block (and any other store)</h3>
          <p className="text-muted">
            Add the same actions A–F again below the first block, with <b>Costco</b> as the list in A and this address in C. In the new
            actions, make sure each variable you pick (Reminders, Combined Text, Contents of URL) is the one from the Costco block.
          </p>
          <CopyField label="Costco web address" value={`${endpoint}?list=Costco`} />
          <p className="text-muted">
            For another store, change <code>Costco</code> at the end of the address to that list&apos;s name. Items get that store&apos;s label.
          </p>
        </div>

        <div className="rounded-xl bg-surface-2 p-3 text-sm">
          <p className="font-medium">Sharing it with family</p>
          <p className="text-muted">
            Once it works, share it rather than building it again: in Shortcuts, press and hold <b>Sync groceries</b> → <b>Share</b> →{" "}
            <b>Copy iCloud Link</b>, then send that link. It includes your household&apos;s key, so only send it to people in this household.
          </p>
        </div>

        <p className="text-sm text-muted">
          Optional: in the Shortcuts app&apos;s <b>Automation</b> tab you can run it automatically when you arrive at a store.
        </p>
      </section>
    </div>
  );
}
