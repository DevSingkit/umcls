// app/login/page.tsx

import { SiteNav } from "@/components/layout/SiteNav";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { LoginForm } from "@/features/auth/components/LoginForm";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink antialiased">
      <SiteNav />

      <main className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6 md:py-16">
        <div className="w-full max-w-md">
          <p className="text-caption font-semibold uppercase tracking-wider text-brand">
            LMS Gateway
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Login to your account
          </h1>
          <p className="mt-2 text-caption text-text-secondary">
            Welcome! Enter your credentials below to access your dashboard.
          </p>

          <div className="mt-8 rounded-xl border border-border bg-surface p-6 shadow-sm sm:p-8">
            <LoginForm />
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}