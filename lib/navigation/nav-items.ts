import type { LucideIcon } from "lucide-react";
import {
    Home,
    Users,
    BarChart3,
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
}

// Tab order/labels/icons here follow DESIGN-LMS.md §3.1 "Tab definitions per role" verbatim.
// V1 status follows VERSION_ROADMAP.md's cut list.
export const NAV_ITEMS: Record<Role, NavItem[]> = {
    admin: [
        { label: "Dashboard", href: "/admin/dashboard", icon: Home, isV1: true },
        { label: "Users", href: "/admin/users", icon: Users, isV1: true }, // PH2-002, trimmed
        {
            label: "Analytics",
            href: "/coming-soon?feature=Analytics",
            icon: BarChart3,
            isV1: false, // PH2-001, V2
        },
        {
            label: "Audit Logs",
            href: "/coming-soon?feature=Audit+Logs",
            icon: ScrollText,
            isV1: false, // PH2-004, V2
        },
        {
            label: "Settings",
            href: "/coming-soon?feature=Settings",
            icon: Settings,
            isV1: false,
        },
    ],
    teacher: [
        { label: "Dashboard", href: "/teacher/dashboard", icon: Home, isV1: true },
        { label: "My Courses", href: "/teacher/courses", icon: BookOpen, isV1: true }, // PH3-001/002
        {
            label: "Assignments",
            href: "/coming-soon?feature=Assignments",
            icon: ClipboardList,
            isV1: false, // PH3-004 / PH4-003 / PH5-001, V2
        },
        {
            label: "Grades",
            href: "/coming-soon?feature=Grades",
            icon: GraduationCap,
            isV1: false, // full gradebook is PH5-002, V2
        },
        {
            label: "Settings",
            href: "/coming-soon?feature=Settings",
            icon: Settings,
            isV1: false,
        },
    ],
    student: [
        { label: "Home", href: "/student/dashboard", icon: Home, isV1: true },
        { label: "My Courses", href: "/student/courses", icon: BookOpen, isV1: true }, // PH4-002
        {
            label: "Assignments",
            href: "/coming-soon?feature=Assignments",
            icon: ClipboardList,
            isV1: false, // V2
        },
        {
            label: "Grades",
            href: "/coming-soon?feature=Grades",
            icon: GraduationCap,
            isV1: false, // V1 only has the post-submit result screen (PH4-005), not a grades tab
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