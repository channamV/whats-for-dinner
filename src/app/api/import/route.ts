import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { parseRecipeFiles, type UploadedFile } from "@/lib/ai/parse-recipe";
import { createClient } from "@/lib/supabase/server";
import { BUCKET } from "@/lib/supabase/env";

// Reading a scanned card takes the model a little while.
export const maxDuration = 300;

const Body = z.object({
  paths: z.array(z.string()).min(1).max(10),
  hint: z.string().max(1000).optional(),
});

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "No files to read." }, { status: 400 });

  // Storage RLS only lets members download their own household's files.
  const files: UploadedFile[] = [];
  for (const path of parsed.data.paths) {
    const { data, error } = await supabase.storage.from(BUCKET).download(path);
    if (error || !data) return NextResponse.json({ error: `Couldn't open ${path.split("/").pop()}.` }, { status: 404 });
    const mediaType = data.type || (path.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/jpeg");
    files.push({ data: Buffer.from(await data.arrayBuffer()), mediaType });
  }

  try {
    const result = await parseRecipeFiles(files, parsed.data.hint);
    return NextResponse.json({ result });
  } catch (e) {
    console.error("import failed", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Import failed." }, { status: 500 });
  }
}
