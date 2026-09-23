"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { BUCKET } from "@/lib/supabase/env";
import type { ImportResult } from "@/lib/ai/schema";
import { DishEditor, type DishDraft } from "@/components/dish-editor";
import { ChevronIcon, SparkleIcon, TrashIcon, UploadIcon } from "@/components/icons";
import { discardUploads, saveImport } from "../../actions";

type Phase = "pick" | "reading" | "review";

const MAX_IMAGE_EDGE = 2200;

/** Shrinks big phone photos (and converts HEIC where the browser can decode it) before upload. */
async function prepareFile(file: File): Promise<Blob> {
  if (file.type === "application/pdf" || !file.type.startsWith("image/")) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.type === "image/jpeg" && file.size < 4_000_000) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode failed"))), "image/jpeg", 0.85),
    );
  } catch {
    return file;
  }
}

function safeName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/-+/g, "-").slice(-80);
}

export function ImportFlow({ householdId }: { householdId: string }) {
  const [phase, setPhase] = useState<Phase>("pick");
  const [files, setFiles] = useState<File[]>([]);
  const [hint, setHint] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [paths, setPaths] = useState<string[]>([]);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [dishes, setDishes] = useState<(DishDraft & { include: boolean })[]>([]);
  const [meal, setMeal] = useState<ImportResult["meal"] & { notes: string | null }>();
  const [saveAsMeal, setSaveAsMeal] = useState(true);
  const [open, setOpen] = useState<number | null>(null);
  const [saving, startSaving] = useTransition();

  async function read() {
    setError(null);
    setPhase("reading");
    try {
      const supabase = createClient();
      const uploaded: string[] = [];
      for (const [i, f] of files.entries()) {
        setStatus(`Uploading ${i + 1} of ${files.length}…`);
        const blob = await prepareFile(f);
        const ext = blob.type === "application/pdf" ? "" : blob.type === "image/jpeg" && !/\.jpe?g$/i.test(f.name) ? ".jpg" : "";
        const path = `${householdId}/imports/${crypto.randomUUID()}-${safeName(f.name)}${ext}`;
        const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: blob.type || f.type });
        if (upErr) throw new Error(`Upload failed: ${upErr.message}`);
        uploaded.push(path);
      }
      setPaths(uploaded);
      setStatus("Reading your recipe… this usually takes 30–90 seconds.");
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paths: uploaded, hint: hint || undefined }),
      });
      const body = await res.json().catch(() => ({ error: "The server took too long to answer. Try again." }));
      if (!res.ok || !body.result) throw new Error(body.error ?? "Import failed.");
      const r = body.result as ImportResult;
      setResult(r);
      setMeal({ ...r.meal, notes: r.meal.start_notes.length ? r.meal.start_notes.join("\n") : null });
      setDishes(r.dishes.map((d) => ({ ...d, notes: null, include: true })));
      setSaveAsMeal(r.dishes.length > 1);
      setPhase("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setPhase("pick");
    }
  }

  function save() {
    if (!meal) return;
    const chosen = dishes.filter((d) => d.include);
    if (!chosen.length) return setError("Pick at least one dish to save.");
    setError(null);
    startSaving(async () => {
      const res = await saveImport({
        saveAsMeal,
        meal: {
          title: meal.title,
          subtitle: meal.subtitle,
          description: meal.description,
          total_minutes: meal.total_minutes,
          tags: meal.tags,
          source: meal.source,
          source_ref: meal.source_ref,
          notes: meal.notes,
        },
        dishes: chosen.map((d) => ({
          title: d.title,
          role: d.role,
          description: d.description,
          base_servings: d.base_servings,
          total_minutes: d.total_minutes,
          tags: d.tags,
          equipment: d.equipment,
          ingredients: d.ingredients,
          steps: d.steps,
          notes: d.notes ?? null,
        })),
        sourceFiles: paths,
      });
      if (res?.error) setError(res.error);
    });
  }

  if (phase === "pick" || phase === "reading") {
    const reading = phase === "reading";
    return (
      <div className="space-y-4">
        <label
          className={`card flex cursor-pointer flex-col items-center gap-2 border-dashed p-8 text-center ${reading ? "pointer-events-none opacity-60" : "hover:bg-surface-2"}`}
        >
          <UploadIcon className="h-8 w-8 text-accent" />
          <span className="font-medium">Choose PDFs or photos</span>
          <span className="text-sm text-muted">Scanned HelloFresh cards, a &ldquo;Print to PDF&rdquo; of a web recipe, or photos of both sides of a card.</span>
          <input
            type="file"
            accept="application/pdf,image/*"
            multiple
            className="sr-only"
            onChange={(e) => setFiles([...files, ...Array.from(e.target.files ?? [])].slice(0, 10))}
          />
        </label>

        {files.length > 0 && (
          <ul className="card divide-y divide-line">
            {files.map((f, i) => (
              <li key={i} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <span className="truncate">{f.name}</span>
                <span className="flex shrink-0 items-center gap-2 text-muted">
                  {(f.size / 1_000_000).toFixed(1)} MB
                  {!reading && (
                    <button className="btn-ghost px-2 py-1" onClick={() => setFiles(files.filter((_, j) => j !== i))} aria-label="Remove file">
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}

        <div>
          <label className="label" htmlFor="hint">Anything the AI should know? (optional)</label>
          <input
            id="hint"
            className="input"
            value={hint}
            onChange={(e) => setHint(e.target.value)}
            placeholder="e.g. keep the salad and dressing as one dish"
            disabled={reading}
          />
        </div>

        {error && <p className="rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn">{error}</p>}

        <button className="btn-primary w-full sm:w-auto" disabled={!files.length || reading} onClick={read}>
          <SparkleIcon className="h-4 w-4" />
          {reading ? "Working…" : "Read recipe"}
        </button>
        {reading && (
          <p className="flex items-center gap-2 text-sm text-muted">
            <span className="h-3 w-3 animate-ping rounded-full bg-accent" /> {status}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {result && result.warnings.length > 0 && (
        <div className="rounded-xl bg-warn-soft p-4 text-sm text-warn">
          <p className="font-medium">Double-check these:</p>
          <ul className="ml-4 list-disc">
            {result.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {meal && (
        <section className="card space-y-3 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Meal name</label>
              <input className="input" value={meal.title} onChange={(e) => setMeal({ ...meal, title: e.target.value })} />
            </div>
            <div>
              <label className="label">Subtitle</label>
              <input className="input" value={meal.subtitle ?? ""} onChange={(e) => setMeal({ ...meal, subtitle: e.target.value || null })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <label className="label">Minutes</label>
              <input className="input" type="number" value={meal.total_minutes ?? ""} onChange={(e) => setMeal({ ...meal, total_minutes: Number(e.target.value) || null })} />
            </div>
            <div>
              <label className="label">Source</label>
              <input className="input" value={meal.source ?? ""} onChange={(e) => setMeal({ ...meal, source: e.target.value || null })} />
            </div>
            <div className="col-span-2">
              <label className="label">Tags</label>
              <input
                className="input"
                defaultValue={meal.tags.join(", ")}
                onBlur={(e) => setMeal({ ...meal, tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })}
              />
            </div>
          </div>
          <fieldset className="flex flex-wrap gap-4 pt-1 text-sm">
            <label className="flex items-center gap-2">
              <input type="radio" checked={saveAsMeal} onChange={() => setSaveAsMeal(true)} />
              Save as a meal with its dishes
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" checked={!saveAsMeal} onChange={() => setSaveAsMeal(false)} />
              Save dishes only
            </label>
          </fieldset>
        </section>
      )}

      <h2 className="font-display text-xl font-semibold">
        {dishes.length} dish{dishes.length === 1 ? "" : "es"} found
      </h2>

      <div className="space-y-3">
        {dishes.map((d, i) => (
          <div key={i} className={`card ${d.include ? "" : "opacity-60"}`}>
            <div className="flex items-center gap-3 p-4">
              <input
                type="checkbox"
                className="h-5 w-5 accent-[var(--accent)]"
                checked={d.include}
                onChange={(e) => setDishes(dishes.map((x, j) => (j === i ? { ...x, include: e.target.checked } : x)))}
                aria-label={`Save ${d.title}`}
              />
              <button className="flex flex-1 items-center justify-between gap-3 text-left" onClick={() => setOpen(open === i ? null : i)}>
                <span>
                  <span className="font-semibold">{d.title || "Untitled dish"}</span>
                  <span className="ml-2 chip">{d.role}</span>
                  <span className="block text-sm text-muted">
                    {d.ingredients.length} ingredients · {d.steps.length} steps · serves {d.base_servings}
                  </span>
                </span>
                <ChevronIcon className={`h-5 w-5 shrink-0 text-muted transition-transform ${open === i ? "rotate-90" : ""}`} />
              </button>
            </div>
            {open === i && (
              <div className="border-t border-line p-4">
                <DishEditor dish={d} onChange={(nd) => setDishes(dishes.map((x, j) => (j === i ? { ...nd, include: x.include } : x)))} />
              </div>
            )}
          </div>
        ))}
      </div>

      {error && <p className="rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn">{error}</p>}

      <div className="sticky bottom-20 flex gap-2 md:bottom-4">
        <button className="btn-primary flex-1 shadow-lg sm:flex-none" onClick={save} disabled={saving}>
          {saving ? "Saving…" : saveAsMeal ? "Save meal" : "Save dishes"}
        </button>
        <button
          className="btn-secondary"
          onClick={() => {
            if (paths.length) void discardUploads(paths);
            setPaths([]);
            setPhase("pick");
          }}
          disabled={saving}
        >
          Start over
        </button>
      </div>
    </div>
  );
}
