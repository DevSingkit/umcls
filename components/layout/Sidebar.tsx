"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LogOut, Menu, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, type Role } from "@/lib/navigation/nav-items";
import { signOut } from "@/features/auth/actions/sign-out";
import { Avatar } from "@/components/ui/Avatar";

interface SidebarProps {
    role: Role;
    fullName: string;
    avatarUrl: string | null;
}

const PIN_STORAGE_KEY = "umclsi-sidebar-pinned";

// Collapsed (72px) by default, expands to 240px on hover or when
// pinned — see DESIGN-LMS.md §6.1a. Overlays the page rather than
// pushing it: AppShell's content offset stays fixed at the collapsed
// width (lg:pl-[72px]) regardless of this component's own expanded
// state, so hovering never reflows anything underneath. Desktop-only
// (this whole component is already lg:flex-only) — there's no
// collapse/expand concept on mobile, per spec.
export function Sidebar({ role, fullName, avatarUrl }: SidebarProps) {
    const pathname = usePathname();
    const items = NAV_ITEMS[role];

    const [isPinned, setIsPinned] = useState(false);
    const [isHovering, setIsHovering] = useState(false);

    // Pin state persists across page loads — spec calls this "not a
    // hard requirement for the first pass but the intended end state";
    // localStorage is simple enough to just include now rather than
    // build twice.
    useEffect(() => {
        const stored = window.localStorage.getItem(PIN_STORAGE_KEY);
        if (stored === "true") setIsPinned(true);
    }, []);

    function togglePin() {
        setIsPinned((prev) => {
            const next = !prev;
            window.localStorage.setItem(PIN_STORAGE_KEY, String(next));
            return next;
        });
    }

    const isExpanded = isPinned || isHovering;

    return (
        <aside
            aria-label="Main navigation"
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            className={cn(
                "hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:flex lg:flex-col lg:bg-sidebar",
                "transition-[width] duration-200 ease-out",
                isExpanded ? "lg:w-[240px] lg:shadow-modal" : "lg:w-[72px]"
            )}
        >
            <div className="flex items-center gap-2 px-5 py-6">
                <Image src="/logo.webp" alt="" width={32} height={32} className="shrink-0 rounded-md" />
                {isExpanded && (
                    <span className="font-heading text-h3 text-on-ink whitespace-nowrap">UMCLSI</span>
                )}
            </div>

            {/* Pin toggle — small hamburger icon, per spec. Only
                meaningful once expanded (hovering or already pinned);
                showing it even collapsed lets a keyboard user tab to it
                without needing to hover first. */}
            <button
                type="button"
                onClick={togglePin}
                aria-pressed={isPinned}
                aria-label={isPinned ? "Unpin sidebar" : "Pin sidebar open"}
                className={cn(
                    "mx-3 mb-2 flex h-10 items-center gap-3 rounded-pill px-4 text-on-ink opacity-70 hover:bg-white/5 hover:opacity-100",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar",
                    isPinned && "opacity-100 bg-white/5"
                )}
            >
                <Menu size={18} aria-hidden="true" className="shrink-0" />
                {isExpanded && <span className="text-caption whitespace-nowrap">{isPinned ? "Pinned" : "Pin open"}</span>}
            </button>

            <nav aria-label="Primary" className="flex-1 px-3">
                <ul className="flex flex-col gap-1">
                    {items.map((item) => {
                        const isActive = item.isActive
                            ? item.isActive(pathname)
                            : pathname === item.href || (item.isV1 && pathname.startsWith(`${item.href}/`));
                        const Icon = item.icon;

                        return (
                            <li key={item.label}>
                                <Link
                                    href={item.href}
                                    aria-current={isActive ? "page" : undefined}
                                    title={isExpanded ? undefined : item.label}
                                    className={cn(
                                        "flex h-12 items-center gap-3 rounded-pill px-4 text-body-md text-on-ink overflow-hidden",
                                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar",
                                        isActive ? "bg-sidebar-active font-semibold" : "opacity-80 hover:bg-white/5 hover:opacity-100"
                                    )}
                                >
                                    <Icon size={20} aria-hidden="true" className="shrink-0" />
                                    {isExpanded && <span className="whitespace-nowrap">{item.label}</span>}
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            <div className="border-t border-white/10 px-3 pb-3 pt-3 space-y-1">
                <div
                    className={cn(
                        "flex h-12 items-center gap-3 overflow-hidden",
                        isExpanded ? "px-4" : "w-12 mx-auto justify-center"
                    )}
                >
                    <Avatar fullName={fullName} avatarUrl={avatarUrl} size="sm" toneClassName="bg-white/10 text-on-ink" />
                    {isExpanded && <span className="truncate text-caption text-on-ink/80">{fullName}</span>}
                </div>

                <Link
                    href="/settings"
                    title={isExpanded ? undefined : "Settings"}
                    className={cn(
                        "flex h-12 items-center gap-3 rounded-md text-body-md text-on-ink opacity-80 hover:bg-white/5 hover:opacity-100 overflow-hidden",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar",
                        isExpanded ? "px-4" : "w-12 mx-auto justify-center"
                    )}
                >
                    <Settings size={20} aria-hidden="true" className="shrink-0" />
                    {isExpanded && <span className="whitespace-nowrap">Settings</span>}
                </Link>

                <form action={signOut}>
                    <button
                        type="submit"
                        title={isExpanded ? undefined : "Sign out"}
                        className={cn(
                            "flex h-12 items-center gap-3 rounded-md text-body-md text-on-ink opacity-80 hover:bg-white/5 hover:opacity-100 overflow-hidden",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar",
                            isExpanded ? "w-full px-4" : "w-12 mx-auto justify-center"
                        )}
                    >
                        <LogOut size={20} aria-hidden="true" className="shrink-0" />
                        {isExpanded && <span className="whitespace-nowrap">Sign out</span>}
                    </button>
                </form>
            </div>
        </aside>
    );
}
