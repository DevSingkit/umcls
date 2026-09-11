// features/dashboard/components/CoursesPreview.tsx
// A short preview grid (not the full list), used on both teacher and
// student dashboards. No longer shows a "View all" link — the full
// course list is already reachable from the sidebar/nav, so a second
// link to the same destination was redundant. The top-right slot is
// now used for a "+ Create course" action on the teacher dashboard
// instead (see createCourseHref), and stays empty on the student
// dashboard.
//
// Low-count handling per DESIGN-LMS.md §8.6 (v1.1 correction): a single
// course stays left-aligned, same as any other count — verified against
// real Google Classroom behavior, which never centers a sparse grid.
//
// "Create class" buttons sized to DESIGN-LMS 2.1 §1.4's touch-target
// floor (56px primary / 48px secondary), confirmed 2026-08-31 —
// previously 44px/36px, both under the floor.
import Link from 'next/link'
import { CourseCard } from '@/features/courses/components/CourseCard'

type CourseItem = {
    id: string
    title: string
    subject: string | null
    description: string | null
    isPublished?: boolean
    teacherName?: string | null
    teacherAvatarUrl?: string | null
}

type CoursesPreviewProps = {
    courses: CourseItem[]
    courseHrefBase: string
    emptyMessage: string
    /** Teacher dashboard only: shows a "+ Create course" button top-right. Omit on student dashboard. */
    createCourseHref?: string
}

export function CoursesPreview({
    courses,
    courseHrefBase,
    emptyMessage,
    createCourseHref,
}: CoursesPreviewProps) {
    if (courses.length === 0) {
        return (
            <div className="bg-surface rounded-md shadow-card p-8 text-center">
                <p className="text-body-md text-text-secondary mb-4">{emptyMessage}</p>
                {createCourseHref && (
                    <Link
                        href={createCourseHref}
                        className="inline-flex items-center justify-center h-14 px-6 rounded-md bg-brand text-on-ink text-body-md font-semibold hover:bg-brand-hover"
                    >
                        Create class
                    </Link>
                )}
            </div>
        )
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-h2 text-ink">Your classes</h2>
                {createCourseHref && (
                    <Link
                        href={createCourseHref}
                        className="inline-flex items-center justify-center h-12 px-4 rounded-md bg-brand text-on-ink text-caption font-semibold hover:bg-brand-hover"
                    >
                        Create class
                    </Link>
                )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {courses.map((course) => (
                    <CourseCard
                        key={course.id}
                        id={course.id}
                        title={course.title}
                        subject={course.subject}
                        description={course.description}
                        isPublished={course.isPublished}
                        teacherName={course.teacherName}
                        teacherAvatarUrl={course.teacherAvatarUrl}
                        href={`${courseHrefBase}/${course.id}`}
                    />
                ))}
            </div>
        </div>
    )
}
