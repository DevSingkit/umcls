import type { LucideIcon } from "lucide-react";
import {
    Home,
    Users,
    ScrollText,
    Settings,
    BookOpen,
    ClipboardList,
    GraduationCap,
    Sparkles,
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
     * when two tabs share the same href (e.g. "My Courses" and
     * "Assignments" both point at /teacher/courses since assignments are
     * nested under a course, not a standalone route) — the default
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
        { label: "Users", href: "/admin/users", icon: Users, isV1: true }, // PH2-002, trimmed
        {
            label: "Enroll",
            href: "/admin/enroll",
            icon: ClipboardList,
            isV1: true, // PH2-002, trimmed — page existed but was never reachable from nav
        },
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
    ],
    teacher: [
        { label: "Dashboard", href: "/teacher/dashboard", icon: Home, isV1: true },
        { label: "My Courses", href: "/teacher/courses", icon: BookOpen, isV1: true }, // PH3-001/002
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
    ],
    student: [
        { label: "Home", href: "/student/dashboard", icon: Home, isV1: true },
        { label: "My Courses", href: "/student/courses", icon: BookOpen, isV1: true }, // PH4-002
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
            label: "Recommendations",
            href: "/coming-soon?feature=Recommendations",
            icon: Sparkles,
            isV1: false, // PH7-002, V3
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