"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, type Role } from "@/lib/navigation/nav-items";

interface MobileBottomNavProps {
    role: Role;
}

/**
 * Flat white bottom tab bar with a hairline top border, shown below the
 * desktop breakpoint (< 1024px — DESIGN-LMS.md §6.2). Simpler and more
 * predictable than a floating pill for this audience. Active tab uses
 * `brand` green; inactive uses `text-secondary`.
 */
export function MobileBottomNav({ role }: MobileBottomNavProps) {
    const pathname = usePathname();
    const items = NAV_ITEMS[role];

    // Tailwind can't read a dynamic `grid-cols-${n}`, it only picks up
    // classes it can see literally in source, so map the real item
    // count to an explicit class instead of hardcoding grid-cols-5.
    // This is what was leaving a clickable-looking but empty 5th slot
    // for teacher/student (4 items) while admin (5 items) filled it.
    const gridColsClass =
        items.length === 5
            ? "grid-cols-5"
            : items.length === 4
              ? "grid-cols-4"
              : items.length === 3
                ? "grid-cols-3"
                : items.length === 2
                  ? "grid-cols-2"
                  : "grid-cols-5";

    return (
        <nav
            role="navigation"
            aria-label="Main navigation"
            className={cn(
                "fixed inset-x-0 bottom-0 z-30 grid border-t border-hairline bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden",
                gridColsClass
            )}
        >
            {items.map((item) => {
                const isActive = item.isActive
                    ? item.isActive(pathname)
                    : pathname === item.href || (item.isV1 && pathname.startsWith(`${item.href}/`));
                const Icon = item.icon;

                return (
                    <Link
                        key={item.label}
                        href={item.href}
                        aria-current={isActive ? "page" : undefined}
                        className={cn(
                            "flex h-16 min-h-[44px] flex-col items-center justify-center gap-1",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-inset",
                            isActive ? "text-brand" : "text-text-secondary"
                        )}
                    >
                        <Icon size={20} aria-hidden="true" />
                        <span className="w-full truncate px-0.5 text-center text-[11px] leading-tight font-semibold">
                            {item.label}
                        </span>                    </Link>
                );
            })}
        </nav>
    );
}
