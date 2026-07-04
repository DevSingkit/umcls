"use server";
// See lib/auth/AUTH_NOTES.md for why these checks exist
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

// PH1-002 AC: min 12 chars, uppercase + lowercase + number.
const passwordSchema = z
    .string()
    .min(12, "Password must be at least 12 characters.")
    .regex(/[a-z]/, "Password must include a lowercase letter.")
    .regex(/[A-Z]/, "Password must include an uppercase letter.")
    .regex(/[0-9]/, "Password must include a number.");

export type ResetPasswordResult = { ok: true } | { ok: false; error: string };

export async function resetPassword(
    formData: FormData
): Promise<ResetPasswordResult> {
    const password = formData.get("password");
    const confirmPassword = formData.get("confirmPassword");

    const parsed = passwordSchema.safeParse(password);
    if (!parsed.success) {
        return {
            ok: false,
            error:
                parsed.error.issues[0]?.message ??
                "Password does not meet the requirements.",
        };
    }

    if (password !== confirmPassword) {
        return { ok: false, error: "Passwords do not match." };
    }

    const supabase = await createClient();

    // Whoever calls this must already be sitting in a Supabase "recovery"
    // session — that session is what gets established when the person
    // clicks the single-use link from requestPasswordReset's email and
    // lands back on /reset-password. getUser() (not just reading the
    // session) confirms that directly with Supabase, same reasoning as
    // every other auth check — see AUTH_NOTES.md.
    //
    // If there's no valid user here, the link was never actually used to
    // arrive at this page, or it already expired (> 1 hour), or it was
    // already used once before — Supabase invalidates the recovery token
    // on first use, which is what gives us "link cannot be used twice"
    // for free rather than something this file has to track itself.
    const {
        data: { user },
        error: getUserError,
    } = await supabase.auth.getUser();

    if (getUserError || !user) {
        return {
            ok: false,
            error: "This reset link is invalid or has expired. Request a new one.",
        };
    }

    const { error: updateError } = await supabase.auth.updateUser({
        password: parsed.data,
    });

    if (updateError) {
        return {
            ok: false,
            error: "Could not update your password. Please try again.",
        };
    }

    return { ok: true };
}