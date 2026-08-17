// app/forgot-password/page.tsx
//
// Design system: DESIGN-LMS.md v1.8
//
// No longer a self-service reset flow. As of 2026-08-17, password
// resets are admin-only — an admin resets a user's password directly
// (see features/admin, once that action exists) rather than the user
// emailing themselves a reset link. This page is now a static notice
// pointing them to their admin, and no longer calls
// requestPasswordReset. The old email-a-link flow and its landing
// page (app/reset-password/page.tsx) have been removed entirely.

import Link from "next/link";
import Image from "next/image";
import { UserCog } from "lucide-react";

export default function ForgotPasswordPage() {
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
                        alt="UMCLSI LMS"
                        width={140}
                        height={44}
                        priority
                        className="h-11 w-auto object-contain"
                    />
                </div>

                {/* Card */}
                <div className="rounded-md bg-surface p-8 text-center shadow-modal sm:p-10">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-pill bg-canvas">
                        <UserCog className="h-6 w-6 text-ink" strokeWidth={1.5} />
                    </div>

                    <p className="mt-5 flex items-center justify-center gap-1.5 text-label text-text-secondary">
                        <span aria-hidden="true" className="text-amber">
                            •
                        </span>
                        Forgot your password?
                    </p>

                    <h1 className="mt-2 font-heading text-h3 text-ink">
                        Contact your school admin
                    </h1>

                    <p className="mt-3 text-body-md text-text-secondary">
                        For your account&apos;s security, password resets are
                        handled by your school admin. Reach out to them directly
                        and they&apos;ll set a new password for your account.
                    </p>

                    <Link
                        href="/"
                        className="mt-8 inline-flex h-11 items-center justify-center text-body-md text-brand hover:underline"
                    >
                        Back to sign in
                    </Link>
                </div>
            </div>
        </main>
    );
}
