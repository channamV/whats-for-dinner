"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { BUCKET } from "@/lib/supabase/env";
import { THUMB_SUFFIX, pdfThumbnail } from "@/lib/pdf-thumbnail";
import { BookIcon } from "./icons";

export type OriginalFile = { path: string; url: string; label: string; thumbUrl: string | null; isPdf: boolean };

/** Links back to the scanned card or photo a meal or dish was imported from, with a thumbnail. */
export function OriginalLinks({ links }: { links: OriginalFile[] }) {
  if (!links.length) return null;
  return (
    <div className="flex flex-wrap gap-3">
      {links.map((l) => (
        <OriginalCard key={l.path} file={l} />
      ))}
    </div>
  );
}

function OriginalCard({ file }: { file: OriginalFile }) {
  const [generated, setGenerated] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const thumb = file.thumbUrl ?? (file.isPdf ? generated : file.url);

  // Cards imported before thumbnails existed: draw one now and save it for next time.
  useEffect(() => {
    if (file.thumbUrl || !file.isPdf) return;
    let cancelled = false;
    let objectUrl: string | null = null;
    (async () => {
      try {
        const res = await fetch(file.url);
        const blob = await pdfThumbnail(await res.blob());
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setGenerated(objectUrl);
        await createClient()
          .storage.from(BUCKET)
          .upload(file.path + THUMB_SUFFIX, blob, { contentType: "image/jpeg", upsert: true });
      } catch (e) {
        console.error("thumbnail failed", e);
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [file.path, file.url, file.thumbUrl, file.isPdf]);

  return (
    <a
      href={file.url}
      target="_blank"
      rel="noreferrer"
      className="card group block w-44 overflow-hidden transition-colors hover:border-accent sm:w-52"
    >
      <div className="flex aspect-[4/3] items-center justify-center overflow-hidden border-b border-line bg-surface-2">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt="" className="h-full w-full object-cover object-top transition-transform group-hover:scale-[1.03]" />
        ) : failed ? (
          <BookIcon className="h-8 w-8 text-muted" />
        ) : (
          <span className="h-full w-full animate-pulse bg-surface-2" />
        )}
      </div>
      <span className="flex items-start gap-2 px-3 py-2 text-sm font-medium leading-snug">
        <BookIcon className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
        <span>{file.label}</span>
      </span>
    </a>
  );
}
