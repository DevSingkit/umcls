"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { Role } from "@/lib/navigation/nav-items";

export type ParentRoute = {
    href: string;
    label: string;
};

// Root destinations that do not show a back button
const ROOT_PATHS = new Set([
    "/student/dashboard",
    "/student/todo",
    "/teacher/dashboard",
    "/admin/dashboard",
    "/admin/users",
    "/admin/courses",
    "/admin/audit-logs",
    "/admin/backups",
]);

/**
 * Computes the correct parent URL and label for any route in the application.
 * Ensures the destination is always a real, existing page rather than an
 * intermediate path with no route (e.g. /lessons, /assignments, /quizzes).
 */
export function getParentPath(pathname: string, userRole?: Role): ParentRoute | null {
    const clean = pathname.replace(/\/+$/, "");

    // 1. Root dashboard & primary nav roots don't have a back button
    if (ROOT_PATHS.has(clean)) return null;

    const segments = clean.split("/").filter(Boolean);
    if (segments.length === 0) return null;

    const first = segments[0] as string; // 'student' | 'teacher' | 'admin' | 'settings' | 'coming-soon'
    const role = (userRole || (first === "student" || first === "teacher" || first === "admin" ? first : "student")) as Role;
    const dashboardHref = `/${role}/dashboard`;
    const dashboardLabel = role === "student" ? "Home" : "Dashboard";

    // 2. Settings or coming-soon
    if (clean === "/settings" || clean === "/coming-soon") {
        return { href: dashboardHref, label: dashboardLabel };
    }

    // 3. Admin routes
    if (first === "admin") {
        const sub = segments[1];
        if (sub === "users") {
            // Sub-pages like /admin/users/new, /deleted, /enroll, /reassign
            if (segments.length > 2) {
                return { href: "/admin/users", label: "Users" };
            }
            return null;
        }
        if (sub === "bulk-import") {
            return { href: "/admin/users", label: "Users" };
        }
        if (sub === "courses") {
            if (segments.length > 2) {
                return { href: "/admin/courses", label: "Courses" };
            }
            return null;
        }
        if (sub === "course-activity") {
            return { href: "/admin/courses", label: "Courses" };
        }
        if (sub === "grades") {
            return { href: "/admin/dashboard", label: "Dashboard" };
        }
        return { href: "/admin/dashboard", label: "Dashboard" };
    }

    // 4. Course routes: /(student|teacher)/courses/...
    if ((first === "student" || first === "teacher") && segments[1] === "courses") {
        // e.g. /teacher/courses -> go to dashboard
        if (segments.length === 2) {
            return { href: dashboardHref, label: dashboardLabel };
        }

        // e.g. /teacher/courses/new -> go to /teacher/courses (Classes)
        if (segments[2] === "new") {
            return { href: `/${first}/courses`, label: "Classes" };
        }

        const courseId = segments[2];
        const courseHref = `/${first}/courses/${courseId}`;
        const courseLabel = "Course";

        // e.g. /(student|teacher)/courses/[courseId] -> go to dashboard
        if (segments.length === 3) {
            return { href: dashboardHref, label: dashboardLabel };
        }

        const section = segments[3]; // 'lessons' | 'assignments' | 'quizzes' | 'grades' | 'people' | 'edit'

        // Direct course sub-tabs/actions that have no intermediate listing page
        // e.g. /edit, /grades, /people
        if (section === "edit" || section === "grades" || section === "people") {
            return { href: courseHref, label: courseLabel };
        }

        // Lessons:
        if (section === "lessons") {
            // /lessons/new -> course
            if (segments[4] === "new" || segments.length === 4) {
                return { href: courseHref, label: courseLabel };
            }

            const lessonId = segments[4];
            const lessonHref = `${courseHref}/lessons/${lessonId}`;
            const lessonLabel = "Lesson";

            // /courses/[courseId]/lessons/[lessonId] -> course
            if (segments.length === 5) {
                return { href: courseHref, label: courseLabel };
            }

            // /courses/[courseId]/lessons/[lessonId]/edit -> lesson
            if (segments[5] === "edit") {
                return { href: lessonHref, label: lessonLabel };
            }

            // Missions under lesson:
            // /courses/[courseId]/lessons/[lessonId]/missions/...
            if (segments[5] === "missions") {
                return { href: lessonHref, label: lessonLabel };
            }

            return { href: lessonHref, label: lessonLabel };
        }

        // Assignments:
        if (section === "assignments") {
            // /assignments/new -> course
            if (segments[4] === "new" || segments.length === 4) {
                return { href: courseHref, label: courseLabel };
            }

            const assignmentId = segments[4];
            const assignmentHref = `${courseHref}/assignments/${assignmentId}`;

            // /courses/[courseId]/assignments/[assignmentId] -> course
            if (segments.length === 5) {
                return { href: courseHref, label: courseLabel };
            }

            // /courses/[courseId]/assignments/[assignmentId]/edit -> assignment
            if (segments[5] === "edit") {
                return { href: assignmentHref, label: "Assignment" };
            }

            return { href: courseHref, label: courseLabel };
        }

        // Quizzes:
        if (section === "quizzes") {
            // /quizzes/new -> course
            if (segments[4] === "new" || segments.length === 4) {
                return { href: courseHref, label: courseLabel };
            }

            const quizId = segments[4];
            const quizAttemptsHref = `${courseHref}/quizzes/${quizId}/attempts`;

            // /courses/[courseId]/quizzes/[quizId] -> course
            if (segments.length === 5) {
                return { href: courseHref, label: courseLabel };
            }

            // /courses/[courseId]/quizzes/[quizId]/edit -> course
            if (segments[5] === "edit") {
                return { href: courseHref, label: courseLabel };
            }

            // /courses/[courseId]/quizzes/[quizId]/results -> course
            if (segments[5] === "results") {
                return { href: courseHref, label: courseLabel };
            }

            // /courses/[courseId]/quizzes/[quizId]/attempts
            if (segments[5] === "attempts") {
                // /courses/[courseId]/quizzes/[quizId]/attempts/[attemptId] -> attempts list
                if (segments.length >= 7) {
                    return { href: quizAttemptsHref, label: "Attempts" };
                }
                return { href: courseHref, label: courseLabel };
            }

            return { href: courseHref, label: courseLabel };
        }

        // Any other unrecognized subroute in a course -> course
        return { href: courseHref, label: courseLabel };
    }

    // 5. Archived routes
    if (segments[1] === "archived") {
        return { href: dashboardHref, label: dashboardLabel };
    }

    // 6. Todo route
    if (segments[1] === "todo") {
        return { href: dashboardHref, label: dashboardLabel };
    }

    // Fallback: strip the last segment if >= 2 segments, else dashboard
    if (segments.length > 2) {
        const parentSegments = segments.slice(0, -1);
        return {
            href: "/" + parentSegments.join("/"),
            label: "Back",
        };
    }

    return { href: dashboardHref, label: dashboardLabel };
}

interface BackButtonProps {
    role?: Role;
    parentRoute?: ParentRoute | null;
}

export function BackButton({ role, parentRoute }: BackButtonProps) {
    const pathname = usePathname();
    const parent = parentRoute !== undefined ? parentRoute : getParentPath(pathname, role);

    if (!parent) return null;

    return (
        <Link
            href={parent.href}
            aria-label={`Go back to ${parent.label}`}
            className="inline-flex min-h-touch items-center gap-2 rounded-md px-3.5 py-1.5 text-body-md font-semibold text-ink-soft hover:text-ink hover:bg-surface-sunken border border-hairline bg-surface shadow-card hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 transition-all"
        >
            <ArrowLeft size={16} className="text-brand shrink-0" aria-hidden="true" />
            <span>{parent.label}</span>
        </Link>
    );
}