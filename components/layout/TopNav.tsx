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
 */
export function TopNav({ role, fullName, userId }: TopNavProps) {
    const initial = fullName?.trim()?.charAt(0)?.toUpperCase() || "?";

    return (
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between bg-sidebar px-4 lg:hidden">
            <div className="flex items-center gap-2">
                <Image src="/logo.png" alt="" width={24} height={24} className="shrink-0 rounded-md" />
                <span className="font-heading text-body-emphasis text-on-ink">UMCLSI</span>
                <span className="text-caption text-on-ink/70">{ROLE_LABELS[role]}</span>
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

