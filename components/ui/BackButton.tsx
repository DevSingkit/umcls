"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

// ── Route-label map ─────────────────────────────────────────────────
// Maps known URL segments to human-readable labels. For dynamic
// segments (UUIDs), the component falls back to a generic "Back" label
// since the title isn't available from the URL alone.
const SEGMENT_LABELS: Record<string, string> = {
    student: "Home",
    teacher: "Dashboard",
    admin: "Dashboard",
    dashboard: "Dashboard",
    courses: "Courses",
    lessons: "Lessons",
    missions: "Missions",
    assignments: "Assignments",
    quizzes: "Quizzes",
    grades: "Grades",
    people: "People",
    settings: "Settings",
    todo: "To-do",
    archived: "Archived",
    edit: "Edit",
    new: "New",
    progress: "Progress",
    attempts: "Attempts",
    results: "Results",
};

// Dashboard roots — navigating "up" from these should not happen
// (AppShell already hides BackButton on primary nav paths).
const DASHBOARD_ROOTS = [
    "/student/dashboard",
    "/teacher/dashboard",
    "/admin/dashboard",
    "/admin/users",
    "/admin/courses",
    "/admin/audit-logs",
    "/admin/backups",
    "/student/todo",
    "/student/archived",
    "/teacher/archived",
    "/settings",
];

/**
 * Computes the parent URL by stripping the last path segment.
 * Returns null if already at a dashboard root.
 */
function getParentPath(pathname: string): { href: string; label: string } | null {
    // Normalize trailing slash
    const clean = pathname.replace(/\/+$/, "");

    if (DASHBOARD_ROOTS.includes(clean)) return null;

    const segments = clean.split("/").filter(Boolean);
    if (segments.length <= 2) return null; // e.g. "/student/dashboard" — already at root

    // Pop the last segment to get parent
    const parentSegments = segments.slice(0, -1);
    const parentPath = "/" + parentSegments.join("/");

    // The label comes from the LAST segment of the PARENT path
    const parentLastSegment = parentSegments[parentSegments.length - 1]!;
    const label = SEGMENT_LABELS[parentLastSegment] ?? "Back";

    return { href: parentPath, label };
}

/**
 * Hierarchical back button — navigates UP the URL tree (parent route)
 * instead of using browser history. Shows on desktop only (lg+); mobile
 * uses the native back gesture.
 */
export function BackButton() {
    const pathname = usePathname();
    const parent = getParentPath(pathname);

    if (!parent) return null;

    return (
        <Link
            href={parent.href}
            className="hidden lg:inline-flex min-h-touch items-center gap-1.5 rounded-2xl px-4 text-caption font-medium text-text-secondary hover:bg-surface-sunken hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand transition-colors"
        >
            <ArrowLeft size={16} aria-hidden="true" />
            {parent.label}
        </Link>
    );
}