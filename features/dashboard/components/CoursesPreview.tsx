// features/dashboard/components/CoursesPreview.tsx
//
// Encapsulated Card Architecture: Wraps class tiles in SectionCard,
// eliminating the floating <h2> on the outer page canvas.
//
// Responsive grid matches Google Classroom (1 to 3 columns depending on breakpoint).
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { CourseCard } from '@/features/courses/components/CourseCard'
import { SectionCard } from '@/components/ui/SectionCard'

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
            <SectionCard
                title="Your classes"
                badge={0}
                action={
                    createCourseHref ? (
                        <Link
                            href={createCourseHref}
                            className="inline-flex items-center gap-1.5 justify-center min-h-touch-secondary px-4 rounded-md bg-brand text-on-ink text-caption font-semibold hover:bg-brand-hover transition-colors"
                        >
                            <Plus size={16} aria-hidden="true" />
                            Create class
                        </Link>
                    ) : undefined
                }
            >
                <div className="border border-dashed border-hairline-strong rounded-md p-8 text-center bg-surface-sunken/20">
                    <p className="text-body-md text-text-secondary mb-4">{emptyMessage}</p>
                    {createCourseHref && (
                        <Link
                            href={createCourseHref}
                            className="inline-flex items-center gap-1.5 justify-center min-h-touch px-6 rounded-md bg-brand text-on-ink text-body-md font-semibold hover:bg-brand-hover transition-colors"
                        >
                            <Plus size={18} aria-hidden="true" />
                            Create class
                        </Link>
                    )}
                </div>
            </SectionCard>
        )
    }

    return (
        <SectionCard
            title="Your classes"
            badge={courses.length}
            action={
                createCourseHref ? (
                    <Link
                        href={createCourseHref}
                        className="inline-flex items-center gap-1.5 justify-center min-h-touch-secondary px-4 rounded-md bg-brand text-on-ink text-caption font-semibold hover:bg-brand-hover transition-colors"
                    >
                        <Plus size={16} aria-hidden="true" />
                        Create class
                    </Link>
                ) : undefined
            }
        >
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
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
        </SectionCard>
    )
}
