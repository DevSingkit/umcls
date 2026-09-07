// app/login/page.tsx
//
// Page 7: LMS Gateway. Standalone login route for students, teachers,
// and admins — split out from the homepage hero (which used to embed
// LoginForm directly). Kept mobile-first and simple: one centered
// card, no marketing copy competing for attention, since anyone
// reaching this page already knows why they're here.
//
// DESIGN-LMS 2.1 (2026-08-31): removed font-heading (Fredoka) — global
// default is now Roboto (font-document) via globals.css's base h1-h6
// rule. Also: this page's h1 ("Sign in to your account") is now the
// SOLE page-level heading — LoginForm.tsx no longer repeats the school
// name/eyebrow/title inside its own card, since that was a duplicate
// heading stack (page heading + card heading saying nearly the same
// thing). See LoginForm.tsx's own changelog note for the other half
// of this fix.

import { SiteNav } from "@/components/layout/SiteNav";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { LoginForm } from "@/features/auth/components/LoginForm";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink antialiased">
      <SiteNav />

      <main className="flex flex-1 items-center justify-center px-4 py-16 sm:px-6 md:py-24">
        <div className="w-full max-w-md">
          <p className="text-label text-text-secondary">LMS Gateway</p>
          <h1 className="mt-3 text-h2 text-ink">
            Login to your account
          </h1>
          <p className="mt-2 text-body-md text-text-secondary">
            Welcome!
          </p>

          <div className="mt-8">
            <LoginForm />
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
