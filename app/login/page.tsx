// app/login/page.tsx

import Image from "next/image";
import { SiteNav } from "@/components/layout/SiteNav";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { LoginForm } from "@/features/auth/components/LoginForm";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink antialiased">
      <SiteNav />

      <main className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-12 sm:px-6 md:py-16">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
        >
          <Image
            src="/logo.webp"
            alt=""
            width={800}
            height={800}
            className="h-[280px] w-[280px] opacity-[0.06] object-contain sm:h-[420px] sm:w-[420px] md:h-[560px] md:w-[560px]"
            priority={false}
          />
        </div>

        <div className="relative z-10 w-full max-w-md">
          
          <h1 className="mt-2 text-h1 font-bold tracking-tight text-ink">
            Log in to your account
          </h1>

          <div className="mt-8 rounded-md border border-hairline bg-surface p-6 shadow-card sm:p-8">
            <LoginForm />
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}