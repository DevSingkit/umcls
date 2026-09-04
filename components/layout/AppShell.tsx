"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { TopNav } from "./TopNav";
import { MobileBottomNav } from "./MobileBottomNav";
import { NotificationBell } from "./NotificationBell";
import { BackButton } from "@/components/ui/BackButton";
import { NAV_ITEMS, type Role } from "@/lib/navigation/nav-items";

export interface ShellUser {
    id: string;
    fullName: string;
    role: Role;
    avatarUrl: string | null;
}

interface AppShellProps {
    user: ShellUser;
    children: ReactNode;
}

/**
 * Role-aware app chrome: desktop sidebar (≥ 1024px) or mobile top bar +
 * bottom tab bar (< 1024px), wrapping every (dashboard) page.
 * See tasks.md PH0-006 and DESIGN-LMS.md §6.
 *
 * Content offset is a FIXED lg:pl-[72px] — matching Sidebar's
 * collapsed width, not its expanded one. Per §6.1a, the sidebar
 * overlays the page on hover/pin rather than pushing it, so this
 * value never changes regardless of Sidebar's own expanded state.
 * Sidebar's expanded (240px) state uses a higher z-index and its own
 * shadow to read as "floating over" the page, not "resizing" it.
 *
 * Back button visibility: derived from NAV_ITEMS[role] instead of a
 * hardcoded dashboard-only path list — a hardcoded list silently
 * missed every OTHER primary nav destination (My Courses, Archived,
 * To-do), which wrongly showed a "Back" button on pages the person
 * already reached directly from the sidebar/bottom nav. Any exact
 * match against this role's own nav item hrefs is a primary
 * destination and never gets a back button; everything else (a course
 * detail page, a create form, etc.) does.
 */
export function AppShell({ user, children }: AppShellProps) {
    const pathname = usePathname();

    // PHASE C/D FULL-SCREEN MISSION MODE (2026-09-04): the student
    // mission-play route needs zero chrome — no Sidebar, TopNav, or
    // MobileBottomNav — so the gameplay screen (ActivityRunner) can
    // use the entire viewport, matching the Duolingo/Quizizz-style
    // Mission Mode this app is going for. Scoped to an EXACT match on
    // this one route shape (not a broad "/student" prefix check) so
    // it never accidentally swallows other student pages (dashboard,
    // course view, lesson reader, quiz-taking, etc.) that still need
    // normal navigation chrome. Chrome returns automatically the
    // moment the student navigates away (Quit or mastery's "Back to
    // missions" both route elsewhere), so there's no need to track a
    // "game is done" state here — leaving the route IS "done".
    const isMissionPlayRoute = /^\/student\/courses\/[^/]+\/lessons\/[^/]+\/missions\/[^/]+\/?$/.test(
        pathname
    );

    if (isMissionPlayRoute) {
        return (
            <div className="min-h-screen bg-canvas">
                <a
                    href="#main-content"
                    className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-brand focus:px-4 focus:py-2 focus:text-on-ink"
                >
                    Skip to main content
                </a>
                <main id="main-content">{children}</main>
            </div>
        );
    }

    const primaryNavPaths = NAV_ITEMS[user.role].map((item) => item.href);
    const showBackButton = !primaryNavPaths.includes(pathname);

    return (
        <div className="min-h-screen bg-canvas">
            <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-brand focus:px-4 focus:py-2 focus:text-on-ink"
            >
                Skip to main content
            </a>

            <Sidebar role={user.role} fullName={user.fullName} avatarUrl={user.avatarUrl} />
            <TopNav role={user.role} fullName={user.fullName} userId={user.id} avatarUrl={user.avatarUrl} />
            <div className="hidden lg:block">
                <NotificationBell userId={user.id} />
            </div>
            <main id="main-content" className="pb-20 lg:pb-8 lg:pl-[72px]">
                <div className="mx-auto max-w-[1200px] px-4 py-6 lg:px-16 lg:py-8">
                    {showBackButton && <BackButton />}
                    <div className={showBackButton ? "mt-2" : undefined}>{children}</div>
                </div>
            </main>

            <MobileBottomNav role={user.role} />
        </div>
    );
}
