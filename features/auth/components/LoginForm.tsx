"use client";

// features/auth/components/LoginForm.tsx
//
// Login form, extracted from the old standalone /login page so it can
// live directly on the landing page instead. Same form logic as
// before (useActionState + login server action) — only the page shell
// around it changed. See DESIGN-LMS.md §8.9.
//
// Two behaviors added 2026-08-17:
//  1. Email and password are now controlled inputs. On a failed
//     login, the password field is cleared but the email field is
//     left exactly as the person typed it — they should never have to
//     retype their email just because the password was wrong. This
//     can't be left to browser default behavior (uncontrolled inputs),
//     which is inconsistent across browsers/autofill — it has to be
//     handled explicitly.
//  2. Reads ?reason=timeout / ?reason=deactivated from the URL (set
//     by middleware.ts and get-current-user.ts when they redirect a
//     signed-out session here) and shows an explanatory banner, since
//     those redirects used to land on a dedicated /login page that no
//     longer exists — without this, the person would just see a blank
//     sign-in form with no explanation for why they were signed out.

import { useActionState, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, AlertCircle, Info } from "lucide-react";
import { login } from "@/features/auth/actions/login";
import { cn } from "@/lib/utils";

async function loginAction(
    _prevState: { error: string | null },
    formData: FormData
): Promise<{ error: string | null }> {
    return login(formData);
}

const initialState: { error: string | null } = { error: null };

// Plain-language messages for each ?reason= value middleware/
// get-current-user.ts can set. Anything unrecognized is ignored rather
// than shown, so a stray or tampered query param never displays raw
// text to the user.
const REASON_MESSAGES: Record<string, string> = {
    timeout: "You were signed out after a period of inactivity. Please sign in again.",
    deactivated: "This account is not active. Please contact your school admin.",
};

export function LoginForm() {
    const [state, formAction, isPending] = useActionState(
        loginAction,
        initialState
    );
    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const searchParams = useSearchParams();
    const reason = searchParams.get("reason");
    const reasonMessage = reason ? REASON_MESSAGES[reason] : undefined;

    // On a failed login, clear only the password — never the email.
    // state.error changes identity on every failed submission (a new
    // object from the server action), so this fires exactly once per
    // failed attempt, not on every render.
    useEffect(() => {
        if (state.error) {
            setPassword("");
        }
    }, [state.error]);

    return (
        <div className="w-full rounded-md bg-surface p-8 shadow-modal sm:p-10">
            <p className="mb-3 flex items-center gap-1.5 text-label text-text-secondary">
                <span aria-hidden="true" className="text-amber">
                    •
                </span>
                Sign in
            </p>

            <h2 className="font-heading text-h3 text-ink">
                United Methodist
            </h2>
            <h2 className="mb-3 font-heading text-h3 text-ink">
                Cooperative Learning System, Inc.
            </h2>
            <p className="mb-8 text-body-md text-text-secondary">
                Sign in to your account
            </p>

            {reasonMessage && !state.error && (
                <div
                    role="status"
                    className="mb-5 flex items-start gap-2 rounded-md bg-info-soft px-5 py-3"
                >
                    <Info
                        className="mt-0.5 h-4 w-4 shrink-0 text-info"
                        strokeWidth={2}
                        aria-hidden="true"
                    />
                    <p className="text-caption text-info">{reasonMessage}</p>
                </div>
            )}

            <form action={formAction} noValidate>
                <div className="mb-5">
                    <label
                        htmlFor="email"
                        className="mb-2 block text-label text-text-secondary"
                    >
                        Email
                    </label>
                    <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        aria-describedby={state.error ? "login-error" : undefined}
                        aria-invalid={state.error ? true : undefined}
                        placeholder="you@school.edu"
                        className="h-11 w-full rounded-md border border-hairline-strong bg-surface px-5 text-body-md text-ink placeholder:text-text-muted focus:border-[1.5px] focus:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                    />
                </div>

                <div className="mb-4">
                    <label
                        htmlFor="password"
                        className="mb-2 block text-label text-text-secondary"
                    >
                        Password
                    </label>
                    <div className="relative">
                        <input
                            id="password"
                            name="password"
                            type={showPassword ? "text" : "password"}
                            autoComplete="current-password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            aria-describedby={
                                state.error ? "login-error" : undefined
                            }
                            aria-invalid={state.error ? true : undefined}
                            placeholder="••••••••"
                            className="h-11 w-full rounded-md border border-hairline-strong bg-surface px-5 pr-12 text-body-md text-ink placeholder:text-text-muted focus:border-[1.5px] focus:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword((v) => !v)}
                            aria-label={
                                showPassword ? "Hide password" : "Show password"
                            }
                            aria-pressed={showPassword}
                            className="absolute inset-y-0 right-0 flex h-11 w-11 items-center justify-center text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                        >
                            {showPassword ? (
                                <EyeOff className="h-5 w-5" strokeWidth={1.5} />
                            ) : (
                                <Eye className="h-5 w-5" strokeWidth={1.5} />
                            )}
                        </button>
                    </div>
                </div>

                <div className="mb-6 text-right">
                    <Link
                        href="/forgot-password"
                        className="inline-flex h-11 items-center text-body-md text-brand hover:underline"
                    >
                        Forgot password?
                    </Link>
                </div>

                {state.error && (
                    <div
                        id="login-error"
                        role="alert"
                        className="mb-5 flex items-start gap-2 rounded-md bg-red-soft px-5 py-3"
                    >
                        <AlertCircle
                            className="mt-0.5 h-4 w-4 shrink-0 text-red"
                            strokeWidth={2}
                            aria-hidden="true"
                        />
                        <p className="text-caption text-red">
                            {state.error}
                        </p>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={isPending}
                    className={cn(
                        "h-11 w-full rounded-md bg-brand text-body-md font-medium text-on-ink transition-colors",
                        "hover:bg-brand-hover",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2",
                        "disabled:bg-hairline disabled:text-text-muted"
                    )}
                >
                    {isPending ? "Signing in…" : "Sign in"}
                </button>
            </form>
        </div>
    );
}
