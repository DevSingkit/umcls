"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { TopNav } from "./TopNav";
import { MobileBottomNav } from "./MobileBottomNav";
import { BackButton } from "@/components/ui/BackButton";
import { ScrollToTop } from "@/components/ui/ScrollToTop";
import { NAV_ITEMS, type Role } from "@/lib/navigation/nav-items";
import { PageHeaderProvider } from "./PageHeaderContext";

export interface ShellUser {
  id: string;
  fullName: string;
  role: Role;
  avatarUrl: string | null;
}

interface AppShellProps {
  user: ShellUser;
  children: ReactNode;
}

export function AppShell({ user, children }: AppShellProps) {
  const pathname = usePathname();

  // Full-screen Mission Mode check
  const isMissionPlayRoute = /^\/student\/courses\/[^/]+\/lessons\/[^/]+\/missions\/[^/]+\/?$/.test(
    pathname
  );

  if (isMissionPlayRoute) {
    return (
      <div className="min-h-screen bg-canvas">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-brand focus:px-4 focus:py-2.5 focus:text-white focus:shadow-md"
        >
          Skip to main content
        </a>
        <main id="main-content" className="min-h-screen">
          {children}
        </main>
      </div>
    );
  }

  const primaryNavPaths = NAV_ITEMS[user.role].map((item) => item.href);
  const showBackButton = !primaryNavPaths.includes(pathname);

  return (
    <PageHeaderProvider>
      <div className="min-h-screen bg-canvas text-ink">
        {/* Skip to Main Content Accessibility Link */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-brand focus:px-4 focus:py-2.5 focus:text-white focus:shadow-md"
        >
          Skip to main content
        </a>

        {/* Primary Navigation Components */}
        <Sidebar role={user.role} fullName={user.fullName} avatarUrl={user.avatarUrl} />

        {/* Sticky top bar: title + optional tabs, set per-page via usePageHeader */}
        <TopNav role={user.role} fullName={user.fullName} userId={user.id} avatarUrl={user.avatarUrl} />

        {/* Main Content Layout Container */}
        <main id="main-content" className="pb-24 lg:pb-12 lg:pl-[72px] transition-[padding] duration-200">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-12 lg:py-8">
            {showBackButton && (
              <div className="mb-4">
                <BackButton />
              </div>
            )}
            {children}
          </div>
        </main>

        {/* Floating scroll-to-top button */}
        <ScrollToTop />

        {/* Mobile Bottom Navigation Bar */}
        <MobileBottomNav role={user.role} />
      </div>
    </PageHeaderProvider>
  );
}
