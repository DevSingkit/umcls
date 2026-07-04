"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, type Role } from "@/lib/navigation/nav-items";

interface MobileBottomNavProps {
    role: Role;
}

/**
 * Flat ink slab, 5 equal-width tabs, shown below the desktop breakpoint
 * (< 1024px). Active tab uses {colors.primary}; inactive uses
 * {colors.graphite} (DESIGN-LMS.md §3.1).
 */
export function MobileBottomNav({ role }: MobileBottomNavProps) {
    const pathname = usePathname();
    const items = NAV_ITEMS[role];

    return (
        <nav
            role="navigation"
            aria-label="Main navigation"
            className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 bg-ink pb-[env(safe-area-inset-bottom)] lg:hidden"
        >
            {items.map((item) => {
                const isActive =
                    pathname === item.href || (item.isV1 && pathname.startsWith(`${item.href}/`));
                const Icon = item.icon;

                return (
                    <Link
                        key={item.label}
                        href={item.href}
                        aria-current={isActive ? "page" : undefined}
                        className={cn(
                            "flex h-14 flex-col items-center justify-center gap-1",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset",
                            isActive ? "text-primary" : "text-graphite"
                        )}
                    >
                        <Icon size={20} aria-hidden="true" />
                        <span className="text-caption-sm">{item.label}</span>
                    </Link>
                );
            })}
        </nav>
    );
}