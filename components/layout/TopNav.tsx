"use client";

import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "@/features/auth/actions/sign-out";
import { ROLE_LABELS, type Role } from "@/lib/navigation/nav-items";

interface TopNavProps {
    role: Role;
    fullName: string;
}

/**
 * Ink top bar shown below the desktop breakpoint (< 1024px). Notifications
 * bell is a disabled placeholder — notifications ship in PH5-003 (V2).
 */
export function TopNav({ role, fullName }: TopNavProps) {
    const initial = fullName?.trim()?.charAt(0)?.toUpperCase() || "?";

    return (
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between bg-ink px-4 lg:hidden">
            <div className="flex items-baseline gap-2">
                <span className="text-body-emphasis text-on-ink">LMS</span>
                <span className="text-caption-sm text-on-ink/70">{ROLE_LABELS[role]}</span>
            </div>

            <div className="flex items-center gap-1">
                <button
                    type="button"
                    disabled
                    aria-label="Notifications (coming soon)"
                    className="flex h-11 w-11 items-center justify-center text-on-ink/40"
                >
                    <Bell size={20} aria-hidden="true" />
                </button>

                {/* Native <details>/<summary> gives us a keyboard- and screen-reader
            operable disclosure without extra client state — good enough for
            a two-item account menu in V1. */}
                <details className="relative">
                    <summary
                        aria-label={`Account menu for ${fullName}`}
                        className={cn(
                            "flex h-11 w-11 list-none items-center justify-center rounded-full bg-ink-soft text-body-emphasis text-on-ink",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
                        )}
                    >
                        {initial}
                    </summary>
                    <div className="absolute right-0 mt-2 w-40 rounded-lg bg-canvas p-2 shadow-[0_4px_16px_rgba(0,0,0,0.12)]">
                        <p className="truncate px-2 py-1 text-caption-md text-graphite">{fullName}</p>
                        <form action={signOut}>
                            <button
                                type="submit"
                                className="w-full rounded-md px-2 py-2 text-left text-body-md text-ink hover:bg-cloud focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            >
                                Sign Out
                            </button>
                        </form>
                    </div>
                </details>
            </div>
        </header>
    );
}