"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, type Role } from "@/lib/navigation/nav-items";
import { signOut } from "@/features/auth/actions/sign-out";

interface SidebarProps {
    role: Role;
    fullName: string;
}

/**
 * Fixed left sidebar, desktop only (≥ 1024px — DESIGN-LMS.md §3.3, §1.7).
 * Background {colors.ink}; active item = 2px {colors.primary} left border
 * + {colors.ink-soft} background.
 */
export function Sidebar({ role, fullName }: SidebarProps) {
    const pathname = usePathname();
    const items = NAV_ITEMS[role];
    const initial = fullName?.trim()?.charAt(0)?.toUpperCase() || "?";

    return (
        <aside
            aria-label="Main navigation"
            className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-[240px] lg:flex-col lg:bg-ink"
        >
            <div className="px-5 py-6">
                <span className="text-display-xs text-on-ink">LMS</span>
            </div>

            <nav aria-label="Primary" className="flex-1">
                <ul>
                    {items.map((item) => {
                        const isActive =
                            pathname === item.href || (item.isV1 && pathname.startsWith(`${item.href}/`));
                        const Icon = item.icon;

                        return (
                            <li key={item.label}>
                                <Link
                                    href={item.href}
                                    aria-current={isActive ? "page" : undefined}
                                    className={cn(
                                        "flex items-center gap-3 border-l-2 border-transparent px-5 py-3 text-body-md text-on-ink",
                                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-ink",
                                        isActive ? "border-primary bg-ink-soft" : "hover:bg-ink-soft/60"
                                    )}
                                >
                                    <Icon
                                        size={20}
                                        aria-hidden="true"
                                        className={isActive ? "text-primary" : "text-steel"}
                                    />
                                    <span>{item.label}</span>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            <div className="border-t border-ink-soft px-5 py-4">
                <form action={signOut}>
                    <button
                        type="submit"
                        className={cn(
                            "flex w-full items-center gap-3 py-3 text-body-md text-on-ink",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
                        )}
                    >
                        <LogOut size={20} aria-hidden="true" className="text-steel" />
                        Sign Out
                    </button>
                </form>

                <div className="mt-4 flex items-center gap-3">
                    <div
                        aria-hidden="true"
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-ink-soft text-body-emphasis text-on-ink"
                    >
                        {initial}
                    </div>
                    <span className="truncate text-caption-md text-on-ink/80">{fullName}</span>
                </div>
            </div>
        </aside>
    );
}