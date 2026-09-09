'use client'
// Course-scoped tab row: Stream / People / Scores.
// Matches real Google Classroom: plain text tabs, underline on the
// active one, no icons, no card/pill chrome. Colors are white-based
// (text-on-ink) since this renders inside TopNav's pink bar, not on a
// white surface.
//
// This renders INSIDE the sticky TopNav header (passed via
// usePageHeader({ tabs: <CourseTabs .../> })), not in the page body —
// that's why it no longer owns its own bottom border/margin; TopNav's
// header element supplies the enclosing border per design system v3
// rule 3 (Header-Integrated Page Titles).
//
// "Stream" and "Classwork" both point at the course root page — real
// Classroom has these as two separate views, but this app currently
// has one combined stream (CourseStream.tsx / TeacherCourseStream.tsx)
// with no classwork-only filter, so both tabs resolve to the same
// route for now. Flagged as a deliberate scope match to what actually
// exists, not a missing feature — revisit only if a real
// classwork-only view gets built later.

import Link from 'next/link'
import { usePathname } from 'next/navigation'

type Role = 'student' | 'teacher'

export function CourseTabs({ courseId, role }: { courseId: string; role: Role }) {
    const pathname = usePathname()
    const base = `/${role}/courses/${courseId}`

    const tabs = [
        { label: 'Stream', href: base, isActive: pathname === base },
        { label: 'People', href: `${base}/people`, isActive: pathname.startsWith(`${base}/people`) },
        { label: 'Scores', href: `${base}/grades`, isActive: pathname.startsWith(`${base}/grades`) },
    ]

    return (
        <nav className="min-w-0" aria-label="Course sections">
            <ul className="flex gap-6 overflow-x-auto sm:gap-8">
                {tabs.map((tab) => (
                    <li key={tab.label} className="shrink-0">
                        <Link
                            href={tab.href}
                            className={`inline-block whitespace-nowrap py-3 text-body-md font-semibold border-b-2 -mb-px transition-colors ${
                                tab.isActive
                                    ? 'border-on-ink text-on-ink'
                                    : 'border-transparent text-on-ink/60 hover:text-on-ink/90'
                            }`}
                            aria-current={tab.isActive ? 'page' : undefined}
                        >
                            {tab.label}
                        </Link>
                    </li>
                ))}
            </ul>
        </nav>
    )
}
