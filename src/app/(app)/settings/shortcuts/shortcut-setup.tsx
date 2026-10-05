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

export function ShortcutSetup({ endpoint, exportEndpoint, enabledSince }: { endpoint: string; exportEndpoint: string; enabledSince: string | null }) {
  const [key, setKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const enabled = Boolean(key || enabledSince);
  const keyParam = key ? `&key=${encodeURIComponent(key)}` : "&key=YOUR-KEY";
  const addressFor = (list: string) => `${endpoint}?list=${encodeURIComponent(list)}${keyParam}`;
  const exportAddressFor = (list: string) => `${exportEndpoint}?list=${encodeURIComponent(list)}${keyParam}`;

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
        <p className="text-muted">There are two optional Shortcuts. Use either or both.</p>
        <div>
          <p className="font-medium">Send groceries (app → Reminders)</p>
          <p className="text-muted">
            Before you shop, run <b className="text-ink">Send groceries</b>. Unticked items move into your Reminders lists (Costco items
            into your Costco list, everything else into Groceries) and are ticked off here, so nothing is sent twice. You then shop
            from Reminders.
          </p>
        </div>
        <div>
          <p className="font-medium">Sync groceries (Reminders → app)</p>
          <p className="text-muted">
            Keep saying &ldquo;Hey Siri, add milk to my grocery list&rdquo;, then run <b className="text-ink">Sync groceries</b> to pull
            those items into the app, sorted by aisle and merged with the meal plan.
          </p>
        </div>
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
        <h2 className="font-semibold">2. Send groceries: app → Reminders</h2>
        <p className="text-sm text-muted">
          Build this once on your iPhone. Open this page on the phone so you can copy and paste. Each Reminders list gets a small block of
          actions: build the Groceries block, test it, then repeat it for Costco.
        </p>
        {!key && (
          <p className="rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn">
            The addresses below include your key, which is only shown right after it&apos;s made.{" "}
            {enabled ? "Tap “Make a new key” above to get addresses you can paste." : "Create a key above first."}
          </p>
        )}
        <div className="space-y-3 text-sm">
          <p className="font-medium">Start: in Shortcuts tap <b>+</b> and name it <b>Send groceries</b>.</p>
          <h3 className="pt-1 font-semibold">Groceries block</h3>
          <ol className="ml-5 list-[upper-alpha] space-y-3">
            <li>
              <b>Get Contents of URL</b>: paste this address. Tap the arrow to show more and set <b>Method</b> to <b>POST</b> (nothing
              else: no headers, no body).
              <div className="mt-2">
                <CopyField label="Send to Groceries address" value={exportAddressFor("Grocery")} secret={Boolean(key)} />
              </div>
            </li>
            <li>
              <b>Text</b>: add the <i>Text</i> action, tap inside it, choose <i>Select Variable</i> and tap <b>Contents of URL</b>.
            </li>
            <li>
              <b>If</b>: set the top to <i>All</i> are true, with two conditions: <i><b>Text</b> has any value</i>, and{" "}
              <i><b>Text</b> does not begin with</i> <code>Sync failed</code>. This skips the rest when there&apos;s nothing to send or
              something went wrong.
            </li>
            <li>
              Inside the If, add <b>Split Text</b>: <i>Split <b>Text</b> by <b>New Lines</b></i>.
            </li>
            <li>
              Still inside the If, add <b>Repeat with Each</b> item in <b>Split Text</b>. Inside the Repeat add <b>Add New Reminder</b>:
              tap its text, choose <i>Select Variable</i> → <b>Repeat Item</b>, then tap the list name and choose your{" "}
              <b>Groceries</b> list.
            </li>
            <li>
              In the If&apos;s <b>Otherwise</b> part, add <b>Show Notification</b> with <b>Text</b>, so you see the reason if it didn&apos;t
              send (it&apos;s blank when there was simply nothing to send).
            </li>
          </ol>
          <p>
            Optional: after <i>End If</i>, add <b>Show Notification</b> &ldquo;Groceries sent to Reminders&rdquo;.
          </p>
          <p>
            <b>Preview first:</b> opening the address in Safari shows what would be sent without ticking anything. Only the Shortcut
            (POST) sends and ticks items off.
          </p>
          <h3 className="pt-1 font-semibold">Costco block (and any other store)</h3>
          <p className="text-muted">
            Add actions A–F again below, with this address in A and your <b>Costco</b> Reminders list in E. Pick the variables from the
            Costco actions.
          </p>
          <CopyField label="Send to Costco address" value={exportAddressFor("Costco")} secret={Boolean(key)} />
          <p className="text-muted">
            Items ticked by mistake are still in the app under <b>Show completed</b>; untick them there to put them back.
          </p>
        </div>
      </section>

      <section className="card space-y-4 p-4">
        <h2 className="font-semibold">3. Sync groceries: Reminders → app (optional)</h2>
        <p className="text-sm text-muted">
          Each Reminders list gets its own small block of actions. Build the Grocery block first and test it, then add Costco.
          Tip: open this page on your iPhone so you can copy and paste as you go.
        </p>
        {!key && (
          <p className="rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn">
            The addresses below include your key, which is only shown right after it&apos;s made.{" "}
            {enabled ? "Tap “Make a new key” above to get addresses you can paste." : "Create a key above first."}
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
              <b>Get Contents of URL</b>: tap the blue <i>URL</i> placeholder and paste this address (it includes your key):
              <div className="mt-2">
                <CopyField label="Grocery web address" value={addressFor("Grocery")} secret={Boolean(key)} />
              </div>
            </li>
            <li>
              Still in <b>Get Contents of URL</b>, tap the arrow to <i>Show More</i>, then:
              <ul className="ml-5 mt-1 list-disc space-y-1 text-muted">
                <li><b className="text-ink">Method</b> → POST</li>
                <li>
                  <b className="text-ink">Headers</b> → none needed. If you added an <i>Authorization</i> header earlier, delete it.
                </li>
                <li>
                  <b className="text-ink">Request Body</b> → <b>File</b>. Tap the <i>File</i> field and choose the <b>Combined Text</b> variable.
                  <span className="block">No JSON or text fields needed.</span>
                </li>
              </ul>
            </li>
            <li>
              <b>Text</b>: add the action called <i>Text</i>, tap inside it, choose <i>Select Variable</i> and tap <b>Contents of URL</b>.
              <span className="block text-muted">This turns the app&apos;s reply into plain text so the next two steps can use it.</span>
            </li>
            <li>
              <b>Show Notification</b>: show the <b>Text</b> from the step above. (The app replies with a sentence like &ldquo;Added 5 items
              to Week of Sep 21&rdquo;.)
            </li>
            <li>
              <b>If</b>: set it to <i>If <b>Text</b> contains <b>Added</b></i> (pick the Text variable, not Contents of URL). Delete any extra
              empty <i>Condition</i> row. Inside the If, add <b>Remove Reminders</b>, tap its input, choose <i>Select Variable</i> and tap the{" "}
              <b>Reminders</b> result of step A. It should turn solid blue; pale grey means nothing is selected. Leave the <i>Otherwise</i> part
              empty.
              <span className="block text-muted">
                This clears them from Reminders only once they&apos;re safely in the app. If the sync fails, nothing is removed.
              </span>
            </li>
          </ol>

          <p>
            <b>Check the connection:</b> open the Grocery web address in Safari on your phone (Safari opens it without sending anything). You should see &ldquo;What&apos;s for dinner
            sync is reachable&rdquo;.
          </p>
          <p>
            <b>Test it:</b> say &ldquo;Hey Siri, add test to my grocery list&rdquo;, tap ▶︎ in the shortcut, and check the grocery list here.
          </p>

          <h3 className="pt-1 font-semibold">Costco block (and any other store)</h3>
          <p className="text-muted">
            Add the same actions A–G again below the first block, with <b>Costco</b> as the list in A and this address in C. In the new
            actions, make sure each variable you pick (Reminders, Combined Text, Contents of URL, Text) is the one from the Costco block.
          </p>
          <CopyField label="Costco web address" value={addressFor("Costco")} secret={Boolean(key)} />
          <p className="text-muted">
            For another store, change <code>Costco</code> after <code>list=</code> in the address to that list&apos;s name. Items get that store&apos;s label.
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
