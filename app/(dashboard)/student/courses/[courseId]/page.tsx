import { notFound } from 'next/navigation'
import { requireRole } from '@/lib/auth/get-current-user'
import { createClient } from '@/lib/supabase/server'
import { getCourseStream } from '@/features/courses/actions/get-course-stream'
import { CourseStream } from '@/features/courses/components/CourseStream'
import { CourseStreamHeader } from '@/components/layout/CourseStreamHeader'

export default async function StudentCourseDetailPage({
    params,
}: {
    params: Promise<{ courseId: string }>
}) {
    const { courseId } = await params
    const user = await requireRole(['student'])
    const supabase = await createClient()

    const { data: enrollment } = await supabase
        .from('enrollments')
        .select('id')
        .eq('course_id', courseId)
        .eq('student_id', user.id)
        .eq('status', 'active')
        .single()
    if (!enrollment) {
        notFound()
    }

    const { data: course } = await supabase
        .from('courses')
        .select('id, title, description, subject')
        .eq('id', courseId)
        .single()
    if (!course) {
        notFound()
    }

    const items = await getCourseStream(courseId)

    const lessonItems = items.filter((i) => i.kind === 'lesson')
    const completedCount = lessonItems.filter((i) => i.kind === 'lesson' && i.completed).length
    const totalLessons = lessonItems.length
    const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0

    return (
        <div>
            {/* Title + tabs now live in the sticky TopNav (UMCLSI > title)
                per design system v3 rule 3 — no standalone h1 on canvas. */}
            <CourseStreamHeader
                courseId={courseId}
                role="student"
                title={course.title}
                subtitle={course.subject || undefined}
            />

            {course.description && (
                <p className="text-body-md text-text-secondary mb-8">{course.description}</p>
            )}

            {totalLessons > 0 && (
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-caption text-text-secondary">
                            {completedCount} of {totalLessons} lessons completed
                        </span>
                        <span className="text-caption text-text-secondary">{progressPercent}%</span>
                    </div>
                    <div className="h-2 w-full rounded-pill bg-hairline overflow-hidden">
                        <div
                            className="h-full bg-info rounded-pill"
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                </div>
            )}

            <CourseStream courseId={courseId} items={items} />
        </div>
    )
}
