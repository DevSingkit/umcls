"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// ASSUMPTION: lib/supabase/server.ts exports `createClient()` (async, per the
// convention already used in login.ts / reset-password.ts). Confirm this
// still matches if that file changes.
export async function signOut() {
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login");
}