"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, type Role } from "@/lib/navigation/nav-items";
import { signOut } from "@/features/auth/actions/sign-out";

interface SidebarProps {
    role: Role;
    fullName: string;
}

export function Sidebar({ role, fullName }: SidebarProps) {
    const pathname = usePathname();
    const items = NAV_ITEMS[role];
    const initial = fullName?.trim()?.charAt(0)?.toUpperCase() || "?";

    return (
        <aside
            aria-label="Main navigation"
            className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-[240px] lg:flex-col lg:bg-sidebar"
        >
            <div className="flex items-center gap-2 px-5 py-6">
                <Image src="/logo.png" alt="" width={32} height={32} className="shrink-0 rounded-md" />
                <span className="font-heading text-h3 text-on-ink">UMCLS</span>
            </div>

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
                                    className={cn(
                                        "flex h-12 items-center gap-3 rounded-pill px-4 text-body-md text-on-ink",
                                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar",
                                        isActive ? "bg-sidebar-active font-semibold" : "opacity-80 hover:bg-white/5 hover:opacity-100"
                                    )}
                                >
                                    <Icon size={20} aria-hidden="true" className="shrink-0" />
                                    <span>{item.label}</span>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            <div className="border-t border-white/10 px-3 pb-3 pt-3">
                <div className="flex items-center gap-3 px-4 py-2">
                    <div
                        aria-hidden="true"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-pill bg-white/10 text-body-emphasis text-on-ink"
                    >
                        {initial}
                    </div>
                    <span className="truncate text-caption text-on-ink/80">{fullName}</span>
                </div>

                <form action={signOut}>
                    <button
                        type="submit"
                        className={cn(
                            "flex h-12 w-full items-center gap-3 rounded-pill px-4 text-body-md text-on-ink opacity-80 hover:bg-white/5 hover:opacity-100",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar"
                        )}
                    >
                        <LogOut size={20} aria-hidden="true" className="shrink-0" />
                        Sign out
                    </button>
                </form>
            </div>
        </aside>
    );
}
