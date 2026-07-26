// features/dashboard/components/CoursesPreview.tsx
// A short preview grid (not the full list) with a "View all" link, used
// on both teacher and student dashboards. Centers a sparse grid instead
// of left-aligning into empty space (§8.6 low-count rule), so 1-2
// courses never look like a page that loaded wrong.
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

    const soloCourse = courses.length === 1 ? courses[0] : null

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <h2 className="font-heading text-h2 text-ink">Your courses</h2>
                <Link href={viewAllHref} className="text-caption text-brand hover:underline">
                    View all
                </Link>
            </div>
            {soloCourse ? (
                // A single card in a grid still sits left-aligned inside its
                // own cell — centering the grid container isn't the same as
                // centering the card. Flex + a fixed width actually centers
                // the card itself.
                <div className="flex justify-center">
                    <div className="w-full max-w-xs">
                        <CourseCard
                            id={soloCourse.id}
                            title={soloCourse.title}
                            subject={soloCourse.subject}
                            href={`${courseHrefBase}/${soloCourse.id}`}
                        />
                    </div>
                </div>
            ) : (
                <div
                    className={
                        courses.length === 2
                            ? 'grid gap-4 grid-cols-2 max-w-xl mx-auto'
                            : 'grid gap-4 sm:grid-cols-2 xl:grid-cols-4'
                    }
                >
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
            )}
        </div>
    )
}