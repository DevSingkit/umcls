// features/dashboard/components/CoursesPreview.tsx
// A short preview grid (not the full list) with a "View all" link, used
// on both teacher and student dashboards.
//
// Low-count handling per DESIGN-LMS.md §8.6 (v1.1 correction): a single
// course stays left-aligned, same as any other count — verified against
// real Google Classroom behavior, which never centers a sparse grid.
import Link from 'next/link'
import { CourseCard } from '@/features/courses/components/CourseCard'

type CourseItem = {
    id: string
    title: string
    subject: string | null
}

type CoursesPreviewProps = {
    courses: CourseItem[]
    viewAllHref: string
    courseHrefBase: string
    emptyMessage: string
}

export function CoursesPreview({
    courses,
    viewAllHref,
    courseHrefBase,
    emptyMessage,
}: CoursesPreviewProps) {
    if (courses.length === 0) {
        return (
            <div className="bg-surface rounded-md shadow-card p-8 text-center">
                <p className="text-body-md text-text-secondary">{emptyMessage}</p>
            </div>
        )
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <h2 className="font-heading text-h2 text-ink">Your classes</h2>
                <Link href={viewAllHref} className="text-caption text-brand hover:underline">
                    View all
                </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {courses.map((course) => (
                    <CourseCard
                        key={course.id}
                        id={course.id}
                        title={course.title}
                        subject={course.subject}
                        href={`${courseHrefBase}/${course.id}`}
                    />
                ))}
            </div>
        </div>
    )
}
