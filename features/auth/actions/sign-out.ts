"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// ASSUMPTION: lib/supabase/server.ts exports `createClient()` (async, per the
// convention already used in login.ts). Confirm this still matches if
// that file changes.
//
// Redirects to "/" not "/login" — the standalone /login route was
// merged into the landing page's hero section on 2026-08-17 (see
// DESIGN-LMS.md §8.9). "/login" no longer exists as its own route.
export async function signOut() {
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login");
}