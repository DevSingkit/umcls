import type { LucideIcon } from "lucide-react";
import {
    Home,
    Users,
    ScrollText,
    Settings,
    GraduationCap,
    Archive,
    BookOpen,
} from "lucide-react";

export type Role = "admin" | "teacher" | "student";

export interface NavItem {
    label: string;
    href: string;
    icon: LucideIcon;
    /**
     * Whether this destination is actually built in V1 (see VERSION_ROADMAP.md).
     * The design system (§3.1) calls for exactly 5 tabs per role at all times —
     * items not yet built still render, but point at /coming-soon instead of a
     * real feature, so the shell never links to a 404.
     */
    isV1: boolean;
    /**
     * Optional override for deciding whether this tab is "active." Needed
     * when a tab's href doesn't match the current pathname exactly but
     * should still show as active (e.g. a nested detail route under a
     * tab whose own href is a shorter parent path) — the default
     * href-equality check can't tell them apart. When omitted, falls back
     * to the default pathname === href / startsWith(href + "/") check.
     */
    isActive?: (pathname: string) => boolean;
}

// Tab order/labels/icons here follow DESIGN-LMS.md §3.1 "Tab definitions per role" verbatim.
// V1 status follows VERSION_ROADMAP.md's cut list.
export const NAV_ITEMS: Record<Role, NavItem[]> = {
    admin: [
        { label: "Dashboard", href: "/admin/dashboard", icon: Home, isV1: true },
        {
            label: "Audit Logs",
            href: "/admin/audit-logs",
            icon: ScrollText,
            isV1: true, // PH2-004 — now built
        },
        {
            label: "Bulk Import",
            href: "/admin/bulk-import",
            icon: Users,
            isV1: true, // PH2-003 — now built
        },
        {
            label: "Backups",
            href: "/admin/backups",
            icon: Archive,
            isV1: true, // users + grades CSV export
        },
        {
            label: "Courses",
            href: "/admin/courses",
            icon: BookOpen,
            isV1: true, // course archiving
        },
    ],
    teacher: [
        { label: "Dashboard", href: "/teacher/dashboard", icon: Home, isV1: true },
        {
            label: "People",
            href: "/teacher/people",
            icon: Users,
            isV1: true, // course roster (teacher) — replaces the old Assignments stopgap slot
        },
        {
            label: "Grades",
            href: "/teacher/gradebook",
            icon: GraduationCap,
            isV1: true, // Batch 6 — built
        },
        {
            label: "Settings",
            href: "/settings",
            icon: Settings,
            isV1: true, // built — profile, password, notifications, text size
        },
        {
            label: "Archived",
            href: "/teacher/archived",
            icon: Archive,
            isV1: true, // course archiving (admin-triggered)
        },
    ],
    student: [
        { label: "Home", href: "/student/dashboard", icon: Home, isV1: true },
        {
            label: "People",
            href: "/student/people",
            icon: Users,
            isV1: true, // classmates (name only) — replaces the old Assignments stopgap slot
        },
        {
            label: "Grades",
            href: "/student/grades",
            icon: GraduationCap,
            isV1: true, // Batch 8 — built
        },
        {
            label: "Archived",
            href: "/student/archived",
            icon: Archive,
            isV1: true, // course archiving (admin-triggered)
        },
    ],
};

export const ROLE_LABELS: Record<Role, string> = {
    admin: "Admin",
    teacher: "Teacher",
    student: "Student",
};

export const ROLE_DASHBOARD: Record<Role, string> = {
    admin: "/admin/dashboard",
    teacher: "/teacher/dashboard",
    student: "/student/dashboard",
};