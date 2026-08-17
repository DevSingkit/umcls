"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { signOut } from "@/features/auth/actions/sign-out";
import { ROLE_LABELS, type Role } from "@/lib/navigation/nav-items";
import { NotificationBell } from "./NotificationBell";

interface TopNavProps {
    role: Role;
    fullName: string;
    userId: string;
}

/**
 * Pink top bar shown below the desktop breakpoint (< 1024px). Matches the
 * sidebar's deep raspberry-pink chrome color (DESIGN-LMS.md §6.1/§6.2).
 * The notification bell renders inline here on mobile (not fixed) so it
 * sits next to the account menu instead of floating on top of it.
 *
 * Logo sits in a white rounded-pill chip, sized up (56px chip / 44px mark)
 * to match the landing page's header treatment — the plain small logo
 * directly on the pink background was hard to make out at a glance.
 */
export function TopNav({ role, fullName, userId }: TopNavProps) {
    const initial = fullName?.trim()?.charAt(0)?.toUpperCase() || "?";

    return (
       <header className="sticky top-0 z-30 flex items-center justify-between gap-2 bg-sidebar px-4 py-3 lg:hidden">
    <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-pill bg-surface">
            <Image src="/logo.png" alt="" width={112} height={112} className="h-11 w-11 object-contain" />
        </span>
        <div className="min-w-0 truncate">
            <span className="font-heading text-body-md font-semibold text-on-ink">UMCLSI</span>
            <span className="ml-2 text-caption text-on-ink/70">{ROLE_LABELS[role]}</span>
        </div>
    </div>

    <div className="flex items-center gap-2">
        <NotificationBell userId={userId} />

                {/* Native <details>/<summary> gives us a keyboard- and screen-reader
                    operable disclosure without extra client state — good enough for
                    a two-item account menu. */}
                <details className="relative">
                    <summary
                        aria-label={`Account menu for ${fullName}`}
                        className={cn(
                            "flex h-11 w-11 list-none items-center justify-center rounded-pill bg-white/10 text-body-emphasis text-on-ink",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar"
                        )}
                    >
                        {initial}
                    </summary>
                    <div className="absolute right-0 z-40 mt-2 w-44 rounded-md bg-surface p-2 shadow-modal">
                        <p className="truncate px-2 py-1 text-caption text-text-secondary">{fullName}</p>
                        <form action={signOut}>
                            <button
                                type="submit"
                                className="w-full rounded-md px-2 py-2 text-left text-body-md text-ink hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                            >
                                Sign out
                            </button>
                        </form>
                    </div>
                </details>
            </div>
        </header>
    );
}