// app/(auth)/forgot-password/page.tsx
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
//
// DESIGN-LMS 2.1 (2026-08-31): removed font-heading (Fredoka) — global
// default is now Roboto (font-document) via globals.css's base h1-h6
// rule. Fixed text-amber -> text-warning: `amber` was a color name
// from the OLD DESIGN-LMS v1.0 tailwind.config.ts and does not exist
// in the current config (which uses `warning`/`warning-soft` for the
// same hex value) — this class was silently not applying.
//
// Also: added the shared SiteNav/SiteFooter shell, matching every
// other public page (about/our-story/contact/admissions/academics/
// login) — previously this page had its own standalone centered-logo
// header instead, flagged as an open inconsistency and now resolved
// per explicit user confirmation ("add it for consistency"). The
// standalone logo block above the card is removed since SiteNav
// already shows the logo/school name in its own header.
//
// DESIGN-LMS 2.1 bugfix pass (2026-08-31, continued): two fixes.
// (1) The "• Forgot your password?" eyebrow line directly restated the
// h1 right below it ("Contact your school admin") — a redundant label
// adding no information, which the locked decluttering rule (cut
// redundant/explanatory UI copy) targets. Removed. (2) "Back to sign
// in" was h-11 (44px) — bumped to h-12 (48px), the standing minimum
// for any clickable target.

import Link from "next/link";
import { UserCog } from "lucide-react";
import { SiteNav } from "@/components/layout/SiteNav";
import { SiteFooter } from "@/components/layout/SiteFooter";

export default function ForgotPasswordPage() {
    return (
        <div className="flex min-h-screen flex-col bg-canvas text-ink antialiased">
            <SiteNav />

            <main
                id="main-content"
                className="flex flex-1 items-center justify-center px-6 py-16"
            >
                <div className="w-full max-w-sm">
                    {/* Card */}
                    <div className="rounded-md bg-surface p-8 text-center shadow-modal sm:p-10">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-pill bg-canvas">
                            <UserCog className="h-6 w-6 text-ink" strokeWidth={1.5} />
                        </div>

                        <h1 className="mt-5 text-h3 text-ink">
                            Contact your school admin
                        </h1>

                        <p className="mt-3 text-body-md text-text-secondary">
                            For your account&apos;s security, password resets are
                            handled by your school admin. Reach out to them directly
                            and they&apos;ll set a new password for your account.
                        </p>

                        <Link
                            href="/login"
                            className="mt-8 inline-flex h-12 items-center justify-center text-body-md text-brand hover:underline"
                        >
                            Back to sign in
                        </Link>
                    </div>
                </div>
            </main>

            <SiteFooter />
        </div>
    );
}
