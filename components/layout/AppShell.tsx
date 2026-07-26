"use client";

import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { TopNav } from "./TopNav";
import { MobileBottomNav } from "./MobileBottomNav";
import { NotificationBell } from "./NotificationBell";
import type { Role } from "@/lib/navigation/nav-items";

export interface ShellUser {
    id: string;
    fullName: string;
    role: Role;
}

interface AppShellProps {
    user: ShellUser;
    children: ReactNode;
}

/**
 * Role-aware app chrome: desktop sidebar (≥ 1024px) or mobile top bar +
 * bottom tab bar (< 1024px), wrapping every (dashboard) page.
 * See tasks.md PH0-006 and DESIGN-LMS.md §6.
 */
export function AppShell({ user, children }: AppShellProps) {
    return (
        <div className="min-h-screen bg-canvas">
            {/* Accessibility §9 — first focusable element on every page */}
            <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-brand focus:px-4 focus:py-2 focus:text-on-ink"
            >
                Skip to main content
            </a>

            <Sidebar role={user.role} fullName={user.fullName} />
            <TopNav role={user.role} fullName={user.fullName} userId={user.id} />
            {/* Desktop only — on mobile, NotificationBell renders inline inside
                TopNav instead, so it sits next to the account menu instead of
                floating on top of it. */}
            <div className="hidden lg:block">
                <NotificationBell userId={user.id} />
            </div>
            <main id="main-content" className="pb-20 lg:pb-8 lg:pl-[240px]">
                <div className="mx-auto max-w-[1200px] px-4 py-6 lg:px-16 lg:py-8">{children}</div>
            </main>

            <MobileBottomNav role={user.role} />
        </div>
    );
}
