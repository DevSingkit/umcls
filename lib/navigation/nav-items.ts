import type { LucideIcon } from "lucide-react";
import {
    Home,
    Users,
    ScrollText,
    Archive,
    BookOpen,
    ListChecks,
} from "lucide-react";

export type Role = "admin" | "teacher" | "student";

export interface NavItem {
    label: string;
    href: string;
    icon: LucideIcon;
    isV1: boolean;
    isActive?: (pathname: string) => boolean;
}

// Final shape, corrected 2026-08-23 after checking real Google
// Classroom behavior directly (not assumption):
//   - Teacher has NO "To-do" nav item — confirmed real Classroom
//     behavior: teachers' own classes never show under To-do at all,
//     that's a student-only concept. Teacher's real equivalent is the
//     grading queue, which stays dashboard-only (NeedsAttentionList),
//     not a separate nav destination.
//   - Teacher's "My Courses" was REMOVED — real Classroom's own
//     Teaching/Home screen already IS the full class list (the same
//     card grid), there's no separate list page to link to. The
//     teacher dashboard's course grid is no longer capped/sliced for
//     this exact reason (see teacher-dashboard.ts) — it's now the one
//     and only place a teacher's classes are listed, not a "preview."
//     Teacher: Dashboard, Archived — 2 items.
//   - Student keeps My Courses AND To-do — Dashboard/Home, My Courses,
//     To-do, Archived — 4 items. Student's dashboard course grid is
//     still a genuine preview (kept sliced) since My Courses still
//     exists as its own full list on the student side — this
//     asymmetry is deliberate, not an oversight, unless/until the
//     same simplification is requested for students too.
//   - Settings is NOT a primary nav item for ANY role — reachable only
//     via the account-menu dropdown, same place as Sign Out.
//   - People/Grades are course-scoped only (§6.1b) — never global nav.
//   - Admin's Bulk Import lives as a /admin/users page action, not its
//     own nav item. Admin's Grades route stays unlinked from nav.
export const NAV_ITEMS: Record<Role, NavItem[]> = {
    admin: [
        { label: "Dashboard", href: "/admin/dashboard", icon: Home, isV1: true },
        {
            label: "Users",
            href: "/admin/users",
            icon: Users,
            isV1: true,
        },
        {
            label: "Archive",
            href: "/admin/courses",
            icon: BookOpen,
            isV1: true,
        },
        {
            label: "Audit Logs",
            href: "/admin/audit-logs",
            icon: ScrollText,
            isV1: true,
        },
        {
            label: "Backups",
            href: "/admin/backups",
            icon: Archive,
            isV1: true,
        },
    ],
    teacher: [
        { label: "Dashboard", href: "/teacher/dashboard", icon: Home, isV1: true },
        {
            label: "Archived",
            href: "/teacher/archived",
            icon: Archive,
            isV1: true,
        },
    ],
    student: [
        { label: "Home", href: "/student/dashboard", icon: Home, isV1: true },
        {
            label: "My Courses",
            href: "/student/courses",
            icon: BookOpen,
            isV1: true,
        },
        {
            label: "To-do",
            href: "/student/todo",
            icon: ListChecks,
            isV1: true,
        },
        {
            label: "Archived",
            href: "/student/archived",
            icon: Archive,
            isV1: true,
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
