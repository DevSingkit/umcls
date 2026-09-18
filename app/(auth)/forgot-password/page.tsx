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
          <div className="rounded-md border border-hairline bg-surface p-6 text-center shadow-card sm:p-8">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft text-brand">
              <UserCog className="h-6 w-6" strokeWidth={1.5} />
            </div>

            <h1 className="mt-4 text-h2 font-bold tracking-tight text-ink">
              Contact your school admin
            </h1>

            <p className="mt-2 text-body-md text-text-secondary leading-relaxed">
              For your account&apos;s security, password resets are handled
              by your school administrator. Reach out to them directly and they&apos;ll
              set a new password for your account.
            </p>

            <div className="mt-6">
              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center text-body-md font-semibold text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:rounded-sm"
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