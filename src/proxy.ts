import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy-session";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // /api/shortcuts is called by iPhone Shortcuts with its own key; keep the proxy (which
  // checks the login session and buffers request bodies) out of that path entirely.
  matcher: ["/((?!_next/static|_next/image|api/shortcuts|favicon.ico|icon.svg|manifest.webmanifest|.*\\.(?:png|jpg|jpeg|svg|webp)$).*)"],
};
