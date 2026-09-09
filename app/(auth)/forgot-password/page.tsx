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
// app/(auth)/forgot-password/page.tsx

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
        className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6 md:py-16"
      >
        <div className="w-full max-w-md">
          {/* Card */}
          <div className="rounded-xl border border-border bg-surface p-6 text-center shadow-sm sm:p-8">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-canvas text-ink">
              <UserCog className="h-6 w-6" strokeWidth={1.5} />
            </div>

            <h1 className="mt-4 text-xl font-bold tracking-tight text-ink sm:text-2xl">
              Contact your school admin
            </h1>

            <p className="mt-2 text-caption text-text-secondary leading-relaxed">
              For your account&apos;s security, password resets are handled
              by your school admin. Reach out to them directly and they&apos;ll
              set a new password for your account.
            </p>

            <div className="mt-6">
              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center text-caption font-semibold text-brand hover:underline"
              >
                Back to sign in
              </Link>
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}