'use client'
// Course-scoped tab row: Stream / Classwork / People / Grades.
// Matches real Google Classroom: plain text tabs, underline on the
// active one, no icons, no card/pill chrome. Sits directly under the
// course header on both student and teacher course shell pages.
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

    // Dedup Stream/Classwork since they share a segment/href right now —
    // only one of them should render as a real tab until Classwork gets
    // its own view.
    const tabs = [
        { label: 'Stream', href: base, isActive: pathname === base },
        { label: 'People', href: `${base}/people`, isActive: pathname.startsWith(`${base}/people`) },
        { label: 'Scores', href: `${base}/grades`, isActive: pathname.startsWith(`${base}/grades`) },
    ]

    return (
        // min-w-0 + overflow-x-auto: with only 3 tabs today this rarely
        // triggers, but if a fourth ever gets added back (Classwork as
        // its own view) this keeps the row from squeezing labels or
        // wrapping onto a second line on a narrow phone — it scrolls
        // instead. whitespace-nowrap on each tab so a long label like
        // "Classwork" never breaks mid-word while scrolling.
        <nav className="min-w-0 border-b border-hairline mb-6" aria-label="Course sections">
            <ul className="flex gap-6 overflow-x-auto sm:gap-8">
                {tabs.map((tab) => (
                    <li key={tab.label} className="shrink-0">
                        <Link
                            href={tab.href}
                            className={`inline-block whitespace-nowrap py-3 text-body-md font-semibold border-b-2 -mb-px transition-colors ${
                                tab.isActive
                                    ? 'border-brand text-brand'
                                    : 'border-transparent text-text-secondary hover:text-ink'
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
