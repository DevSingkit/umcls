"use server";

// See lib/auth/AUTH_NOTES.md for why these checks exist

import { createClient } from "@/lib/supabase/server";
import { resetRateLimit } from "@/lib/security/rate-limit";
import { z } from "zod";

const emailSchema = z.string().email();

export type RequestPasswordResetResult = {
    // We always return ok: true, even on a bad email or a rate limit hit.
    // This is on purpose: telling someone "that email isn't registered"
    // lets an attacker discover which emails exist in the system. So the
    // form always shows the same "check your email" message, no matter
    // what actually happened behind the scenes.
    ok: true;
};

export async function requestPasswordReset(
    formData: FormData
): Promise<RequestPasswordResetResult> {
    const rawEmail = formData.get("email");
    const parsed = emailSchema.safeParse(rawEmail);

    // Invalid email format: pretend it worked, don't call Supabase.
    if (!parsed.success) {
        return { ok: true };
    }

    const email = parsed.data;

    // 3 requests / 1 hour / email (SECURITY.md §10).
    const { success } = await resetRateLimit.limit(`reset:${email}`);
    if (!success) {
        return { ok: true };
    }

    const supabase = await createClient();

    // redirectTo points at our reset-password page, which reads the
    // Supabase recovery token from the URL and lets the person set a
    // new password. Supabase's own link is single-use and expires in
    // 1 hour by project config.
    await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password`,
    });

    // We deliberately ignore the result. Supabase itself won't tell us
    // whether the email existed, and neither should we.
    return { ok: true };
}