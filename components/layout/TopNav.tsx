// components/layout/TopNav.tsx

"use client";

import Image from "next/image";
import Link from "next/link";
import { Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "@/features/auth/actions/sign-out";
import { ROLE_LABELS, type Role } from "@/lib/navigation/nav-items";
import { NotificationBell } from "./NotificationBell";
import { Avatar } from "@/components/ui/Avatar";
import { usePageHeaderValue } from "./PageHeaderContext";

interface TopNavProps {
  role: Role;
  fullName: string;
  userId: string;
  avatarUrl: string | null;
}

// Account menu (avatar, name, Settings, Sign out) lives here only —
// removed from Sidebar to avoid duplicating the same actions in two
// places.
export function TopNav({ role, fullName, userId, avatarUrl }: TopNavProps) {
  const header = usePageHeaderValue();

  return (
    <header
      className={cn(
        "sticky top-0 z-30 bg-sidebar border-b border-white/10",
        // Sit clear of the fixed sidebar on desktop; sidebar itself has a
        // higher z-index so its hover-expansion still overlaps correctly.
        "lg:pl-[72px]"
      )}
    >
      {/* Title row: h-16 per spec 4A. Mobile keeps the brand mark since
          the sidebar rail is hidden below lg; desktop drops it since the
          logo already lives in the sidebar. */}
      <div className="flex h-16 items-center justify-between gap-2 px-4 lg:px-6">
        {/* Mobile brand mark */}
        <div className="flex min-w-0 items-center gap-3 lg:hidden">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-pill bg-white/10">
            <Image
              src="/logo.webp"
              alt="UMCLSI Logo"
              width={88}
              height={88}
              className="h-8 w-8 object-contain"
            />
          </span>
          <div className="min-w-0 truncate">
            <span className="font-heading text-body-md font-semibold text-on-ink">
              UMCLSI
            </span>
            <span className="ml-2 text-caption text-on-ink/70">
              {ROLE_LABELS[role]}
            </span>
          </div>
        </div>

        {/* Desktop page title, sourced from PageHeaderContext.
            Always breadcrumbs off "UMCLSI" — e.g. "UMCLSI > English"
            with the section/instructor as a lighter subtitle. */}
        <div className="hidden min-w-0 items-baseline gap-2 lg:flex">
          <span className="text-body-md font-semibold text-on-ink/70 shrink-0">
            UMCLSI
          </span>
          <span className="text-on-ink/70 shrink-0" aria-hidden="true">
            &gt;
          </span>
          {header ? (
            <div className="min-w-0 truncate">
              <span className="font-bold text-xl text-on-ink truncate">
                {header.title}
              </span>
              {header.subtitle && (
                <span className="ml-3 text-sm text-on-ink/70 truncate">
                  {header.subtitle}
                </span>
              )}
            </div>
          ) : (
            <span className="font-bold text-xl text-on-ink truncate">
              {ROLE_LABELS[role]}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <NotificationBell userId={userId} />

          <details className="relative">
            <summary
              aria-label={`Account menu for ${fullName}`}
              className={cn(
                "list-none cursor-pointer rounded-pill",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar"
              )}
            >
              <Avatar
                fullName={fullName}
                avatarUrl={avatarUrl}
                size="md"
                toneClassName="bg-white/10 text-on-ink"
              />
            </summary>
            <div className="absolute right-0 z-40 mt-2 w-48 rounded-md bg-surface p-2 shadow-modal border border-hairline">
              <p className="truncate px-3 py-2 text-caption font-bold text-ink-soft border-b border-hairline mb-1">
                {fullName}
              </p>
              <Link
                href="/settings"
                className="flex min-h-[44px] items-center gap-2 rounded-md px-3 text-body-md text-ink hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                <Settings className="h-4 w-4 shrink-0 text-ink-soft" aria-hidden="true" />
                Settings
              </Link>
              <form action={signOut}>
                <button
                  type="submit"
                  className="flex w-full min-h-[44px] items-center rounded-md px-3 text-left text-body-md text-ink hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  Sign out
                </button>
              </form>
            </div>
          </details>
        </div>
      </div>

      {/* Optional tabs row (e.g. CourseTabs), pushed here by whatever page
          called usePageHeader. Kept inside the same sticky bar so it reads
          as one header, matching the Classroom reference. */}
      {header?.tabs && (
        <div className="px-4 lg:px-6">{header.tabs}</div>
      )}
    </header>
  );
}
