import { notFound } from 'next/navigation'
import { requireRole } from '@/lib/auth/get-current-user'
import { createClient } from '@/lib/supabase/server'
import { getCourseStream } from '@/features/courses/actions/get-course-stream'
import { CourseStream } from '@/features/courses/components/CourseStream'

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

    return (
        <div>
            <CourseStream courseId={courseId} items={items} />
        </div>
    )
}
