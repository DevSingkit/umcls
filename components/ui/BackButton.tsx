"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const SEGMENT_LABELS: Record<string, string> = {
    student: "Home",
    teacher: "Dashboard",
    admin: "Dashboard",
    dashboard: "Dashboard",
    courses: "Dashboard",
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

const DASHBOARD_ROOTS = [
    "/student/dashboard",
    "/teacher/dashboard",
    "/admin/dashboard",
    "/admin/users",
    "/admin/courses",
    "/admin/audit-logs",
    "/admin/backups",
    "/student/todo",
    "/teacher/archived",
    "/settings",
    "/student/courses",
    "/teacher/courses",
];

/**
 * Computes the parent URL by stripping path segments.
 * Redirects course paths directly to the role dashboard.
 */
function getParentPath(pathname: string): { href: string; label: string } | null {
    const clean = pathname.replace(/\/+$/, "");

    if (DASHBOARD_ROOTS.includes(clean)) return null;

    const segments = clean.split("/").filter(Boolean);
    if (segments.length <= 2) return null;

    // Direct course pages back to /<role>/dashboard
    if (segments.includes("courses")) {
        const role = segments[0]; // student | teacher | admin
        return {
            href: `/${role}/dashboard`,
            label: SEGMENT_LABELS[role ?? ""] ?? "Dashboard",
        };
    }

    const parentSegments = segments.slice(0, -1);
    const parentPath = "/" + parentSegments.join("/");

    const parentLastSegment = parentSegments[parentSegments.length - 1]!;
    const label = SEGMENT_LABELS[parentLastSegment] ?? "Back";

    return { href: parentPath, label };
}

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