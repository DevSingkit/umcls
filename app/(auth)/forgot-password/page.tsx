"use client";

// app/forgot-password/page.tsx
//
// Design system: DESIGN-LMS.md v1.0 (Auth Flow — Forgot Password)
// Same card treatment as app/login/page.tsx.

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Mail } from "lucide-react";
import { requestPasswordReset } from "@/features/auth/actions/request-password-reset";

export default function ForgotPasswordPage() {
    const [submitted, setSubmitted] = useState(false);
    const [isPending, setIsPending] = useState(false);

    async function handleSubmit(formData: FormData) {
        setIsPending(true);
        await requestPasswordReset(formData);
        // Always show the same confirmation, whether or not the email
        // was found. See request-password-reset.ts for why.
        setSubmitted(true);
        setIsPending(false);
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
                    {submitted ? (
                        <div className="text-center">
                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-pill bg-canvas">
                                <Mail className="h-6 w-6 text-ink" strokeWidth={1.5} />
                            </div>

                            <p className="mt-5 flex items-center justify-center gap-1.5 text-label uppercase tracking-wide text-text-secondary">
                                <span aria-hidden="true" className="text-amber">
                                    •
                                </span>
                                Check your email
                            </p>

                            <h1 className="mt-2 text-h3 text-ink">
                                Link sent
                            </h1>

                            <p className="mt-3 text-body-md text-text-secondary">
                                If an account exists for that email, we&apos;ve sent a
                                link to reset your password. The link expires in 1 hour.
                            </p>

                            <Link
                                href="/login"
                                className="mt-8 inline-flex h-11 items-center justify-center text-body-md text-info hover:underline"
                            >
                                Back to sign in
                            </Link>
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
                                Forgot your password?
                            </h1>
                            <p className="mb-8 mt-2 text-body-md text-text-secondary">
                                Enter your school email and we&apos;ll send you a link
                                to reset it.
                            </p>

                            <form action={handleSubmit}>
                                <div className="mb-6">
                                    <label
                                        htmlFor="email"
                                        className="mb-2 block text-label uppercase tracking-wide text-text-secondary"
                                    >
                                        Email
                                    </label>
                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        autoComplete="email"
                                        required
                                        placeholder="you@school.edu"
                                        className="h-11 w-full rounded-md border border-hairline bg-surface px-5 text-body-md text-ink placeholder:text-text-muted focus:border-[1.5px] focus:border-ink focus:outline-none"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={isPending}
                                    className="h-11 w-full rounded-md bg-ink text-body-md font-medium text-on-ink transition-colors hover:bg-ink-soft disabled:bg-hairline disabled:text-text-muted"
                                >
                                    {isPending ? "Sending…" : "Send reset link"}
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