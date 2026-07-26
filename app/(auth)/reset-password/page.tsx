"use client";

// app/reset-password/page.tsx
//
// Design system: DESIGN-LMS.md v1.0 (Auth Flow — Reset Password)
// Same card treatment as app/login/page.tsx and app/forgot-password/page.tsx.

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { resetPassword } from "@/features/auth/actions/reset-password";

export default function ResetPasswordPage() {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const [isPending, setIsPending] = useState(false);
    const [success, setSuccess] = useState(false);

    async function handleSubmit(formData: FormData) {
        setError(null);
        setIsPending(true);

        const result = await resetPassword(formData);

        if (!result.ok) {
            setError(result.error);
            setIsPending(false);
            return;
        }

        setSuccess(true);
        setTimeout(() => router.push("/login"), 2000);
    }

    return (
        <main
            id="main-content"
            className="flex min-h-screen flex-col items-center justify-center bg-canvas px-6 py-16"
        >
            <div className="w-full max-w-sm">
                {/* Logo */}
                <div className="mb-8 flex justify-center">
                    <Image
                        src="/logo.png"
                        alt="UMCLS LMS"
                        width={140}
                        height={44}
                        priority
                        className="h-11 w-auto object-contain"
                    />
                </div>

                {/* Card */}
                <div className="rounded-md bg-surface p-8 shadow-modal sm:p-10">
                    {success ? (
                        <div className="text-center">
                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-pill bg-success-soft">
                                <CheckCircle2
                                    className="h-6 w-6 text-success"
                                    strokeWidth={1.5}
                                />
                            </div>

                            <p className="mt-5 flex items-center justify-center gap-1.5 text-label uppercase tracking-wide text-text-secondary">
                                <span aria-hidden="true" className="text-amber">
                                    •
                                </span>
                                Password updated
                            </p>

                            <h1 className="mt-2 text-h3 text-ink">
                                You&apos;re all set
                            </h1>

                            <p className="mt-3 text-body-md text-text-secondary">
                                Taking you to the sign in page&hellip;
                            </p>
                        </div>
                    ) : (
                        <>
                            <p className="mb-3 flex items-center gap-1.5 text-label uppercase tracking-wide text-text-secondary">
                                <span aria-hidden="true" className="text-amber">
                                    •
                                </span>
                                Reset password
                            </p>

                            <h1 className="text-h3 text-ink">
                                Set a new password
                            </h1>
                            <p className="mb-8 mt-2 text-body-md text-text-secondary">
                                Choose a new password with at least 12 characters,
                                including an uppercase letter, a lowercase letter, and a
                                number.
                            </p>

                            <form action={handleSubmit}>
                                <div className="mb-5">
                                    <label
                                        htmlFor="password"
                                        className="mb-2 block text-label uppercase tracking-wide text-text-secondary"
                                    >
                                        New password
                                    </label>
                                    <input
                                        id="password"
                                        name="password"
                                        type="password"
                                        autoComplete="new-password"
                                        required
                                        minLength={12}
                                        aria-describedby={error ? "reset-error" : undefined}
                                        aria-invalid={error ? true : undefined}
                                        className="h-11 w-full rounded-md border border-hairline bg-surface px-5 text-body-md text-ink placeholder:text-text-muted focus:border-[1.5px] focus:border-ink focus:outline-none"
                                    />
                                </div>

                                <div className="mb-6">
                                    <label
                                        htmlFor="confirmPassword"
                                        className="mb-2 block text-label uppercase tracking-wide text-text-secondary"
                                    >
                                        Confirm new password
                                    </label>
                                    <input
                                        id="confirmPassword"
                                        name="confirmPassword"
                                        type="password"
                                        autoComplete="new-password"
                                        required
                                        minLength={12}
                                        aria-describedby={error ? "reset-error" : undefined}
                                        aria-invalid={error ? true : undefined}
                                        className="h-11 w-full rounded-md border border-hairline bg-surface px-5 text-body-md text-ink placeholder:text-text-muted focus:border-[1.5px] focus:border-ink focus:outline-none"
                                    />
                                </div>

                                {error && (
                                    <div
                                        id="reset-error"
                                        role="alert"
                                        className="mb-5 flex items-start gap-2 rounded-md bg-error-soft px-5 py-3"
                                    >
                                        <AlertCircle
                                            className="mt-0.5 h-4 w-4 shrink-0 text-error"
                                            strokeWidth={2}
                                            aria-hidden="true"
                                        />
                                        <p className="text-caption text-error">
                                            {error}
                                        </p>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={isPending}
                                    className="h-11 w-full rounded-md bg-ink text-body-md font-medium text-on-ink transition-colors hover:bg-ink-soft active:bg-ink disabled:bg-hairline disabled:text-text-muted"
                                >
                                    {isPending ? "Updating…" : "Update password"}
                                </button>
                            </form>

                            <Link
                                href="/login"
                                className="mt-6 block text-center text-body-md text-info hover:underline"
                            >
                                Back to sign in
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </main>
    );
}